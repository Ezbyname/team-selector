/**
 * GET /api/ratings/players
 * List all graded players with final grades
 * Requires: Admin OR can_grade_players permission
 */

import { supabase } from '../supabase.js';
import { requireGradingPermission } from '../permissions.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sport } = req.query;

  try {
    let query = supabase
      .from('player_final_grades')
      .select('*')
      .order('final_grade', { ascending: false, nullsFirst: false });

    // Filter by sport
    if (sport && ['basketball', 'soccer'].includes(sport)) {
      query = query.eq('sport', sport);
    }

    const { data: players, error } = await query;

    if (error) {
      console.error('Failed to fetch players:', error);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    return res.status(200).json({
      success: true,
      players: players || []
    });
  } catch (error) {
    console.error('List players error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireGradingPermission(handler);
