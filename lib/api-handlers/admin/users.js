/**
 * GET /api/admin/users
 * List all users with filtering
 * Admin only
 */

import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/permissions.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { role, permission } = req.query;

  try {
    let query = supabase
      .from('auth_users')
      .select('id, phone, phone_normalized, role, can_grade_players, created_at')
      .order('created_at', { ascending: false });

    // Filter by role
    if (role && ['admin', 'sub_admin', 'user'].includes(role)) {
      query = query.eq('role', role);
    }

    // Filter by permission
    if (permission === 'can_grade_players') {
      query = query.eq('can_grade_players', true);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Failed to fetch users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdmin(handler);
