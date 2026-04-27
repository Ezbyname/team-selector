/**
 * POST /api/sessions/create
 * Create a new game session for a group
 * Requires: Authenticated user
 * Body: { groupId, sessionDate? }
 */

import { supabase } from '../../supabase.js';
import { requireAuth } from '../../permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { groupId, sessionDate } = req.body;

  // Validation
  if (!groupId) {
    return res.status(400).json({ error: 'groupId is required' });
  }

  try {
    // Get group to retrieve sport_type
    const { data: group, error: groupError } = await supabase
      .from('permanent_groups')
      .select('sport_type') // Actual column name
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const { data: session, error} = await supabase
      .from('game_sessions')
      .insert({
        permanent_group_id: groupId, // Actual column name from 001 migration
        session_type: 'permanent_group', // Required by actual DB schema
        sport_type: group.sport_type, // Required by actual DB schema
        target_team_size: 5, // Default value (required, 2-11)
        status: 'pending', // Valid enum value from actual DB schema
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create session:', error);
      return res.status(500).json({
        error: 'Failed to create session',
        details: error.message,
        code: error.code
      });
    }

    return res.status(201).json({
      success: true,
      session: {
        id: session.id,
        groupId: session.group_id,
        sessionDate: session.session_date,
        status: session.status,
        createdAt: session.created_at
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
