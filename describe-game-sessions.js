import { supabase } from './lib/supabase.js';

// Try to infer schema from error messages
console.log('Inferring game_sessions schema from insert attempts...\n');

const testData = {
  group_id: '00000000-0000-0000-0000-000000000001',
  created_by: '00000000-0000-0000-0000-000000000002',
  session_type: 'test'
};

console.log('Trying with session_type="test"...');
const { data, error } = await supabase
  .from('game_sessions')
  .insert(testData)
  .select();

console.log('Result:', {
  success: !!data,
  error: error ? `${error.code}: ${error.message}` : null,
  details: error?.details
});

if (error && error.details) {
  console.log('\nError details suggest schema:');
  console.log(error.details);
}

// Try with common session_type values
const sessionTypes = ['regular', 'friendly', 'tournament', 'training', 'pickup'];

for (const type of sessionTypes) {
  const { data: testData2, error: error2 } = await supabase
    .from('game_sessions')
    .insert({
      group_id: '00000000-0000-0000-0000-000000000001',
      created_by: '00000000-0000-0000-0000-000000000002',
      session_type: type
    })
    .select();

  console.log(`\nsession_type="${type}":`, error2 ? error2.message : 'Success!');

  if (testData2) {
    console.log('Session created:', testData2[0]);
    // Clean up
    await supabase.from('game_sessions').delete().eq('id', testData2[0].id);
    break;
  }
}
