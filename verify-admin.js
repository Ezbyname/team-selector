/**
 * Verify Admin User Exists
 * Check if admin user is in database with correct role
 */

import { supabase } from './lib/supabase.js';
import { normalizePhone } from './lib/phone.js';

const phone = '052-550-2281';
const normalized = normalizePhone(phone);

console.log('Looking up:', phone);
console.log('Normalized:', normalized);
console.log('');

const { data, error } = await supabase
  .from('auth_users')
  .select('id, phone, phone_normalized, role, can_grade_players')
  .eq('phone_normalized', normalized)
  .single();

if (error) {
  console.log('ERROR:', error);
  process.exit(1);
} else {
  console.log('✓ Found user:');
  console.log('  ID:', data.id);
  console.log('  Phone (display):', data.phone);
  console.log('  Phone (normalized):', data.phone_normalized);
  console.log('  Role:', data.role);
  console.log('  Can Grade:', data.can_grade_players);
  console.log('');

  if (data.role === 'admin') {
    console.log('✓ User is admin');
  } else {
    console.log('✗ User is NOT admin');
  }
}
