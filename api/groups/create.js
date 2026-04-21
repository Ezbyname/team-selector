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
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        location: location?.trim() || null,
        sport,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create group:', error);
      return res.status(500).json({ error: 'Failed to create group' });
    }

    return res.status(201).json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        location: group.location,
        sport: group.sport,
        createdAt: group.created_at
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
