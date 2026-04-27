/**
 * POST /api/sessions/generate-teams
 * Generate balanced teams for a session
 * Requires: Authenticated user
 * Body: { sessionId, teamSize, teamCount? }
 */

import { supabase } from '../../supabase.js';
import { requireAuth, canViewSensitiveData } from '../../permissions.js';
import { generateBalancedTeams } from '../../teamBalancer.js';

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

    // Get player connections for this session
    const { data: connections, error: connectionsError } = await supabase
      .rpc('get_session_connections', { p_session_id: sessionId });

    if (connectionsError) {
      console.error('Failed to get connections:', connectionsError);
      // Continue without connections rather than failing
    }

    // Format players for balancing algorithm
    // If player has been graded (grader_count > 0), use final_rating (avg + ceiling)
    // Otherwise, use their individual default_rating
    const players = roster.map(p => ({
      id: p.player_id,
      name: p.player_name,
      position: p.player_position || 'No Position',
      defaultRating: p.default_rating || 5,
      finalRating: (p.grader_count > 0) ? p.final_rating : p.default_rating
    }));

    // Format connections for balancing algorithm
    const formattedConnections = (connections || []).map(c => ({
      playerAId: c.player_a_id,
      playerBId: c.player_b_id,
      connectionType: c.connection_type
    }));

    // Generate balanced teams with connection constraints
    const result = generateBalancedTeams(players, teamSize, teamCount, 100, formattedConnections);

    const canSeeSensitiveData = canViewSensitiveData(req.user);

    // Format response based on user role
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
        players: team.players.map(p => {
          const baseData = {
            id: p.id,
            name: p.name,
            position: p.position
          };

          // Only include sensitive data for admin/sub-admin
          if (canSeeSensitiveData) {
            return {
              ...baseData,
              defaultRating: p.defaultRating,
              finalRating: p.finalRating
            };
          }

          return baseData;
        }),
        // Only include team stats for admin/sub-admin
        ...(canSeeSensitiveData && {
          totalRating: team.totalRating
        }),
        positionBreakdown: team.positionBreakdown
      })),
      bench: result.bench.map(p => {
        const baseData = {
          id: p.id,
          name: p.name,
          position: p.position
        };

        if (canSeeSensitiveData) {
          return {
            ...baseData,
            finalRating: p.finalRating
          };
        }

        return baseData;
      }),
      // Only include balance details for admin/sub-admin
      ...(canSeeSensitiveData && {
        balance: {
          ratingDifference: result.balance.ratingDifference,
          positionImbalancePenalty: result.balance.positionImbalancePenalty,
          teamSizeDifference: result.balance.teamSizeDifference,
          totalScore: result.balance.totalScore,
          isBalanced: result.balance.isBalanced
        }
      })
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
