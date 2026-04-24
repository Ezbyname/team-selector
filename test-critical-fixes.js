/**
 * Quick test to verify critical security fixes
 * Tests revoke and inactive code validation
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3006';

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

  return { status: response.status, data };
}

async function runTest() {
  console.log('\n🔍 Testing Critical Security Fixes\n');

  // Setup
  console.log('1. Creating test user and group...');
  const phone = `+972501${Math.floor(Math.random() * 100000000)}`;
  const { data: user } = await supabase.from('auth_users').insert({
    phone: 'CriticalTestUser',
    phone_normalized: phone,
    password_hash: '$2b$12$test',
    role: 'user',
    phone_verified_at: new Date().toISOString(),
  }).select().single();

  const token = jwt.sign({ userId: user.id, role: 'user' }, jwtSecret, { expiresIn: '1h' });

  const { data: group } = await supabase.from('groups').insert({
    name: 'CriticalTestGroup',
    sport: 'basketball',
    created_by: user.id,
  }).select().single();

  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
    status: 'active',
  });

  console.log('✓ Setup complete\n');

  // Test 1: Create invite code
  console.log('2. Creating invite code...');
  const createRes = await request('/api/groups/create-invite', {
    method: 'POST',
    token,
    body: { groupId: group.id },
  });

  if (createRes.status !== 200) {
    console.error('✗ FAILED: Create returned', createRes.status);
    console.error('  Response:', createRes.data);
    process.exit(1);
  }

  const inviteCode = createRes.data.inviteCode;
  console.log(`✓ Created code: ${inviteCode}\n`);

  // Test 2: Revoke invite code
  console.log('3. Revoking invite code...');
  const revokeRes = await request('/api/groups/revoke-invite', {
    method: 'POST',
    token,
    body: { groupId: group.id },
  });

  if (revokeRes.status !== 200) {
    console.error('✗ FAILED: Revoke returned', revokeRes.status);
    console.error('  Response:', revokeRes.data);
    process.exit(1);
  }

  if (!revokeRes.data.success) {
    console.error('✗ FAILED: Revoke response missing success=true');
    process.exit(1);
  }

  console.log('✓ Revoke succeeded\n');

  // Test 3: Verify code is inactive in database
  console.log('4. Verifying code is inactive in database...');
  const { data: dbCode } = await supabase
    .from('group_invites')
    .select('is_active')
    .eq('code', inviteCode)
    .single();

  if (dbCode.is_active !== false) {
    console.error('✗ FAILED: Code is still active in database');
    console.error('  is_active:', dbCode.is_active);
    process.exit(1);
  }

  console.log('✓ Code is inactive in database\n');

  // Test 4: Try to join with revoked code
  console.log('5. Attempting to join with revoked code...');
  const joinRes = await request('/api/groups/join-by-code', {
    method: 'POST',
    token,
    body: { code: inviteCode },
  });

  if (joinRes.status !== 403 && joinRes.status !== 404) {
    console.error('✗ FAILED: Revoked code should return 403 or 404, got', joinRes.status);
    console.error('  Response:', joinRes.data);
    process.exit(1);
  }

  if (joinRes.status === 200) {
    console.error('✗ CRITICAL: Revoked code was accepted! Security vulnerability!');
    process.exit(1);
  }

  const errorMsg = joinRes.data.error;
  if (!errorMsg || (!errorMsg.includes('invalid') && !errorMsg.includes('no longer active'))) {
    console.error('✗ FAILED: Wrong error message');
    console.error('  Expected: "invalid" or "no longer active"');
    console.error('  Got:', errorMsg);
    process.exit(1);
  }

  console.log('✓ Revoked code correctly rejected\n');

  // Cleanup
  console.log('6. Cleaning up...');
  await supabase.from('groups').delete().eq('id', group.id);
  await supabase.from('auth_users').delete().eq('id', user.id);
  console.log('✓ Cleanup complete\n');

  // Success
  console.log('🎉 ALL CRITICAL FIXES VERIFIED!\n');
  console.log('Results:');
  console.log('  ✓ Revoke endpoint returns 200');
  console.log('  ✓ Code is deactivated in database');
  console.log('  ✓ Revoked codes cannot be used (403/404)');
  console.log('  ✓ Proper error messages returned');
  console.log('\nProceed with full test suite: npm run test:invite-codes\n');
}

runTest().catch(error => {
  console.error('\n✗ TEST CRASHED:', error.message);
  console.error(error);
  process.exit(1);
});
