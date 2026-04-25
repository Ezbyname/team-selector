/**
 * POST /api/auth/request-password-reset
 * Step 1: Verify identity via simple question
 * Zero-cost password reset (no SMS, no email)
 */

import { supabase } from '../../supabase.js';
import { normalizePhone } from '../../phone.js';
import { checkRateLimit } from '../../rate-limit.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, countryCode, answer } = req.body;

  // Validate input
  if (!phone || !countryCode || !answer) {
    return res.status(400).json({ error: 'Phone, country code, and answer are required' });
  }

  const phoneNormalized = normalizePhone(phone, countryCode);
  if (!phoneNormalized) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // Rate limiting: 5 attempts per hour per phone
  const rateLimitKey = `password_reset:${phoneNormalized}`;
  const rateCheck = await checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Too many reset attempts. Please try again later.',
      retryAfter: rateCheck.retryAfter
    });
  }

  try {
    // Find user by phone
    const { data: user } = await supabase
      .from('auth_users')
      .select('id')
      .eq('phone_normalized', phoneNormalized)
      .single();

    // Log attempt (for rate limiting and audit)
    await supabase.from('password_reset_attempts').insert({
      phone_normalized: phoneNormalized,
      attempt_type: 'identity_question',
      success: false, // Will update if successful
    });

    // Generic error for security (never reveal if phone exists)
    if (!user) {
      return res.status(400).json({ error: 'Unable to verify identity.' });
    }

    // Verify answer by checking if it matches any of:
    // 1. Team name user belongs to
    // 2. Player name in user's teams
    // 3. Sport type of user's teams
    const answerLower = answer.trim().toLowerCase();

    // Check team names
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (memberships && memberships.length > 0) {
      const groupIds = memberships.map(m => m.group_id);

      // Check group names
      const { data: groups } = await supabase
        .from('groups')
        .select('name, sport_type')
        .in('id', groupIds);

      if (groups) {
        // Check if answer matches any group name
        for (const group of groups) {
          if (group.name.toLowerCase().includes(answerLower) ||
              answerLower.includes(group.name.toLowerCase())) {
            return await issueResetToken(user.id, phoneNormalized, res);
          }
        }

        // Check if answer matches sport type
        for (const group of groups) {
          if (group.sport_type.toLowerCase() === answerLower ||
              answerLower === 'basketball' ||
              answerLower === 'soccer' ||
              answerLower === 'football') {
            const sportMatch = groups.some(g =>
              g.sport_type.toLowerCase() === answerLower ||
              (answerLower === 'football' && g.sport_type.toLowerCase() === 'soccer')
            );
            if (sportMatch) {
              return await issueResetToken(user.id, phoneNormalized, res);
            }
          }
        }

        // Check player names in user's groups
        const { data: groupPlayers } = await supabase
          .from('group_players')
          .select('player_id')
          .in('group_id', groupIds);

        if (groupPlayers && groupPlayers.length > 0) {
          const playerIds = groupPlayers.map(gp => gp.player_id);

          const { data: players } = await supabase
            .from('players')
            .select('name')
            .in('id', playerIds);

          if (players) {
            for (const player of players) {
              if (player.name.toLowerCase().includes(answerLower) ||
                  answerLower.includes(player.name.toLowerCase())) {
                return await issueResetToken(user.id, phoneNormalized, res);
              }
            }
          }
        }
      }
    }

    // Answer doesn't match - generic error
    return res.status(400).json({ error: 'Unable to verify identity.' });

  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function issueResetToken(userId, phoneNormalized, res) {
  // Generate secure reset token
  const token = crypto.randomBytes(32).toString('hex');

  // Token expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Store token
  const { error: tokenError } = await supabase
    .from('password_reset_tokens')
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    });

  if (tokenError) {
    console.error('Failed to create reset token:', tokenError);
    return res.status(500).json({ error: 'Failed to process reset request' });
  }

  // Update attempt record to success
  await supabase
    .from('password_reset_attempts')
    .update({ success: true })
    .eq('phone_normalized', phoneNormalized)
    .order('created_at', { ascending: false })
    .limit(1);

  return res.status(200).json({
    success: true,
    resetToken: token,
    expiresAt: expiresAt.toISOString(),
    message: 'Identity verified. You can now reset your password.',
  });
}
