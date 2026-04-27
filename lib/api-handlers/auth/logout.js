/**
 * POST /api/auth/logout
 * Logout and invalidate refresh token
 */

import { supabase } from '../supabase.js';

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
    // Already logged out
    return res.status(200).json({ success: true, message: 'Already logged out' });
  }

  try {
    // Delete session from database
    await supabase
      .from('auth_sessions')
      .delete()
      .eq('refresh_token', refreshToken);

    // Clear cookie
    res.setHeader('Set-Cookie', [
      'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    ]);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
