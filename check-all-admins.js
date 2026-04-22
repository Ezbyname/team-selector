import { supabase } from './lib/supabase.js';

console.log('Checking all users with role admin or sub_admin:\n');

const { data, error } = await supabase
  .from('auth_users')
  .select('id, phone_normalized, display_name, role, can_grade_players')
  .or('role.eq.admin,role.eq.sub_admin');

if (error) {
  console.log('Error:', error);
} else if (!data || data.length === 0) {
  console.log('No admin users found');
} else {
  console.log(`Found ${data.length} admin user(s):\n`);
  data.forEach(user => {
    console.log(`📱 ${user.phone_normalized}`);
    console.log(`   Name: ${user.display_name || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Can grade: ${user.can_grade_players}`);
    console.log('');
  });
}

// Also check for your specific phone
console.log('Checking specifically for 0525502281:');
const { data: myUser } = await supabase
  .from('auth_users')
  .select('*')
  .eq('phone_normalized', '+972525502281')
  .single();

if (myUser) {
  console.log('✅ FOUND:', myUser);
} else {
  console.log('❌ Not found with +972525502281');
}
