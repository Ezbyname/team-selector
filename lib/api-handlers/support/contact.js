/**
 * POST /api/support/contact
 * In-app support contact form (zero-cost)
 * Auto-attaches user context for better support
 */

import { supabase } from '../../supabase.js';
import { verifyToken } from '../../jwt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subject, message, context } = req.body;

  // Validate input
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  // Optional authentication (support can be used by logged-in or anonymous users)
  let userId = null;
  let userInfo = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      userId = decoded.sub;

      // Fetch user details
      const { data: user } = await supabase
        .from('auth_users')
        .select('phone, phone_normalized')
        .eq('id', userId)
        .single();

      if (user) {
        userInfo = {
          id: userId,
          phone: user.phone_normalized,
        };

        // Fetch user's groups
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id, role, status')
          .eq('user_id', userId)
          .eq('status', 'active');

        if (memberships && memberships.length > 0) {
          const groupIds = memberships.map(m => m.group_id);
          const { data: groups } = await supabase
            .from('groups')
            .select('id, name')
            .in('id', groupIds);

          userInfo.groups = groups?.map(g => ({ id: g.id, name: g.name })) || [];
          userInfo.roles = memberships.map(m => ({ groupId: m.group_id, role: m.role }));
        }
      }
    }
  }

  try {
    // Store support request in database
    const supportData = {
      user_id: userId,
      subject,
      message,
      user_info: userInfo,
      context: context || null, // Failure context if from reset flow
      created_at: new Date().toISOString(),
      ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null,
    };

    const { data: insertedRequest, error: insertError } = await supabase
      .from('support_requests')
      .insert(supportData)
      .select()
      .single();

    if (insertError || !insertedRequest) {
      console.error('CRITICAL: Failed to store support request:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Unable to send message. Please try again.'
      });
    }

    // Log for admin notification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🆘 NEW SUPPORT REQUEST');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`ID: ${insertedRequest.id}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log(`User: ${userInfo?.phone || 'Anonymous'}`);
    console.log(`Groups: ${userInfo?.groups?.map(g => g.name).join(', ') || 'None'}`);
    console.log(`Context: ${context || 'N/A'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════');

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Support contact error:', error);
    return res.status(500).json({ error: 'Failed to submit support request' });
  }
}
