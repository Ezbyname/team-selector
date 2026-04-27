/**
 * GET /api/groups/list
 * List all groups with stats
 * Requires: Authenticated user
 */

import { supabase } from '../../supabase.js';
import { requireAuth } from '../../permissions.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sport } = req.query;

  try {
    // Query permanent_groups table
    let query = supabase
      .from('permanent_groups')
      .select('id, name, sport_type, created_by, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (sport && ['basketball', 'soccer'].includes(sport)) {
      query = query.eq('sport_type', sport);
    }

    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      console.error('Failed to list groups:', groupsError);
      return res.status(500).json({ error: 'Failed to list groups', details: groupsError.message });
    }

    // Enrich with player/session counts
    const groupsWithStats = await Promise.all(
      (groups || []).map(async (group) => {
        // Count players
        const { count: playerCount } = await supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', group.id);

        // Count sessions
        const { count: sessionCount } = await supabase
          .from('game_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('permanent_group_id', group.id); // Actual column name

        return {
          id: group.id,
          name: group.name,
          location: null, // permanent_groups doesn't have location
          sport: group.sport_type, // Map sport_type to sport for API response
          createdBy: group.created_by,
          playerCount: playerCount || 0,
          sessionCount: sessionCount || 0,
          createdAt: group.created_at,
          updatedAt: group.updated_at
        };
      })
    );

    return res.status(200).json({
      success: true,
      groups: groupsWithStats
    });
  } catch (error) {
    console.error('List groups error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export default requireAuth(handler);
