import { supabase } from './lib/supabase.js';

// Get a real group from permanent_groups
const { data: permGroup } = await supabase
  .from('permanent_groups')
  .select('id, name, created_by')
  .limit(1)
  .single();

console.log('permanent_groups sample:', permGroup);

// Get a real group from groups
const { data: group } = await supabase
  .from('groups')
  .select('id, name, created_by')
  .limit(1)
  .single();

console.log('groups sample:', group);

// Try to add player to permanent_groups ID
if (permGroup) {
  const { data, error } = await supabase
    .from('players')
    .insert({
      name: 'Test Player A',
      group_id: permGroup.id,
      created_by: permGroup.created_by
    })
    .select();

  console.log('\nPlayer with permanent_groups ID:', {
    success: !!data,
    error: error ? `${error.code}: ${error.message}` : null
  });

  if (data) {
    console.log('  Player created successfully!');
    await supabase.from('players').delete().eq('id', data[0].id);
  }
}

// Try to add player to groups ID
if (group) {
  const { data, error } = await supabase
    .from('players')
    .insert({
      name: 'Test Player B',
      group_id: group.id,
      created_by: group.created_by
    })
    .select();

  console.log('\nPlayer with groups ID:', {
    success: !!data,
    error: error ? `${error.code}: ${error.message}` : null
  });

  if (data) {
    console.log('  Player created successfully!');
    await supabase.from('players').delete().eq('id', data[0].id);
  }
}
