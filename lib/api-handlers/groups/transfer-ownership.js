/**
 * Transfer team ownership
 * POST /api/groups/transfer-ownership
 *
 * Current admin transfers admin role to another active member.
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
    const { groupId, targetUserId } = req.body;

    if (!groupId || !targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID and target user ID required'
      });
    }

    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer ownership to yourself'
      });
    }

    // Check if user is the group creator (owner/admin)
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

    // Check if current user is an active admin (if not owner)
    let currentMembership = null;
    if (!isOwner) {
      const { data: memberData, error: currentError } = await supabase
        .from('group_members')
        .select('id, role, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (currentError || !memberData) {
        return res.status(404).json({
          success: false,
          error: 'You are not an active member of this team.'
        });
      }

      if (memberData.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only team admin can transfer ownership.'
        });
      }

      currentMembership = memberData;
    }

    // Check if target user is an active member
    const { data: targetMembership, error: targetError } = await supabase
      .from('group_members')
      .select('id, role, status')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .eq('status', 'active')
      .single();

    if (targetError || !targetMembership) {
      return res.status(404).json({
        success: false,
        error: 'Target user is not an active member of this team.'
      });
    }

    // Set target user as admin (update their membership role)
    const { error: updateError } = await supabase
      .from('group_members')
      .update({ role: 'admin' })
      .eq('id', targetMembership.id);

    if (updateError) {
      throw updateError;
    }

    // If current user is owner, update groups.created_by to transfer ownership
    if (isOwner) {
      const { error: ownershipError } = await supabase
        .from('groups')
        .update({ created_by: targetUserId })
        .eq('id', groupId);

      if (ownershipError) {
        throw ownershipError;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Ownership transferred successfully',
      newAdmin: {
        userId: targetUserId,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Error transferring ownership:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
