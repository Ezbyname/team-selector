import { supabase } from './lib/supabase.js';

// Check what columns exist and their nullability
const query = `
  SELECT column_name, is_nullable, data_type
  FROM information_schema.columns
  WHERE table_name = 'player_ratings'
  ORDER BY ordinal_position;
`;

const { data, error } = await supabase.rpc('exec_sql', { query });

if (error) {
  console.log('Using direct query instead...');

  // Try inserting with null values to see what fails
  const { data: testInsert, error: insertError } = await supabase
    .from('player_ratings')
    .insert({
      player_id: '00000000-0000-0000-0000-000000000000',
      player_name: null,
      sport: null,
      grade: 5,
      graded_by: '00000000-0000-0000-0000-000000000000'
    })
    .select();

  console.log('Test insert result:', { testInsert, insertError });
} else {
  console.log('Schema:', data);
}
