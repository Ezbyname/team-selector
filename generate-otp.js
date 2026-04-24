#!/usr/bin/env node
/**
 * Generate a new OTP code for testing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xtregredwnlkuocytmqy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cmVncmVkd25sa3VvY3l0bXF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc5Mzg0MiwiZXhwIjoyMDkyMzY5ODQyfQ.HWtkj7FxctY8yXgclBTflxUkSYUEJIXb4nKzlWmzm8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateOTP() {
  const phone = '+972525502281';
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  console.log(`🔐 Generating new OTP for: ${phone}\n`);

  const { data: newOtp, error } = await supabase
    .from('otp_codes')
    .insert({
      phone_normalized: phone,
      code: code,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error generating OTP:', error);
    process.exit(1);
  }

  console.log('✅ OTP Generated Successfully!\n');
  console.log(`📱 Phone: ${phone.replace('+972', '0')}`);
  console.log(`🔢 Code: ${code}`);
  console.log(`⏰ Expires: ${expiresAt.toLocaleString()}`);
  console.log(`\n💡 Enter this code in the verification screen`);
}

generateOTP().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
