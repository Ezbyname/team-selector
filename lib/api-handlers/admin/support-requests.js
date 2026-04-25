/**
 * GET /api/admin/support-requests
 * Super Admin only - view support requests
 */

import { supabase } from '../../supabase.js';
import { verifyToken } from '../../jwt.js';

const SUPER_ADMIN_PHONE = '+972525502281'; // Normalized format

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // Fetch support requests (latest first, limit 50)
    const limit = parseInt(req.query.limit) || 50;

    const { data: requests, error: fetchError } = await supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error('Failed to fetch support requests:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch support requests' });
    }

    // Format response
    const formattedRequests = requests.map(req => ({
      id: req.id,
      createdAt: req.created_at,
      phone: req.user_info?.phone || 'Anonymous',
      name: req.user_info?.phone || 'Unknown',
      subject: req.subject,
      message: req.message,
      context: req.context,
      status: req.status,
      groups: req.user_info?.groups || []
    }));

    return res.status(200).json({
      success: true,
      requests: formattedRequests,
      count: formattedRequests.length
    });

  } catch (error) {
    console.error('Support requests fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
