/**
 * POST /api/auth/send-otp
 * Check if phone number exists (no OTP, password-only flow)
 */

import { supabase } from '../../supabase.js';
import { normalizePhone } from '../../phone.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, countryCode } = req.body;

  // Validate input
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Validate country code
  const validCountryCodes = ['+972', '+1', '+44', '+49', '+33', '+39', '+34', '+31', '+32', '+41', '+43', '+45', '+46', '+47', '+48', '+61', '+81', '+82', '+86', '+91', '+351', '+358', '+7'];
  if (!countryCode || !validCountryCodes.includes(countryCode)) {
    return res.status(400).json({ error: 'Invalid country code' });
  }

  // Normalize phone with country code
  const phoneNormalized = normalizePhone(phone, countryCode);
  if (!phoneNormalized) {
    return res.status(400).json({ error: 'Invalid phone number format for selected country' });
  }

  try {
    // Check if phone already registered
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('phone_normalized', phoneNormalized)
      .single();

    if (existingUser) {
      // Check if password reset required
      const { data: userData } = await supabase
        .from('auth_users')
        .select('password_reset_required')
        .eq('id', existingUser.id)
        .single();

      // User exists - return success and indicate they should login
      return res.status(200).json({
        success: true,
        userExists: true,
        phoneNormalized,
        passwordResetRequired: userData?.password_reset_required || false,
        message: userData?.password_reset_required
          ? 'Your password was reset by an admin. Please set a new password.'
          : 'Welcome back! Please login with your password.',
      });
    }

    // New user - no OTP needed, go straight to registration
    return res.status(200).json({
      success: true,
      userExists: false,
      phoneNormalized,
      message: 'New user - please create your account',
    });
  } catch (error) {
    console.error('Check phone error:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
