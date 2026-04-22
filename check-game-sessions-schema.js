import { supabase } from './lib/supabase.js';

// Try inserting a session directly
const testGroupId = '00000000-0000-0000-0000-000000000001';
const testUserId = '00000000-0000-0000-0000-000000000002';

const { data, error } = await supabase
  .from('game_sessions')
  .insert({
    group_id: testGroupId,
    session_date: '2026-04-25',
    status: 'planning',
    created_by: testUserId
  })
  .select();

console.log('Insert result:', { data, error });

// Also try different column names
if (error && error.code === 'PGRST204') {
  console.log('\nTrying game_date instead...');
  const { data: data2, error: error2 } = await supabase
    .from('game_sessions')
    .insert({
      group_id: testGroupId,
      game_date: '2026-04-25',
      status: 'planning',
      created_by: testUserId
    })
    .select();

  console.log('game_date result:', { data: data2, error: error2 });
}
