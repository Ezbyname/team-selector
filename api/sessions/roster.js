/**
 * GET /api/sessions/roster
 * Get session roster with final ratings
 * Requires: Authenticated user
 * Query: ?sessionId=uuid
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId query parameter is required' });
  }

  try {
    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*, groups(name, sport)')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Failed to get session:', sessionError);
      return res.status(500).json({ error: 'Failed to get session' });
    }

    // Get roster with ratings using DB function
    const { data: roster, error: rosterError } = await supabase
      .rpc('get_session_roster', { p_session_id: sessionId });

    if (rosterError) {
      console.error('Failed to get roster:', rosterError);
      return res.status(500).json({ error: 'Failed to get roster' });
    }

    return res.status(200).json({
      success: true,
      session: {
        id: session.id,
        groupName: session.groups.name,
        sport: session.groups.sport,
        sessionDate: session.session_date,
        status: session.status
      },
      roster: roster.map(r => ({
        playerId: r.player_id,
        name: r.player_name,
        position: r.player_position,
        defaultRating: r.default_rating,
        finalRating: r.final_rating,
        graderCount: parseInt(r.grader_count)
      }))
    });
  } catch (error) {
    console.error('Get roster error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
