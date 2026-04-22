/**
 * POST /api/players/add
 * Add player to a group
 * Requires: Authenticated user
 * Body: { groupId, name, position?, defaultRating? }
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { groupId, name, position, defaultRating } = req.body;

  // Validation
  if (!groupId) {
    return res.status(400).json({ error: 'groupId is required' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  // Validate rating if provided
  let rating = defaultRating || 5;
  if (defaultRating !== undefined && defaultRating !== null) {
    if (!Number.isInteger(defaultRating) || defaultRating < 1 || defaultRating > 10) {
      return res.status(400).json({ error: 'defaultRating must be integer 1-10' });
    }
    rating = defaultRating;
  }

  try {
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        group_id: groupId,
        name: name.trim(),
        player_position: position?.trim() || null,
        default_rating: rating
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Player already exists in this group' });
      }
      console.error('Failed to add player:', error);
      return res.status(500).json({ error: 'Failed to add player' });
    }

    return res.status(201).json({
      success: true,
      player: {
        id: player.id,
        groupId: player.group_id,
        name: player.name,
        position: player.player_position,
        defaultRating: player.default_rating,
        createdAt: player.created_at
      }
    });
  } catch (error) {
    console.error('Add player error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
