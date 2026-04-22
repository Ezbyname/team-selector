import { supabase } from './lib/supabase.js';
import { normalizePhone } from './lib/phone.js';

const phone = '058-000-0000';
const normalized = normalizePhone(phone);

const { data, error } = await supabase
  .from('auth_users')
  .select('id, phone, phone_normalized, role')
  .eq('phone_normalized', normalized)
  .single();

if (error) {
  console.log('✓ User does NOT exist - test can register');
} else {
  console.log('✗ User EXISTS:');
  console.log('  ID:', data.id);
  console.log('  Phone:', data.phone);
  console.log('  Role:', data.role);
  console.log('\nCleanup failed - user still in DB');
}
