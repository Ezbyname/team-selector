/**
 * GET /api/players/list
 * List all players in a group
 * Requires: Authenticated user
 * Query: ?groupId=uuid
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth, canViewSensitiveData } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { groupId } = req.query;

  if (!groupId) {
    return res.status(400).json({ error: 'groupId query parameter is required' });
  }

  const canSeeSensitiveData = canViewSensitiveData(req.user);

  try {
    // Get all players in group
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('group_id', groupId)
      .order('name');

    if (playersError) {
      console.error('Failed to list players:', playersError);
      return res.status(500).json({ error: 'Failed to list players' });
    }

    // Get final ratings for all players
    const playersWithRatings = await Promise.all(
      players.map(async (player) => {
        const baseData = {
          id: player.id,
          name: player.name,
          position: player.position || 'No Position'
        };

        // Only include sensitive data for admin/sub-admin
        if (canSeeSensitiveData) {
          const { data: finalRating } = await supabase
            .rpc('get_player_final_rating', { p_player_id: player.id });

          const { data: ratings } = await supabase
            .from('player_ratings')
            .select('grade, graded_by, auth_users(phone)')
            .eq('player_id', player.id);

          return {
            ...baseData,
            defaultRating: player.default_rating,
            finalRating: finalRating || player.default_rating,
            graderCount: ratings?.length || 0,
            grades: ratings?.map(r => r.grade) || [],
            isStar: player.is_star || false
          };
        }

        // Regular users see only basic info
        return baseData;
      })
    );

    return res.status(200).json({
      success: true,
      players: playersWithRatings
    });
  } catch (error) {
    console.error('List players error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
