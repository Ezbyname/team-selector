/**
 * DELETE /api/sessions/remove-connection
 * Remove session-specific connection override
 * Requires: Authenticated user
 * Body: { connectionId } OR { sessionId, playerId, connectedToId }
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { connectionId, sessionId, playerId, connectedToId } = req.body;

  if (!connectionId && (!sessionId || !playerId || !connectedToId)) {
    return res.status(400).json({
      error: 'Either connectionId or all of sessionId, playerId, and connectedToId are required'
    });
  }

  try {
    let query = supabase.from('session_connections').delete();

    if (connectionId) {
      query = query.eq('id', connectionId);
    } else {
      query = query
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
        .eq('connected_to_id', connectedToId);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to remove session connection:', error);
      return res.status(500).json({ error: 'Failed to remove connection' });
    }

    return res.status(200).json({
      success: true,
      message: 'Session connection removed'
    });
  } catch (error) {
    console.error('Remove session connection error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
