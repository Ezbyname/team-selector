/**
 * POST /api/sessions/generate-teams
 * Generate balanced teams for a session
 * Requires: Authenticated user
 * Body: { sessionId, teamSize, teamCount? }
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';
import { generateBalancedTeams } from '../../lib/teamBalancer.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, teamSize, teamCount = 2 } = req.body;

  // Validation
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  if (!teamSize || teamSize < 1) {
    return res.status(400).json({ error: 'teamSize must be at least 1' });
  }

  try {
    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, permanent_group_id, status, sport_type, permanent_groups(name)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get session roster with ratings
    const { data: roster, error: rosterError } = await supabase
      .rpc('get_session_roster', { p_session_id: sessionId });

    if (rosterError) {
      console.error('Failed to get roster:', rosterError);
      return res.status(500).json({ error: 'Failed to get roster' });
    }

    if (!roster || roster.length === 0) {
      return res.status(400).json({ error: 'No players selected for this session' });
    }

    if (roster.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to generate teams' });
    }

    // Format players for balancing algorithm
    // If player has been graded (grader_count > 0), use final_rating (avg + ceiling)
    // Otherwise, use their individual default_rating
    const players = roster.map(p => ({
      id: p.player_id,
      name: p.player_name,
      position: p.player_position || 'No Position',
      defaultRating: p.default_rating || 5,
      finalRating: (p.grader_count > 0) ? p.final_rating : p.default_rating,
      isStar: p.is_star || false
    }));

    // Generate balanced teams
    const result = generateBalancedTeams(players, teamSize, teamCount);

    // Format response
    return res.status(200).json({
      success: true,
      session: {
        id: session.id,
        groupId: session.permanent_group_id,
        groupName: session.permanent_groups?.name || 'Unknown Group',
        sport: session.sport_type
      },
      teams: result.teams.map(team => ({
        teamNumber: team.teamNumber,
        players: team.players.map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          defaultRating: p.defaultRating,
          finalRating: p.finalRating,
          isStar: p.isStar
        })),
        totalRating: team.totalRating,
        starCount: team.starCount,
        positionBreakdown: team.positionBreakdown
      })),
      bench: result.bench.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        finalRating: p.finalRating
      })),
      balance: {
        ratingDifference: result.balance.ratingDifference,
        starDifference: result.balance.starDifference,
        positionImbalancePenalty: result.balance.positionImbalancePenalty,
        teamSizeDifference: result.balance.teamSizeDifference,
        totalScore: result.balance.totalScore,
        isBalanced: result.balance.isBalanced
      }
    });
  } catch (error) {
    console.error('Generate teams error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

export default requireAuth(handler);
