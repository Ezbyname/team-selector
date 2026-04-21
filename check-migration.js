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

console.log('\n✓ Migration 003 is DEPLOYED and working!\n');
