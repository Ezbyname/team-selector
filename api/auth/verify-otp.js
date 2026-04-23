/**
 * POST /api/auth/verify-otp
 * Verify OTP code before registration
 */

import { supabase } from '../../lib/supabase.js';
import { normalizePhone } from '../../lib/phone.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, code, countryCode } = req.body;

  // Validate input
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code are required' });
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
    // Find valid OTP (not expired, not already verified)
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_normalized', phoneNormalized)
      .eq('code', code)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Failed to verify OTP:', updateError);
      return res.status(500).json({ error: 'Failed to verify OTP' });
    }

    return res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
      phoneNormalized,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
