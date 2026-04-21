/**
 * GET /api/groups/list
 * List all groups with stats
 * Requires: Authenticated user
 */

import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sport } = req.query;

  try {
    let query = supabase
      .from('group_stats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (sport && ['basketball', 'soccer'].includes(sport)) {
      query = query.eq('sport', sport);
    }

    const { data: groups, error } = await query;

    if (error) {
      console.error('Failed to list groups:', error);
      return res.status(500).json({ error: 'Failed to list groups' });
    }

    return res.status(200).json({
      success: true,
      groups: groups || []
    });
  } catch (error) {
    console.error('List groups error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
