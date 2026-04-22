import { supabase } from './lib/supabase.js';
import bcrypt from 'bcrypt';

const newPassword = 'ErezAdmin2026!';
const phoneNormalized = '+972525502281';

console.log('Resetting password for:', phoneNormalized);

const passwordHash = await bcrypt.hash(newPassword, 12);

const { error } = await supabase
  .from('auth_users')
  .update({ password_hash: passwordHash })
  .eq('phone_normalized', phoneNormalized);

if (error) {
  console.error('Error:', error);
} else {
  console.log('✅ Password reset successfully!');
  console.log('\nYour new credentials:');
  console.log('  Phone: 0525502281');
  console.log('  Password: ErezAdmin2026!');
  console.log('\nLogin at: http://localhost:3003/login.html');
}
