#!/usr/bin/env node
/**
 * Update admin password
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = 'https://xtregredwnlkuocytmqy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cmVncmVkd25sa3VvY3l0bXF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc5Mzg0MiwiZXhwIjoyMDkyMzY5ODQyfQ.HWtkj7FxctY8yXgclBTflxUkSYUEJIXb4nKzlWmzm8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePassword() {
  const phone = '+972525502281';
  const newPassword = 'Trzdk1408!';

  console.log(`🔧 Updating password for: ${phone}\n`);

  // Find user
  const { data: user, error: findError } = await supabase
    .from('auth_users')
    .select('*')
    .eq('phone_normalized', phone)
    .single();

  if (findError || !user) {
    console.error('❌ User not found:', findError);
    process.exit(1);
  }

  console.log('✅ User found:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Name: ${user.phone}`);
  console.log(`   Role: ${user.role}`);
  console.log('');

  // Hash new password
  const password_hash = await bcrypt.hash(newPassword, 12);

  // Update password
  const { data: updated, error: updateError } = await supabase
    .from('auth_users')
    .update({ password_hash })
    .eq('id', user.id)
    .select();

  if (updateError) {
    console.error('❌ Error updating password:', updateError);
    process.exit(1);
  }

  console.log('✅ Password updated successfully!\n');
  console.log('🔐 Login Credentials:');
  console.log(`   Phone: ${phone.replace('+972', '0')} (or 0525502281)`);
  console.log(`   Password: ${newPassword}`);
  console.log('');
  console.log('🚀 Go to login page: http://localhost:3006/login.html');
  console.log('   Or use the main flow: http://localhost:3006/index.html');
}

updatePassword().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
