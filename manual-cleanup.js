import { supabase } from './lib/supabase.js';
import { normalizePhone } from './lib/phone.js';

const phone = '058-000-0000';
const normalized = normalizePhone(phone);

console.log('Cleaning up test user:', phone);

// Get user
const { data: user } = await supabase
  .from('auth_users')
  .select('id')
  .eq('phone_normalized', normalized)
  .single();

if (user) {
  console.log('Found user:', user.id);

  console.log('1. Deleting player ratings by user...');
  await supabase.from('player_ratings').delete().eq('graded_by', user.id);
  console.log('  ✓ Player ratings deleted');

  console.log('2. Deleting groups created by user...');
  const { error: groupError } = await supabase.from('groups').delete().eq('created_by', user.id);
  if (groupError) console.log('  Error:', groupError.message);
  else console.log('  ✓ Groups deleted');

  console.log('3. Deleting admin actions...');
  await supabase.from('admin_actions').delete().eq('admin_id', user.id);
  console.log('  ✓ Admin actions deleted');

  console.log('4. Deleting user...');
  const { error: userError } = await supabase.from('auth_users').delete().eq('id', user.id);
  if (userError) {
    console.log('  Error:', userError.message);
  } else {
    console.log('  ✓ User deleted');
  }
} else {
  console.log('User not found - already clean');
}
