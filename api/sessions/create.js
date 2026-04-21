/**
 * POST /api/sessions/create
 * Create a new game session for a group
 * Requires: Authenticated user
 * Body: { groupId, sessionDate? }
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';

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
    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({
        group_id: groupId,
        session_date: sessionDate || new Date().toISOString().split('T')[0],
        status: 'planning',
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create session:', error);
      return res.status(500).json({ error: 'Failed to create session' });
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
