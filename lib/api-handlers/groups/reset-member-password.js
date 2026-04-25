/**
 * POST /api/groups/reset-member-password
 * Admin resets a team member's password
 * Member will be required to set new password on next login
 */

import { supabase } from '../../supabase.js';
import { verifyToken } from '../../jwt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const adminUserId = decoded.sub;
  const { groupId, userId } = req.body;

  // Validate input
  if (!groupId || !userId) {
    return res.status(400).json({ error: 'Group ID and user ID are required' });
  }

  try {
    // Verify admin is an active admin of this group
    const { data: adminMembership } = await supabase
      .from('group_members')
      .select('role, status')
      .eq('group_id', groupId)
      .eq('user_id', adminUserId)
      .eq('status', 'active')
      .single();

    if (!adminMembership || adminMembership.role !== 'admin') {
      return res.status(403).json({ error: 'Only group admins can reset member passwords' });
    }

    // Verify target user is a member of this group
    const { data: targetMembership } = await supabase
      .from('group_members')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!targetMembership) {
      return res.status(404).json({ error: 'User is not an active member of this group' });
    }

    // Prevent admin from resetting their own password this way
    if (adminUserId === userId) {
      return res.status(400).json({ error: 'Cannot reset your own password. Use the forgot password flow.' });
    }

    // Mark user as requiring password reset
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_reset_required: true,
        password_reset_requested_at: new Date().toISOString(),
        password_reset_by: adminUserId,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to mark user for password reset:', updateError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // Get target user info for response
    const { data: targetUser } = await supabase
      .from('auth_users')
      .select('phone, phone_normalized')
      .eq('id', userId)
      .single();

    return res.status(200).json({
      success: true,
      message: 'Password reset initiated. User must set new password on next login.',
      user: {
        id: userId,
        phone: targetUser?.phone_normalized || 'Unknown',
      },
    });

  } catch (error) {
    console.error('Admin password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
