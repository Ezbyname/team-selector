/**
 * POST /api/auth/complete-password-reset
 * Step 2: Set new password using reset token
 */

import bcrypt from 'bcrypt';
import { supabase } from '../../supabase.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiration } from '../../jwt.js';

const BCRYPT_ROUNDS = 12;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resetToken, newPassword } = req.body;

  // Validate input
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Find valid reset token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', resetToken)
      .is('used_at', null)
      .single();

    if (tokenError || !tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    if (now > expiresAt) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update user password and clear reset-required flag
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_hash: passwordHash,
        password_reset_required: false,
        password_reset_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.user_id);

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // Get user for token generation
    const { data: user } = await supabase
      .from('auth_users')
      .select('*')
      .eq('id', tokenRecord.user_id)
      .single();

    if (!user) {
      return res.status(500).json({ error: 'User not found' });
    }

    // Generate new tokens and log user in
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = getRefreshTokenExpiration();

    // Store refresh token
    await supabase.from('auth_sessions').insert({
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: refreshExpiresAt.toISOString(),
    });

    // Set httpOnly cookie
    res.setHeader('Set-Cookie', [
      `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
    ]);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful',
      accessToken,
      user: {
        id: user.id,
        phone: user.phone_normalized,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Complete password reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
