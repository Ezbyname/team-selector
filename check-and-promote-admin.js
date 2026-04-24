#!/usr/bin/env node
/**
 * Check if user exists and promote to super admin
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xtregredwnlkuocytmqy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cmVncmVkd25sa3VvY3l0bXF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc5Mzg0MiwiZXhwIjoyMDkyMzY5ODQyfQ.HWtkj7FxctY8yXgclBTflxUkSYUEJIXb4nKzlWmzm8c';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndPromoteAdmin() {
  const phone = '+972525502281';

  console.log(`🔍 Checking for user: ${phone}`);

  // Check if user exists
  const { data: users, error: selectError } = await supabase
    .from('auth_users')
    .select('*')
    .eq('phone_normalized', phone);

  if (selectError) {
    console.error('❌ Error querying users:', selectError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('❌ User not found in database');
    console.log('💡 User needs to register first at: http://localhost:3006/index.html');
    process.exit(0);
  }

  const user = users[0];
  console.log('✅ User found:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Phone: ${user.phone}`);
  console.log(`   Name: ${user.displayName || 'N/A'}`);
  console.log(`   Current Role: ${user.role || 'user'}`);
  console.log(`   Created: ${user.createdAt}`);

  // Promote to super admin
  if (user.role === 'super_admin') {
    console.log('✅ User is already a super admin!');
  } else {
    console.log('\n🔧 Promoting to super admin...');

    const { data: updated, error: updateError } = await supabase
      .from('auth_users')
      .update({ role: 'super_admin' })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      process.exit(1);
    }

    console.log('✅ Successfully promoted to super admin!');
    console.log(`   New Role: ${updated[0].role}`);
  }

  console.log('\n📋 Super Admin Capabilities:');
  console.log('   • Create new teams/groups');
  console.log('   • Assign sub-admins to teams');
  console.log('   • Manage all players across all teams');
  console.log('   • Can be admin in one team and player in another');
}

checkAndPromoteAdmin().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
