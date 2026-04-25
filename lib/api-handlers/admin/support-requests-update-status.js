/**
 * POST /api/admin/support-requests-update-status
 * Super Admin only - update support request status
 */

import { supabase } from '../../supabase.js';
import { verifyToken } from '../../jwt.js';

const SUPER_ADMIN_PHONE = '+972525502281'; // Normalized format

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

  const { id, status } = req.body;

  // Validate input
  if (!id || !status) {
    return res.status(400).json({ error: 'Request ID and status are required' });
  }

  const validStatuses = ['new', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // Get user phone to check super admin
    const { data: user } = await supabase
      .from('auth_users')
      .select('phone_normalized')
      .eq('id', decoded.sub)
      .single();

    if (!user || user.phone_normalized !== SUPER_ADMIN_PHONE) {
      return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }

    // Update status
    const updateData = {
      status,
      resolved_by: decoded.sub
    };

    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('support_requests')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update support request:', updateError);
      return res.status(500).json({ error: 'Failed to update status' });
    }

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully'
    });

  } catch (error) {
    console.error('Support request update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
