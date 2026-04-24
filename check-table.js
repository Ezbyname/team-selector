import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkTable() {
  const { data, error } = await supabase.from('group_invites').select('*').limit(1);
  console.log('group_invites table exists:', !error);
  if (error) {
    console.log('Error:', error.message);
    console.log('Code:', error.code);
  }

  const { data: groups, error: groupsError } = await supabase.from('groups').select('id').limit(1);
  console.log('groups table exists:', !groupsError);
  if (groupsError) {
    console.log('Groups Error:', groupsError.message);
  }
}

checkTable();
