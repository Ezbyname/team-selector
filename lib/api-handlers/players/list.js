/**
 * GET /api/players/list
 * List all players in a group
 * Requires: Authenticated user
 * Query: ?groupId=uuid
 */

import { supabase } from '../../supabase.js';
import { requireAuth, canViewSensitiveData } from '../../permissions.js';

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

    // Get connections for all players in group
    const { data: connections } = await supabase
      .from('player_connections')
      .select('player_id, connected_to_id')
      .eq('group_id', groupId);

    // Get connection info for all players
    const playersWithConnections = await Promise.all(
      players.map(async (player) => {
        // Get connection group info
        const { data: connectionInfo } = await supabase
          .rpc('get_player_connection_info', {
            p_player_id: player.id,
            p_group_id: groupId
          });

        const baseData = {
          id: player.id,
          name: player.name,
          position: player.position || 'No Position',
          connectionGroupId: connectionInfo?.[0]?.connection_group_id || null,
          connectionCount: connectionInfo?.[0]?.connection_count || 0,
          connectedPlayerIds: connectionInfo?.[0]?.connected_player_ids || []
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
            grades: ratings?.map(r => r.grade) || []
          };
        }

        // Regular users see basic info + connections
        return baseData;
      })
    );

    return res.status(200).json({
      success: true,
      players: playersWithConnections
    });
  } catch (error) {
    console.error('List players error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
