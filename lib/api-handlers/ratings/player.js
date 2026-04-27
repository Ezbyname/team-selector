/**
 * GET /api/ratings/player
 * Get detailed rating info for a specific player
 * Requires: Admin OR can_grade_players permission
 * Query: ?name=PlayerName&sport=basketball
 */

import { supabase } from '../../supabase.js';
import { requireGradingPermission } from '../../permissions.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, sport } = req.query;

  // Validation
  if (!name) {
    return res.status(400).json({ error: 'name query parameter is required' });
  }

  if (!sport || !['basketball', 'soccer'].includes(sport)) {
    return res.status(400).json({ error: 'sport must be basketball or soccer' });
  }

  try {
    // Get all ratings from all graders
    const { data: ratings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select(`
        id,
        player_name,
        sport,
        position,
        grade,
        graded_by,
        created_at,
        updated_at,
        auth_users(phone, phone_normalized, role)
      `)
      .eq('player_name', name)
      .eq('sport', sport)
      .order('updated_at', { ascending: false });

    if (ratingsError) {
      console.error('Failed to fetch ratings:', ratingsError);
      return res.status(500).json({ error: 'Failed to fetch ratings' });
    }

    if (!ratings || ratings.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Calculate final grade
    const { data: finalGrade } = await supabase
      .rpc('calculate_final_grade', {
        p_player_name: name,
        p_sport: sport
      });

    return res.status(200).json({
      success: true,
      player: {
        name: ratings[0].player_name,
        sport: ratings[0].sport,
        position: ratings[0].position,
        finalGrade: finalGrade,
        graderCount: ratings.length,
        ratings: ratings.map(r => ({
          grade: r.grade,
          gradedBy: r.auth_users.phone,
          role: r.auth_users.role,
          updatedAt: r.updated_at
        })),
        allGrades: ratings.map(r => r.grade)
      }
    });
  } catch (error) {
    console.error('Get player error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireGradingPermission(handler);
