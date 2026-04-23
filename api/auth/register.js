/**
 * POST /api/auth/register
 * Create new user account after OTP verification
 */

import bcrypt from 'bcrypt';
import { supabase } from '../../lib/supabase.js';
import { normalizePhone, formatPhone } from '../../lib/phone.js';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiration } from '../../lib/jwt.js';

const BCRYPT_ROUNDS = 12;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, password, displayName, countryCode } = req.body;

  // Validate input
  if (!phone || !password || !displayName) {
    return res.status(400).json({ error: 'Phone, password, and display name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Validate country code
  const validCountryCodes = ['+972', '+1'];
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
    // Verify phone was verified via OTP
    const { data: verifiedOtp } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_normalized', phoneNormalized)
      .not('verified_at', 'is', null)
      .order('verified_at', { ascending: false })
      .limit(1)
      .single();

    if (!verifiedOtp) {
      return res.status(403).json({ error: 'Phone not verified. Please verify OTP first.' });
    }

    // Check if OTP verification is recent (within 10 minutes)
    const verifiedAt = new Date(verifiedOtp.verified_at);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (verifiedAt < tenMinutesAgo) {
      return res.status(403).json({ error: 'OTP verification expired. Please verify again.' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('phone_normalized', phoneNormalized)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const { data: newUser, error: insertError } = await supabase
      .from('auth_users')
      .insert({
        phone: displayName, // Store display name in phone field for now
        phone_normalized: phoneNormalized,
        password_hash: passwordHash,
        role: 'user',
        phone_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !newUser) {
      console.error('Failed to create user:', insertError);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = getRefreshTokenExpiration();

    // Store refresh token
    const { error: sessionError } = await supabase
      .from('auth_sessions')
      .insert({
        user_id: newUser.id,
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

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        phone: formatPhone(phoneNormalized),
        phoneNormalized,
        displayName,
        role: newUser.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
