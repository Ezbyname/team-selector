import { supabase } from './lib/supabase.js';

// Try to insert a player with group_id
const { data, error } = await supabase
  .from('players')
  .insert({
    name: 'Test Player',
    group_id: '00000000-0000-0000-0000-000000000001',
    created_by: '00000000-0000-0000-0000-000000000002'
  })
  .select();

console.log('Insert with group_id result:', {
  success: !!data,
  error: error ? `${error.code}: ${error.message}` : null
});

// Try without group_id
const { data: data2, error: error2 } = await supabase
  .from('players')
  .insert({
    name: 'Test Player 2',
    created_by: '00000000-0000-0000-0000-000000000002'
  })
  .select();

console.log('\nInsert without group_id result:', {
  success: !!data2,
  error: error2 ? `${error2.code}: ${error2.message}` : null
});

// Check existing players
const { data: existing } = await supabase
  .from('players')
  .select('*')
  .limit(1);

if (existing && existing[0]) {
  console.log('\nExisting player schema (columns present):');
  console.log(Object.keys(existing[0]));
}
