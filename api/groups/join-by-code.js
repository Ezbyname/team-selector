/**
 * Join team by invite code
 * POST /api/groups/join-by-code
 *
 * Any authenticated user can join a team with valid invite code
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
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = decoded.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Invite code required' });
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = code.toUpperCase().trim();

    // Find invite by code (do NOT filter by is_active yet - need to distinguish invalid vs inactive)
    const { data: invite, error: inviteError } = await supabase
      .from('group_invites')
      .select(`
        id,
        group_id,
        code,
        is_active,
        expires_at,
        groups:group_id (
          id,
          name,
          sport,
          created_by
        )
      `)
      .eq('code', normalizedCode)
      .single();

    // CRITICAL: Check if code exists at all
    if (inviteError || !invite) {
      return res.status(404).json({
        success: false,
        error: 'This invite code is invalid.'
      });
    }

    // CRITICAL: Check if code is active (403 for revoked codes)
    if (!invite.is_active) {
      return res.status(403).json({
        success: false,
        error: 'This invite code is no longer active.'
      });
    }

    // CRITICAL: Check if code is expired (403 for expired codes)
    if (invite.expires_at) {
      const expiresAt = new Date(invite.expires_at);
      const now = new Date();

      if (expiresAt <= now) {
        // Deactivate expired code
        await supabase
          .from('group_invites')
          .update({ is_active: false })
          .eq('id', invite.id);

        return res.status(403).json({
          success: false,
          error: 'This invite code has expired.'
        });
      }
    }

    // CRITICAL: Validate group exists
    const group = invite.groups;
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Team not found.'
      });
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('group_members')
      .select('id, role, status')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        return res.status(409).json({
          success: false,
          error: 'You are already a member of this team.',
          group: {
            id: group.id,
            name: group.name,
            sport: group.sport
          }
        });
      } else {
        // User was removed, reactivate membership
        const { error: updateError } = await supabase
          .from('group_members')
          .update({
            status: 'active',
            role: 'user',  // Reset to member role
            joined_at: new Date().toISOString()
          })
          .eq('id', existingMembership.id);

        if (updateError) {
          throw updateError;
        }

        return res.status(200).json({
          success: true,
          message: 'Rejoined team successfully',
          group: {
            id: group.id,
            name: group.name,
            sport: group.sport
          },
          membership: {
            role: 'user',
            status: 'active'
          }
        });
      }
    }

    // Create new membership
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'user',  // Always join as member
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      return res.status(500).json({ success: false, error: 'Failed to join team' });
    }

    return res.status(200).json({
      success: true,
      message: 'Joined team successfully',
      group: {
        id: group.id,
        name: group.name,
        sport: group.sport
      },
      membership: {
        role: membership.role,
        status: membership.status
      }
    });

  } catch (error) {
    console.error('Error joining team:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
