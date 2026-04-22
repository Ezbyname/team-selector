import { supabase } from './lib/supabase.js';

console.log('Attempting to list tables via Supabase...\n');

// Try to query known tables that we know work
const knownTables = ['auth_users', 'groups', 'players', 'player_ratings', 'admin_actions'];

for (const table of knownTables) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(1);

  if (error) {
    console.log(`✗ ${table}: ${error.message}`);
  } else {
    console.log(`✓ ${table}: accessible (${data.length} rows in sample)`);
  }
}

// Now try the problematic table
console.log('\nTrying problem table:');
const { data, error } = await supabase
  .from('game_sessions')
  .select('*')
  .limit(1);

if (error) {
  console.log(`✗ game_sessions: ${error.code} - ${error.message}`);
} else {
  console.log(`✓ game_sessions: accessible (${data.length} rows)`);
}
