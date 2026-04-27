/**
 * POST /api/auth/set-new-password-after-admin-reset
 * User sets new password after admin reset
 */

import bcrypt from 'bcrypt';
import { supabase } from '../../supabase.js';
import { normalizePhone } from '../../phone.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiration } from '../../jwt.js';

const BCRYPT_ROUNDS = 12;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, countryCode, newPassword } = req.body;

  // Validate input
  if (!phone || !countryCode || !newPassword) {
    return res.status(400).json({ error: 'Phone, country code, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const phoneNormalized = normalizePhone(phone, countryCode);
  if (!phoneNormalized) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    // Find user and verify password_reset_required is true
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('phone_normalized', phoneNormalized)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.password_reset_required) {
      return res.status(400).json({ error: 'Password reset not required for this account' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password and clear reset flag
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({
        password_hash: passwordHash,
        password_reset_required: false,
        password_reset_by: null,
        password_reset_requested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return res.status(500).json({ error: 'Failed to set new password' });
    }

    // Generate tokens and log user in
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
      message: 'Password set successfully',
      accessToken,
      user: {
        id: user.id,
        phone: user.phone_normalized,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Set new password after admin reset error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
