import { supabase } from './lib/supabase.js';
import bcrypt from 'bcrypt';

const newPassword = 'Trzdk1408!';
const phoneNormalized = '+972525502281';

console.log('Changing password for:', phoneNormalized);

const passwordHash = await bcrypt.hash(newPassword, 12);

const { error } = await supabase
  .from('auth_users')
  .update({ password_hash: passwordHash })
  .eq('phone_normalized', phoneNormalized);

if (error) {
  console.error('Error:', error);
} else {
  console.log('✅ Password changed successfully!');
  console.log('\nNew credentials:');
  console.log('  Phone: 0525502281');
  console.log('  Password: Trzdk1408!');
}
