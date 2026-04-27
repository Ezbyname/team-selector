/**
 * DELETE /api/players/delete
 * Delete a player from a group
 * Requires: Authenticated user
 */

import { supabase } from '../supabase.js';
import { requireAuth } from '../permissions.js';

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId } = req.body;

  // Validation
  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }

  try {
    // Check if player exists
    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('id, name, group_id')
      .eq('id', playerId)
      .single();

    if (fetchError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Delete player connections first (cascading)
    await supabase
      .from('player_connections')
      .delete()
      .or(`player_id.eq.${playerId},connected_to_id.eq.${playerId}`);

    // Delete player ratings
    await supabase
      .from('player_ratings')
      .delete()
      .eq('player_id', playerId);

    // Delete session_players entries
    await supabase
      .from('session_players')
      .delete()
      .eq('player_id', playerId);

    // Delete the player
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (deleteError) {
      console.error('Failed to delete player:', deleteError);
      return res.status(500).json({ error: 'Failed to delete player' });
    }

    return res.status(200).json({
      success: true,
      message: `Player ${player.name} deleted successfully`
    });
  } catch (error) {
    console.error('Delete player error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
