import { supabase } from './lib/supabase.js';
import { normalizePhone } from './lib/phone.js';

const phone = '0525502281';
const normalized = normalizePhone(phone);

console.log(`Checking phone: ${phone}`);
console.log(`Normalized: ${normalized}`);

const { data, error } = await supabase
  .from('auth_users')
  .select('id, phone_normalized, display_name, role, can_grade_players')
  .eq('phone_normalized', normalized)
  .single();

if (error) {
  console.log('User NOT found - you need to register');
  console.log('Use the registration flow to create your account');
} else {
  console.log('\nUser found:');
  console.log(data);
  console.log('\n✅ This phone is registered!');
  console.log('→ You should go directly to password login (no OTP needed)');
}
