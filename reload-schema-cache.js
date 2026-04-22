import { supabase } from './lib/supabase.js';

console.log('Reloading PostgREST schema cache...');

// Method 1: Call pg_notify to reload schema cache
const { error } = await supabase.rpc('notify_pgrst_of_schema_changes');

if (error) {
  console.log('RPC method failed, trying direct notify...');

  // Method 2: Use raw SQL if available
  const { error: sqlError } = await supabase.from('pg_notify').insert({
    channel: 'pgrst',
    payload: 'reload schema'
  });

  if (sqlError) {
    console.log('Both methods failed. Schema cache reload requires database admin access.');
    console.log('Error:', sqlError);
    console.log('\nWorkaround: Restart the Supabase PostgREST service or wait for auto-refresh.');
    process.exit(1);
  }
}

console.log('Schema cache reload triggered successfully.');
console.log('Waiting 2 seconds for cache to refresh...');

await new Promise(resolve => setTimeout(resolve, 2000));

// Test if cache is refreshed
const { data, error: testError } = await supabase
  .from('game_sessions')
  .select('*')
  .limit(0);

if (testError) {
  console.log('Test failed - cache may still be stale:', testError.message);
} else {
  console.log('✓ Schema cache refreshed successfully!');
}
