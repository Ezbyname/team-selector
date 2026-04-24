/**
 * Debug revoke endpoint
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const BASE_URL = 'http://localhost:3006';

const supabase = createClient(supabaseUrl, supabaseKey);

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type');
  const data = contentType?.includes('application/json') ? await response.json() : await response.text();

  return { status: response.status, data, contentType };
}

async function test() {
  console.log('Creating test setup...\n');

  // Create user
  const phone = `+972501${Math.floor(Math.random() * 100000000)}`;
  const { data: user } = await supabase.from('auth_users').insert({
    phone: 'DebugTestUser',
    phone_normalized: phone,
    password_hash: '$2b$12$test',
    role: 'user',
    phone_verified_at: new Date().toISOString(),
  }).select().single();

  const token = jwt.sign({ userId: user.id, role: 'user' }, jwtSecret, { expiresIn: '1h' });

  // Create group
  const { data: group } = await supabase.from('groups').insert({
    name: 'DebugTestGroup',
    sport: 'basketball',
    created_by: user.id,
  }).select().single();

  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
    status: 'active',
  });

  console.log(`User ID: ${user.id}`);
  console.log(`Group ID: ${group.id}\n`);

  // Create invite code
  console.log('Creating invite code...');
  const createRes = await request('/api/groups/create-invite', {
    method: 'POST',
    token,
    body: { groupId: group.id },
  });

  console.log(`Create status: ${createRes.status}`);
  console.log('Create response:', JSON.stringify(createRes.data, null, 2));

  if (createRes.status !== 200) {
    console.error('\nCREATE FAILED!');
    process.exit(1);
  }

  const code = createRes.data.inviteCode;
  console.log(`\nCode created: ${code}\n`);

  // Check database
  const { data: dbCodes } = await supabase
    .from('group_invites')
    .select('*')
    .eq('group_id', group.id);

  console.log('Codes in database:', dbCodes.length);
  dbCodes.forEach(c => {
    console.log(`  - ${c.code}: is_active=${c.is_active}, created_by=${c.created_by}`);
  });

  // Try to revoke
  console.log('\nRevoking invite code...');
  const revokeRes = await request('/api/groups/revoke-invite', {
    method: 'POST',
    token,
    body: { groupId: group.id },
  });

  console.log(`Revoke status: ${revokeRes.status}`);
  console.log('Revoke response:', JSON.stringify(revokeRes.data, null, 2));

  if (revokeRes.status !== 200) {
    console.error('\n❌ REVOKE FAILED!');
    console.error('Expected: 200');
    console.error('Got:', revokeRes.status);
  } else {
    console.log('\n✓ Revoke succeeded');
  }

  // Check database again
  const { data: afterRevoke } = await supabase
    .from('group_invites')
    .select('*')
    .eq('group_id', group.id);

  console.log('\nCodes after revoke:', afterRevoke.length);
  afterRevoke.forEach(c => {
    console.log(`  - ${c.code}: is_active=${c.is_active}`);
  });

  // Cleanup
  await supabase.from('groups').delete().eq('id', group.id);
  await supabase.from('auth_users').delete().eq('id', user.id);
}

test().catch(console.error);
