/**
 * POST /api/auth/send-otp
 * Send OTP code to phone number for signup verification
 */

import { supabase } from '../../lib/supabase.js';
import { normalizePhone, isValidPhone } from '../../lib/phone.js';

// Twilio client (will be configured)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

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
  const validCountryCodes = ['+972', '+1'];
  if (!countryCode || !validCountryCodes.includes(countryCode)) {
    return res.status(400).json({ error: 'Invalid country code' });
  }

  // Normalize phone with country code
  const phoneNormalized = normalizePhone(phone, countryCode);
  if (!phoneNormalized) {
    if (countryCode === '+972') {
      return res.status(400).json({ error: 'Invalid Israeli phone number. Must be 10 digits starting with 05' });
    } else if (countryCode === '+1') {
      return res.status(400).json({ error: 'Invalid US phone number. Must be 10 digits' });
    }
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    // Check if phone already registered
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('phone_normalized', phoneNormalized)
      .single();

    if (existingUser) {
      // User exists - return success and indicate they should login
      return res.status(200).json({
        success: true,
        userExists: true,
        message: 'Welcome back! Please login with your password.',
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiration (5 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        phone_normalized: phoneNormalized,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return res.status(500).json({ error: 'Failed to generate OTP' });
    }

    // Send SMS via Twilio
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      try {
        const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        await twilio.messages.create({
          body: `Team Selector verification code: ${otpCode}. Valid for 5 minutes.`,
          from: TWILIO_PHONE_NUMBER,
          to: phoneNormalized,
        });
      } catch (twilioError) {
        console.error('Twilio error:', twilioError);
        // Don't fail the request if SMS fails (for testing)
      }
    } else {
      // Development mode: log OTP to console
      console.log(`📱 OTP for ${phoneNormalized}: ${otpCode}`);
    }

    return res.status(200).json({
      success: true,
      userExists: false,
      message: 'OTP sent successfully',
      expiresAt: expiresAt.toISOString(),
      // Only include OTP in development
      ...(process.env.NODE_ENV === 'development' && { otpCode }),
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
