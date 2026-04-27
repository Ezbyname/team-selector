/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */

import { supabase } from '../supabase.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiration } from '../jwt.js';
import { formatPhone } from '../phone.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract refresh token from cookie
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const refreshToken = cookies?.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }

  try {
    // Find valid session
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('*, auth_users(*)')
      .eq('refresh_token', refreshToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = session.auth_users;

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newRefreshExpiresAt = getRefreshTokenExpiration();

    // Update session with new refresh token
    const { error: updateError } = await supabase
      .from('auth_sessions')
      .update({
        refresh_token: newRefreshToken,
        expires_at: newRefreshExpiresAt.toISOString(),
        last_used_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Failed to update session:', updateError);
      return res.status(500).json({ error: 'Failed to refresh token' });
    }

    // Set new httpOnly cookie
    res.setHeader('Set-Cookie', [
      `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    ]);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        phone: formatPhone(user.phone_normalized),
        phoneNormalized: user.phone_normalized,
        displayName: user.phone,
        role: user.role,
      },
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
