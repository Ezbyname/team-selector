import { supabase } from './lib/supabase.js';

console.log('Testing game_sessions insert...\n');

// First, get a real group_id and user_id
const { data: group } = await supabase
  .from('groups')
  .select('id, created_by')
  .limit(1)
  .single();

if (!group) {
  console.log('No groups found - create one first');
  process.exit(1);
}

console.log(`Using group_id: ${group.id}`);
console.log(`Using created_by: ${group.created_by}\n`);

// Try insert with different approaches
console.log('Approach 1: With session_date');
const { data: session1, error: error1 } = await supabase
  .from('game_sessions')
  .insert({
    group_id: group.id,
    session_date: '2026-04-25',
    created_by: group.created_by
  })
  .select();

console.log('Result 1:', { data: session1, error: error1 ? error1.message : null });

if (error1) {
  console.log('\nApproach 2: Without session_date (let DB use default)');
  const { data: session2, error: error2 } = await supabase
    .from('game_sessions')
    .insert({
      group_id: group.id,
      created_by: group.created_by
    })
    .select();

  console.log('Result 2:', { data: session2, error: error2 ? error2.message : null });

  if (session2) {
    console.log('Session created:', session2[0]);

    // Clean up
    await supabase.from('game_sessions').delete().eq('id', session2[0].id);
    console.log('Test session deleted');
  }
} else if (session1) {
  console.log('Session created:', session1[0]);

  // Clean up
  await supabase.from('game_sessions').delete().eq('id', session1[0].id);
  console.log('Test session deleted');
}
