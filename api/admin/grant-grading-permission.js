/**
 * POST /api/admin/grant-grading-permission
 * Grant can_grade_players permission to user
 * Admin only
 */

import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  // Validation
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Check target user exists
    const { data: targetUser, error: fetchError } = await supabase
      .from('auth_users')
      .select('id, phone, phone_normalized, role, can_grade_players')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Already has permission?
    if (targetUser.can_grade_players) {
      return res.status(400).json({ error: 'User already has grading permission' });
    }

    // Grant permission
    const { data: updatedUser, error: updateError } = await supabase
      .from('auth_users')
      .update({ can_grade_players: true })
      .eq('id', userId)
      .select('id, phone, phone_normalized, role, can_grade_players')
      .single();

    if (updateError) {
      console.error('Failed to update user:', updateError);
      return res.status(500).json({ error: 'Failed to grant permission' });
    }

    // Log action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: req.user.id,
        action_type: 'grant_grading_permission',
        target_user_id: userId,
        details: {}
      });

    return res.status(200).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Grant permission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdmin(handler);
