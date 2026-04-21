/**
 * Check if migration 003 was deployed
 */

import { supabase } from './lib/supabase.js';

console.log('Checking migration 003 deployment...\n');

// Check 1: can_grade_players column
const { data: userData, error: userError } = await supabase
  .from('auth_users')
  .select('id, can_grade_players')
  .limit(1);

if (userError) {
  console.log('✗ can_grade_players column does NOT exist');
  console.log('  Error:', userError.message);
  console.log('\nMigration 003 NOT deployed!');
  console.log('You must run the SQL migration in Supabase dashboard first.');
  process.exit(1);
}

console.log('✓ can_grade_players column exists');

// Check 2: player_ratings table
const { data: ratingsData, error: ratingsError } = await supabase
  .from('player_ratings')
  .select('id')
  .limit(1);

if (ratingsError) {
  console.log('✗ player_ratings table does NOT exist');
  console.log('  Error:', ratingsError.message);
  console.log('\nMigration 003 NOT deployed!');
  process.exit(1);
}

console.log('✓ player_ratings table exists');

// Check 3: calculate_final_grade function
const { data: fnData, error: fnError } = await supabase
  .rpc('calculate_final_grade', {
    p_player_name: 'test',
    p_sport: 'basketball'
  });

if (fnError) {
  console.log('✗ calculate_final_grade function does NOT exist');
  console.log('  Error:', fnError.message);
  console.log('\nMigration 003 NOT deployed!');
  process.exit(1);
}

console.log('✓ calculate_final_grade function exists');

console.log('\n✓ Migration 003 is DEPLOYED and working!');

// Check migration 004
console.log('\nChecking migration 004 deployment...\n');

// Check 4.1: groups table
const { data: groupsData, error: groupsError } = await supabase
  .from('groups')
  .select('id')
  .limit(1);

if (groupsError) {
  console.log('✗ groups table does NOT exist');
  console.log('  Error:', groupsError.message);
  console.log('\nMigration 004 NOT deployed!');
  console.log('You must run the SQL migration in Supabase dashboard first.');
  process.exit(1);
}

console.log('✓ groups table exists');

// Check 4.2: players table
const { data: playersData, error: playersError } = await supabase
  .from('players')
  .select('id')
  .limit(1);

if (playersError) {
  console.log('✗ players table does NOT exist');
  console.log('  Error:', playersError.message);
  console.log('\nMigration 004 NOT deployed!');
  process.exit(1);
}

console.log('✓ players table exists');

// Check 4.3: game_sessions table
const { data: sessionsData, error: sessionsError } = await supabase
  .from('game_sessions')
  .select('id')
  .limit(1);

if (sessionsError) {
  console.log('✗ game_sessions table does NOT exist');
  console.log('  Error:', sessionsError.message);
  console.log('\nMigration 004 NOT deployed!');
  process.exit(1);
}

console.log('✓ game_sessions table exists');

// Check 4.4: get_player_final_rating function
const { data: fnData2, error: fnError2 } = await supabase
  .rpc('get_player_final_rating', { p_player_id: '00000000-0000-0000-0000-000000000000' });

if (fnError2 && !fnError2.message.includes('null')) {
  console.log('✗ get_player_final_rating function does NOT exist');
  console.log('  Error:', fnError2.message);
  console.log('\nMigration 004 NOT deployed!');
  process.exit(1);
}

console.log('✓ get_player_final_rating function exists');

console.log('\n✓ Migration 004 is DEPLOYED and working!\n');
