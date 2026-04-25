/**
 * Leave team
 * POST /api/groups/leave
 *
 * User leaves a team they are a member of.
 * Admin can only leave if another active admin exists.
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

    const userId = decoded.sub;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, error: 'Group ID required' });
    }

    // Check if user is the group creator (admin/owner)
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, created_by')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({
        success: false,
        error: 'Team not found.'
      });
    }

    const isOwner = group.created_by === userId;

    // Check if user is an active member (if not owner)
    let membership = null;
    if (!isOwner) {
      const { data: memberData, error: membershipError } = await supabase
        .from('group_members')
        .select('id, role, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (membershipError || !memberData) {
        return res.status(404).json({
          success: false,
          error: 'You are not an active member of this team.'
        });
      }

      membership = memberData;
    }

    // If user is admin (owner or member with admin role), check if they are the sole admin
    const userRole = isOwner ? 'admin' : membership.role;

    if (userRole === 'admin') {
      // Count all active admins (including owner)
      const { data: adminMembers, error: adminsError } = await supabase
        .from('group_members')
        .select('id, user_id')
        .eq('group_id', groupId)
        .eq('role', 'admin')
        .eq('status', 'active');

      if (adminsError) {
        throw adminsError;
      }

      // Total admins = admin members + owner (if owner is not in group_members)
      const adminMemberCount = adminMembers.length;
      const ownerIsInMembers = adminMembers.some(m => m.user_id === group.created_by);
      const totalAdmins = ownerIsInMembers ? adminMemberCount : adminMemberCount + 1;

      // If only one admin (the current user), prevent leaving
      if (totalAdmins === 1) {
        return res.status(403).json({
          success: false,
          error: 'Cannot leave - you are the only admin. Transfer ownership first.'
        });
      }
    }

    // For owner: update created_by to null or another admin (NOT IMPLEMENTED - owner cannot truly leave)
    // For now, owners who are sole admins are blocked above
    if (isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Team owners cannot leave. Transfer ownership first.'
      });
    }

    // Set membership status to resigned (do not delete)
    const { error: updateError } = await supabase
      .from('group_members')
      .update({ status: 'resigned' })
      .eq('id', membership.id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      message: 'Left team successfully'
    });

  } catch (error) {
    console.error('Error leaving team:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
