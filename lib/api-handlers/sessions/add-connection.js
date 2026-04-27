/**
 * POST /api/sessions/add-connection
 * Add session-specific connection override
 * Requires: Authenticated user
 * Body: { sessionId, playerId, connectedToId, connectionType? }
 */

import { supabase } from '../supabase.js';
import { requireAuth } from '../permissions.js';
import { validateConnectionGroupSize } from '../connectionValidator.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, playerId, connectedToId, connectionType = 'prefer_together' } = req.body;

  // Validation
  if (!sessionId || !playerId || !connectedToId) {
    return res.status(400).json({ error: 'sessionId, playerId, and connectedToId are required' });
  }

  if (playerId === connectedToId) {
    return res.status(400).json({ error: 'Cannot connect player to themselves' });
  }

  if (!['prefer_together', 'prefer_separate'].includes(connectionType)) {
    return res.status(400).json({ error: 'connectionType must be prefer_together or prefer_separate' });
  }

  try {
    // Verify session exists and get sport
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, group_id, groups(sport)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sport = session.groups?.sport;
    if (!sport) {
      return res.status(500).json({ error: 'Failed to determine sport type' });
    }

    // Verify both players are in the session
    const { data: sessionPlayers, error: playersError } = await supabase
      .from('session_players')
      .select('player_id')
      .eq('session_id', sessionId)
      .in('player_id', [playerId, connectedToId]);

    if (playersError || !sessionPlayers || sessionPlayers.length !== 2) {
      return res.status(400).json({ error: 'Both players must be selected for this session' });
    }

    // Get existing connections (both group and session level)
    const { data: existingConnections } = await supabase
      .rpc('get_session_connections', { p_session_id: sessionId });

    // Format for validator
    const formattedConnections = (existingConnections || []).map(c => ({
      playerId: c.player_a_id,
      connectedToId: c.player_b_id
    }));

    // Validate group size limit
    const validation = validateConnectionGroupSize(
      playerId,
      connectedToId,
      formattedConnections,
      sport
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        groupSize: validation.groupSize,
        limit: validation.limit
      });
    }

    // Create session connection
    const { data: connection, error: connectionError } = await supabase
      .from('session_connections')
      .insert({
        session_id: sessionId,
        player_id: playerId,
        connected_to_id: connectedToId,
        connection_type: connectionType,
        created_by: req.user.id
      })
      .select()
      .single();

    if (connectionError) {
      if (connectionError.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Connection already exists for this session' });
      }
      console.error('Failed to create session connection:', connectionError);
      return res.status(500).json({ error: 'Failed to create connection' });
    }

    return res.status(201).json({
      success: true,
      connection: {
        id: connection.id,
        sessionId: connection.session_id,
        playerId: connection.player_id,
        connectedToId: connection.connected_to_id,
        connectionType: connection.connection_type,
        createdAt: connection.created_at
      }
    });
  } catch (error) {
    console.error('Add session connection error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
