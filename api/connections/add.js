/**
 * POST /api/connections/add
 * Add connection between two players (operator-defined)
 * Requires: Authenticated user
 * Body: { groupId, playerId, connectedToId, connectionType? }
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';
import { validateConnectionGroupSize } from '../../lib/connectionValidator.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { groupId, playerId, connectedToId, connectionType = 'prefer_together' } = req.body;

  // Validation
  if (!groupId || !playerId || !connectedToId) {
    return res.status(400).json({ error: 'groupId, playerId, and connectedToId are required' });
  }

  if (playerId === connectedToId) {
    return res.status(400).json({ error: 'Cannot connect player to themselves' });
  }

  if (!['prefer_together', 'prefer_separate'].includes(connectionType)) {
    return res.status(400).json({ error: 'connectionType must be prefer_together or prefer_separate' });
  }

  try {
    // Verify both players exist and belong to the group
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, group_id')
      .in('id', [playerId, connectedToId]);

    if (playersError) {
      console.error('Failed to verify players:', playersError);
      return res.status(500).json({ error: 'Failed to verify players' });
    }

    if (!players || players.length !== 2) {
      return res.status(404).json({ error: 'One or both players not found' });
    }

    if (players.some(p => p.group_id !== groupId)) {
      return res.status(400).json({ error: 'Both players must belong to the specified group' });
    }

    // Get group sport
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('sport')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      console.error('Failed to fetch group:', groupError);
      return res.status(500).json({ error: 'Failed to fetch group' });
    }

    // Get existing connections for validation
    const { data: existingConnections, error: connectionsError } = await supabase
      .from('player_connections')
      .select('player_id, connected_to_id')
      .eq('group_id', groupId);

    if (connectionsError) {
      console.error('Failed to fetch connections:', connectionsError);
      return res.status(500).json({ error: 'Failed to fetch connections' });
    }

    // Validate group size limit
    const validation = validateConnectionGroupSize(
      playerId,
      connectedToId,
      existingConnections || [],
      group.sport
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        groupSize: validation.groupSize,
        limit: validation.limit
      });
    }

    // Create connection
    const { data: connection, error: connectionError } = await supabase
      .from('player_connections')
      .insert({
        group_id: groupId,
        player_id: playerId,
        connected_to_id: connectedToId,
        connection_type: connectionType,
        created_by: req.user.id
      })
      .select()
      .single();

    if (connectionError) {
      if (connectionError.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Connection already exists' });
      }
      console.error('Failed to create connection:', connectionError);
      return res.status(500).json({ error: 'Failed to create connection' });
    }

    return res.status(201).json({
      success: true,
      connection: {
        id: connection.id,
        playerId: connection.player_id,
        connectedToId: connection.connected_to_id,
        connectionType: connection.connection_type,
        createdAt: connection.created_at
      }
    });
  } catch (error) {
    console.error('Add connection error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
