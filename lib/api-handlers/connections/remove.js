/**
 * DELETE /api/connections/remove
 * Remove connection between two players
 * Requires: Authenticated user
 * Body: { connectionId } OR { playerId, connectedToId }
 */

import { supabase } from '../supabase.js';
import { requireAuth } from '../permissions.js';

async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { connectionId, playerId, connectedToId } = req.body;

  if (!connectionId && (!playerId || !connectedToId)) {
    return res.status(400).json({
      error: 'Either connectionId or both playerId and connectedToId are required'
    });
  }

  try {
    let query = supabase.from('player_connections').delete();

    if (connectionId) {
      query = query.eq('id', connectionId);
    } else {
      query = query
        .eq('player_id', playerId)
        .eq('connected_to_id', connectedToId);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to remove connection:', error);
      return res.status(500).json({ error: 'Failed to remove connection' });
    }

    return res.status(200).json({
      success: true,
      message: 'Connection removed'
    });
  } catch (error) {
    console.error('Remove connection error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
