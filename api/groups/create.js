/**
 * POST /api/groups/create
 * Create a new permanent group
 * Requires: Authenticated user
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, location, sport } = req.body;

  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  if (!sport || !['basketball', 'soccer'].includes(sport)) {
    return res.status(400).json({ error: 'Sport must be basketball or soccer' });
  }

  try {
    // Create in permanent_groups (for game_sessions FK)
    const { data: permGroup, error: permError } = await supabase
      .from('permanent_groups')
      .insert({
        name: name.trim(),
        sport_type: sport, // Column name in permanent_groups is sport_type
        created_by: req.user.id
      })
      .select()
      .single();

    if (permError) {
      console.error('Failed to create permanent group:', permError);
      return res.status(500).json({ error: 'Failed to create group' });
    }

    // Also create in groups table with same ID (for players FK)
    const { error: groupError } = await supabase
      .from('groups')
      .insert({
        id: permGroup.id, // Use same ID
        name: name.trim(),
        location: location?.trim() || null,
        sport: sport,
        created_by: req.user.id
      });

    if (groupError) {
      // Rollback permanent_groups insert
      await supabase.from('permanent_groups').delete().eq('id', permGroup.id);
      console.error('Failed to create group:', groupError);
      return res.status(500).json({ error: 'Failed to create group' });
    }

    const group = permGroup;

    return res.status(201).json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        location: location?.trim() || null, // Return location from request since DB doesn't store it
        sport: group.sport_type,
        createdAt: group.created_at
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
