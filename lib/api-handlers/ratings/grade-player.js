/**
 * POST /api/ratings/grade-player
 * Submit grade for a player
 * Requires: Admin OR can_grade_players permission
 *
 * Logic:
 * - Each grader submits INTEGER grade (1-10)
 * - Multiple grades are averaged
 * - Final grade is CEILING of average (round UP)
 */

import { supabase } from '../../lib/supabase.js';
import { requireGradingPermission } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerName, sport, position, grade } = req.body;

  // Validation
  if (!playerName || !playerName.trim()) {
    return res.status(400).json({ error: 'playerName is required' });
  }

  if (!sport || !['basketball', 'soccer'].includes(sport)) {
    return res.status(400).json({ error: 'sport must be basketball or soccer' });
  }

  // Validate grade: must be INTEGER 1-10
  if (grade === undefined || grade === null) {
    return res.status(400).json({ error: 'grade is required' });
  }

  // Check it's an integer
  if (!Number.isInteger(grade)) {
    return res.status(400).json({ error: 'grade must be an integer (no decimals)' });
  }

  // Check range
  if (grade < 1 || grade > 10) {
    return res.status(400).json({ error: 'grade must be between 1 and 10' });
  }

  try {
    // Upsert rating (insert or update if exists for this grader)
    const { data: rating, error: upsertError } = await supabase
      .from('player_ratings')
      .upsert({
        player_name: playerName.trim(),
        sport,
        position: position?.trim() || null,
        grade,
        graded_by: req.user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'player_name,sport,graded_by'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Failed to save rating:', upsertError);
      return res.status(500).json({ error: 'Failed to save rating' });
    }

    // Calculate final grade (average + ceiling)
    const { data: finalGradeData, error: calcError } = await supabase
      .rpc('calculate_final_grade', {
        p_player_name: playerName.trim(),
        p_sport: sport
      });

    if (calcError) {
      console.error('Failed to calculate final grade:', calcError);
    }

    const finalGrade = finalGradeData;

    // Get all grades for this player
    const { data: allRatings } = await supabase
      .from('player_ratings')
      .select('grade, graded_by, auth_users(phone)')
      .eq('player_name', playerName.trim())
      .eq('sport', sport);

    // Log action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.user.id,
        action_type: 'grade_player',
        target_player_name: playerName.trim(),
        details: { sport, grade, final_grade: finalGrade }
      });

    return res.status(200).json({
      success: true,
      rating: {
        id: rating.id,
        playerName: rating.player_name,
        sport: rating.sport,
        position: rating.position,
        yourGrade: rating.grade,
        finalGrade: finalGrade,
        graderCount: allRatings?.length || 1,
        allGrades: allRatings?.map(r => r.grade) || [grade]
      }
    });
  } catch (error) {
    console.error('Grade player error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireGradingPermission(handler);
