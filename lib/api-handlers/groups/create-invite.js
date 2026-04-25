/**
 * Create invite code for team
 * POST /api/groups/create-invite
 *
 * Only team admin (creator) can create invite codes
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

// Generate readable invite code
function generateInviteCode(teamName) {
  // Extract first word from team name (e.g., "Atlit Basketball" -> "ATLIT")
  const prefix = teamName
    .split(' ')[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 6);

  // SECURITY: Exclude ambiguous characters to prevent user confusion
  // Excluded: 0 (zero), O (letter O), 1 (one), I (letter I), L (letter L)
  const safeChars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += safeChars[Math.floor(Math.random() * safeChars.length)];
  }

  return `${prefix}-${suffix}`;
}

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

    const userId = decoded.sub;
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
      return res.status(403).json({ error: 'Only team admin can create invite codes' });
    }

    // Deactivate any existing active codes for this team
    const { error: deactivateError } = await supabase
      .from('group_invites')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Error deactivating old codes:', deactivateError);
      // Continue anyway - this is non-critical
    }

    // Generate new code
    let inviteCode;
    let attempts = 0;
    let created = false;

    // Try to create unique code (max 5 attempts)
    while (!created && attempts < 5) {
      inviteCode = generateInviteCode(group.name);

      const { data, error } = await supabase
        .from('group_invites')
        .insert({
          group_id: groupId,
          code: inviteCode,
          created_by: userId,
          is_active: true
        })
        .select()
        .single();

      if (!error) {
        created = true;
      } else if (error.message && error.message.includes('duplicate')) {
        // Duplicate code, try again
        console.log(`Duplicate code generated (${inviteCode}), trying again...`);
      } else {
        // Real error, not just duplicate
        console.error('Error inserting invite code:', error);
        throw error;
      }

      attempts++;
    }

    if (!created) {
      console.error('Failed to generate unique code after 5 attempts');
      return res.status(500).json({ error: 'Failed to generate unique code' });
    }

    return res.status(200).json({
      success: true,
      inviteCode
    });

  } catch (error) {
    console.error('Error creating invite code:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
