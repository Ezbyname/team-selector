/**
 * POST /api/players/grade
 * Grade a player (new player-based rating system)
 * Requires: Admin OR can_grade_players permission
 * Body: { playerId, grade }
 */

import { supabase } from '../../lib/supabase.js';
import { requireGradingPermission } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId, grade } = req.body;

  // Validation
  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }

  if (grade === undefined || grade === null) {
    return res.status(400).json({ error: 'grade is required' });
  }

  // Validate grade: must be INTEGER 1-10
  if (!Number.isInteger(grade)) {
    return res.status(400).json({ error: 'grade must be an integer (no decimals)' });
  }

  if (grade < 1 || grade > 10) {
    return res.status(400).json({ error: 'grade must be between 1 and 10' });
  }

  try {
    // Verify player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, name, group_id')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Upsert rating (insert or update if exists for this grader)
    const { data: rating, error: upsertError } = await supabase
      .from('player_ratings')
      .upsert({
        player_id: playerId,
        player_name: null, // New approach uses player_id, not name
        sport: null,
        grade,
        graded_by: req.user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'player_id,graded_by'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Failed to save rating:', upsertError);
      return res.status(500).json({ error: 'Failed to save rating' });
    }

    // Calculate final grade
    const { data: finalGradeData, error: calcError } = await supabase
      .rpc('get_player_final_rating', { p_player_id: playerId });

    if (calcError) {
      console.error('Failed to calculate final grade:', calcError);
    }

    const finalGrade = finalGradeData;

    // Get all grades for this player
    const { data: allRatings } = await supabase
      .from('player_ratings')
      .select('grade, graded_by, auth_users(phone)')
      .eq('player_id', playerId);

    // Log action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.user.id,
        action_type: 'grade_player',
        target_player_name: player.name,
        details: { player_id: playerId, grade, final_grade: finalGrade }
      });

    return res.status(200).json({
      success: true,
      rating: {
        playerId: playerId,
        playerName: player.name,
        yourGrade: rating.grade,
        finalRating: finalGrade,
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
