/**
 * POST /api/auth/login
 * Login with phone + password
 */

import bcrypt from 'bcrypt';
import { supabase } from '../../lib/supabase.js';
import { normalizePhone, formatPhone } from '../../lib/phone.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiration } from '../../lib/jwt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, password, countryCode } = req.body;

  // Validate input
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  // Validate country code
  const validCountryCodes = ['+972', '+1', '+44', '+49', '+33', '+39', '+34', '+31', '+32', '+41', '+43', '+45', '+46', '+47', '+48', '+61', '+81', '+82', '+86', '+91', '+351', '+358', '+7'];
  const selectedCountryCode = countryCode || '+972';
  if (!validCountryCodes.includes(selectedCountryCode)) {
    return res.status(400).json({ error: 'Invalid country code' });
  }

  // Normalize phone
  const phoneNormalized = normalizePhone(phone, selectedCountryCode);
  if (!phoneNormalized) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    // Find user by phone
    const { data: user, error: fetchError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('phone_normalized', phoneNormalized)
      .single();

    if (fetchError || !user) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = getRefreshTokenExpiration();

    // Store refresh token
    const { error: sessionError } = await supabase
      .from('auth_sessions')
      .insert({
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: refreshExpiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    // Set httpOnly cookie for refresh token
    res.setHeader('Set-Cookie', [
      `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    ]);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        phone: formatPhone(phoneNormalized),
        phoneNormalized,
        displayName: user.phone, // Using phone field as display name for now
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
