/**
 * Set Admin Role for Phone Number
 * Usage: node --env-file=.env.local set-admin.js
 */

import { supabase } from './lib/supabase.js';
import { normalizePhone } from './lib/phone.js';

const ADMIN_PHONE = '0525502281';

async function setAdminRole() {
  console.log('Setting admin role...\n');

  // Normalize phone to E.164
  const phoneNormalized = normalizePhone(ADMIN_PHONE);
  console.log(`Phone: ${ADMIN_PHONE}`);
  console.log(`Normalized: ${phoneNormalized}\n`);

  // Check if user exists
  const { data: existingUser, error: checkError } = await supabase
    .from('auth_users')
    .select('id, phone, phone_normalized, role')
    .eq('phone_normalized', phoneNormalized)
    .single();

  if (checkError) {
    if (checkError.code === 'PGRST116') {
      console.error('❌ User not found!');
      console.error(`\nThe phone number ${ADMIN_PHONE} has not registered yet.`);
      console.error('\nPlease:');
      console.error('1. Start the app: vercel dev');
      console.error('2. Register/login with phone: 052-550-2281');
      console.error('3. Run this script again\n');
      process.exit(1);
    }
    console.error('❌ Error checking user:', checkError);
    process.exit(1);
  }

  console.log('User found:');
  console.log(`  ID: ${existingUser.id}`);
  console.log(`  Phone (original): ${existingUser.phone}`);
  console.log(`  Phone (normalized): ${existingUser.phone_normalized}`);
  console.log(`  Current Role: ${existingUser.role}\n`);

  if (existingUser.role === 'admin') {
    console.log('✅ User is already an admin! No changes needed.\n');
    process.exit(0);
  }

  // Update role to admin
  const { data: updatedUser, error: updateError } = await supabase
    .from('auth_users')
    .update({ role: 'admin' })
    .eq('phone_normalized', phoneNormalized)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating role:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully updated role to admin!\n');
  console.log('Updated user:');
  console.log(`  ID: ${updatedUser.id}`);
  console.log(`  Phone (original): ${updatedUser.phone}`);
  console.log(`  Phone (normalized): ${updatedUser.phone_normalized}`);
  console.log(`  New Role: ${updatedUser.role}\n`);
}

setAdminRole().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
