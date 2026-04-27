/**
 * POST /api/players/update
 * Update player details
 * Requires: Authenticated user
 */

import { supabase } from '../supabase.js';
import { requireAuth } from '../permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId, name, position } = req.body;

  // Validation
  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }

  if (!name || !name.trim() || name.trim().length < 2) {
    return res.status(400).json({ error: 'Player name must be at least 2 characters' });
  }

  try {
    // Check if player exists
    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('id, group_id')
      .eq('id', playerId)
      .single();

    if (fetchError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update player
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({
        name: name.trim(),
        position: position && position.trim() ? position.trim() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update player:', updateError);
      return res.status(500).json({ error: 'Failed to update player' });
    }

    return res.status(200).json({
      success: true,
      player: {
        id: updatedPlayer.id,
        name: updatedPlayer.name,
        position: updatedPlayer.position
      }
    });
  } catch (error) {
    console.error('Update player error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
