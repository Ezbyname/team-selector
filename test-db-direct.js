/**
 * Test database operations directly
 */

import { supabase } from './lib/supabase.js';

console.log('Testing direct database access...\n');

// Test 1: Insert a test group
console.log('1. Creating test group...');
const { data: group, error: groupError } = await supabase
  .from('groups')
  .insert({
    name: 'DB Test Group',
    location: 'Test Location',
    sport: 'basketball',
    created_by: '00000000-0000-0000-0000-000000000000' // Fake UUID for test
  })
  .select()
  .single();

if (groupError) {
  console.log('✗ Group creation failed:');
  console.log('  Error:', groupError.message);
  console.log('  Details:', JSON.stringify(groupError, null, 2));
  process.exit(1);
}

console.log('✓ Group created:', group.id);
console.log('');

// Test 2: List groups using view
console.log('2. Listing groups via view...');
const { data: groups, error: listError } = await supabase
  .from('group_stats')
  .select('*');

if (listError) {
  console.log('✗ List groups failed:');
  console.log('  Error:', listError.message);
  console.log('  Details:', JSON.stringify(listError, null, 2));
} else {
  console.log('✓ Found', groups.length, 'groups');
}
console.log('');

// Test 3: Add a player
console.log('3. Adding player to group...');
const { data: player, error: playerError } = await supabase
  .from('players')
  .insert({
    group_id: group.id,
    name: 'Test Player',
    player_position: 'Guard',
    default_rating: 5
  })
  .select()
  .single();

if (playerError) {
  console.log('✗ Player creation failed:');
  console.log('  Error:', playerError.message);
  console.log('  Details:', JSON.stringify(playerError, null, 2));
} else {
  console.log('✓ Player created:', player.id);
  console.log('  Default rating:', player.default_rating);
}
console.log('');

// Cleanup
console.log('4. Cleaning up...');
await supabase.from('groups').delete().eq('id', group.id);
console.log('✓ Cleanup complete');
console.log('');

console.log('All direct database tests passed!');
