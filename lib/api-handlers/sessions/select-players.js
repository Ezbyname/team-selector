/**
 * POST /api/sessions/select-players
 * Select players for a game session
 * Requires: Authenticated user
 * Body: { sessionId, playerIds: [uuid, uuid, ...] }
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, playerIds } = req.body;

  // Validation
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return res.status(400).json({ error: 'playerIds must be a non-empty array' });
  }

  try {
    // Clear existing selections
    await supabase
      .from('session_players')
      .delete()
      .eq('session_id', sessionId);

    // Insert new selections
    const sessionPlayers = playerIds.map(playerId => ({
      session_id: sessionId,
      player_id: playerId
    }));

    const { data, error } = await supabase
      .from('session_players')
      .insert(sessionPlayers)
      .select();

    if (error) {
      console.error('Failed to select players:', error);
      return res.status(500).json({ error: 'Failed to select players' });
    }

    return res.status(200).json({
      success: true,
      selectedCount: data.length
    });
  } catch (error) {
    console.error('Select players error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
