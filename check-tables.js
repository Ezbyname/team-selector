import { supabase } from './lib/supabase.js';

const tables = ['groups', 'permanent_groups'];

for (const table of tables) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(0);

  if (error) {
    console.log(`✗ ${table}: ${error.message}`);
  } else {
    console.log(`✓ ${table}: exists`);

    // Count rows
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    console.log(`  Rows: ${count}`);
  }
}

// Check if the groups we created are in groups or permanent_groups
console.log('\nChecking test group location...');
const { data: groupsData } = await supabase
  .from('groups')
  .select('id, name')
  .ilike('name', '%Test Group%');

const { data: permGroupsData } = await supabase
  .from('permanent_groups')
  .select('id, name')
  .ilike('name', '%Test Group%');

console.log(`  In groups: ${groupsData?.length || 0}`);
console.log(`  In permanent_groups: ${permGroupsData?.length || 0}`);
