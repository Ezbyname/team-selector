#!/usr/bin/env node
/**
 * Check OTP codes for a phone number
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xtregredwnlkuocytmqy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cmVncmVkd25sa3VvY3l0bXF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc5Mzg0MiwiZXhwIjoyMDkyMzY5ODQyfQ.HWtkj7FxctY8yXgclBTflxUkSYUEJIXb4nKzlWmzm8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOTP() {
  const phone = '+972525502281';

  console.log(`🔍 Checking OTP codes for: ${phone}\n`);

  const { data: otps, error } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('phone_normalized', phone)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error querying OTP codes:', error);
    process.exit(1);
  }

  if (!otps || otps.length === 0) {
    console.log('❌ No OTP codes found for this phone number');
    console.log('💡 Click "Send Code" to generate an OTP');
    process.exit(0);
  }

  console.log(`✅ Found ${otps.length} OTP code(s):\n`);

  otps.forEach((otp, index) => {
    const expiresAt = new Date(otp.expires_at);
    const createdAt = new Date(otp.created_at);
    const now = new Date();
    const expired = expiresAt < now;
    const verified = !!otp.verified_at;

    console.log(`${index + 1}. OTP Code: ${otp.code}`);
    console.log(`   Created: ${createdAt.toLocaleString()}`);
    console.log(`   Expires: ${expiresAt.toLocaleString()}`);
    console.log(`   Status: ${verified ? '✅ Verified' : expired ? '❌ Expired' : '⏳ Valid'}`);
    if (verified) {
      console.log(`   Verified At: ${new Date(otp.verified_at).toLocaleString()}`);
    }
    console.log('');
  });

  // Show most recent valid OTP
  const validOtp = otps.find(otp => !otp.verified_at && new Date(otp.expires_at) > new Date());
  if (validOtp) {
    console.log(`🔐 Current Valid OTP: ${validOtp.code}`);
    console.log(`   Use this code to verify your phone`);
  } else {
    console.log('⚠️  No valid OTP found. All codes are either expired or already used.');
    console.log('💡 Go back and click "Send Code" to generate a new one');
  }
}

checkOTP().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
