/**
 * GET /api/connections/list
 * List all connections for a group
 * Requires: Authenticated user
 * Query: ?groupId=uuid
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { groupId } = req.query;

  if (!groupId) {
    return res.status(400).json({ error: 'groupId query parameter is required' });
  }

  try {
    const { data: connections, error } = await supabase
      .rpc('get_group_connections', { p_group_id: groupId });

    if (error) {
      console.error('Failed to list connections:', error);
      return res.status(500).json({ error: 'Failed to list connections' });
    }

    return res.status(200).json({
      success: true,
      connections: connections || []
    });
  } catch (error) {
    console.error('List connections error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
