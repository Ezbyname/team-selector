/**
 * Revoke invite code for team
 * POST /api/groups/revoke-invite
 *
 * Only team admin (creator) can revoke invite codes
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;

if (!supabaseUrl || !supabaseKey || !jwtSecret) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID required' });
    }

    // Check if user is team admin (creator)
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, created_by')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (group.created_by !== userId) {
      return res.status(403).json({ error: 'Only team admin can revoke invite codes' });
    }

    // Deactivate all active codes for this team
    const { error: updateError } = await supabase
      .from('group_invites')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (updateError) {
      console.error('Error revoking invite codes:', updateError);
      return res.status(500).json({ error: 'Failed to revoke invite codes' });
    }

    return res.status(200).json({
      success: true,
      message: 'All invite codes revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking invite codes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
