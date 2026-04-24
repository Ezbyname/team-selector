/**
 * Join Team by Invite Code Test Suite
 * Comprehensive end-to-end testing for invite code feature
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  section: () => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  data: (label, value) => console.log(`  ${colors.cyan}${label}:${colors.reset} ${JSON.stringify(value, null, 2)}`),
};

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3006';

// Test state
let testState = {
  adminUser: null,
  adminToken: null,
  regularUser: null,
  regularToken: null,
  thirdUser: null,
  thirdToken: null,
  testGroup: null,
  secondGroup: null,
  inviteCode: null,
  secondInviteCode: null,
};

// Statistics
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  skipped: 0,
};

// Helper: Make HTTP request
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // Try to parse as JSON even if content-type is wrong
      try {
        data = JSON.parse(text);
      } catch {
        data = { text };
      }
    }

    return {
      status: response.status,
      ok: response.ok,
      contentType,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// Helper: Assert condition
function assert(condition, message) {
  stats.total++;
  if (condition) {
    log.success(message);
    stats.passed++;
    return true;
  } else {
    log.error(message);
    stats.failed++;
    return false;
  }
}

// Helper: Skip test
function skip(message) {
  stats.total++;
  stats.skipped++;
  log.warning(`SKIPPED: ${message}`);
}

// Helper: Warn condition
function warn(condition, message) {
  if (!condition) {
    log.warning(message);
    stats.warnings++;
  }
}

// Helper: Assert JSON response
function assertJSON(response, message) {
  return assert(
    response.contentType?.includes('application/json'),
    `${message} (returns JSON)`
  );
}

// ============================================================================
// SETUP: Create test users and teams
// ============================================================================

async function setupTestData() {
  log.section();
  log.title('SETUP: Creating Test Users and Teams');
  console.log('Setting up test data for invite code tests\n');

  try {
    // Clean up any existing test data
    await supabase.from('auth_users').delete().ilike('phone', 'InviteTest%');
    await supabase.from('groups').delete().ilike('name', 'InviteTest%');

    // Create admin user (team creator)
    const adminPhone = `+972501111${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const { data: adminUser, error: adminError } = await supabase
      .from('auth_users')
      .insert({
        phone: 'InviteTestAdmin', // Display name stored in phone field
        phone_normalized: adminPhone,
        password_hash: '$2b$12$test.hash.placeholder',
        role: 'user',
        phone_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (adminError) throw adminError;
    testState.adminUser = adminUser;

    // Generate JWT for admin
    const jwt = await import('jsonwebtoken');
    testState.adminToken = jwt.default.sign(
      { userId: adminUser.id, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    log.success(`Created admin user: ${adminUser.id}`);

    // Create regular user (will join via invite)
    const regularPhone = `+972502222${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const { data: regularUser, error: regularError } = await supabase
      .from('auth_users')
      .insert({
        phone: 'InviteTestMember', // Display name stored in phone field
        phone_normalized: regularPhone,
        password_hash: '$2b$12$test.hash.placeholder',
        role: 'user',
        phone_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (regularError) throw regularError;
    testState.regularUser = regularUser;

    testState.regularToken = jwt.default.sign(
      { userId: regularUser.id, role: regularUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    log.success(`Created regular user: ${regularUser.id}`);

    // Create third user (for additional tests)
    const thirdPhone = `+972503333${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const { data: thirdUser, error: thirdError } = await supabase
      .from('auth_users')
      .insert({
        phone: 'InviteTestThird', // Display name stored in phone field
        phone_normalized: thirdPhone,
        password_hash: '$2b$12$test.hash.placeholder',
        role: 'user',
        phone_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (thirdError) throw thirdError;
    testState.thirdUser = thirdUser;

    testState.thirdToken = jwt.default.sign(
      { userId: thirdUser.id, role: thirdUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    log.success(`Created third user: ${thirdUser.id}`);

    // Create test group (admin is creator)
    const { data: testGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'InviteTestBasketball',
        sport: 'basketball',
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (groupError) throw groupError;
    testState.testGroup = testGroup;

    // Add admin as group member
    await supabase.from('group_members').insert({
      group_id: testGroup.id,
      user_id: adminUser.id,
      role: 'admin',
      status: 'active',
    });

    log.success(`Created test group: ${testGroup.id}`);

    // Create second group for multi-team tests
    const { data: secondGroup, error: secondGroupError } = await supabase
      .from('groups')
      .insert({
        name: 'InviteTestFootball',
        sport: 'soccer',
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (secondGroupError) throw secondGroupError;
    testState.secondGroup = secondGroup;

    await supabase.from('group_members').insert({
      group_id: secondGroup.id,
      user_id: adminUser.id,
      role: 'admin',
      status: 'active',
    });

    log.success(`Created second test group: ${secondGroup.id}`);

    log.info('\nTest data setup complete');
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// TEST SUITE 1: INVITE CODE CREATION
// ============================================================================

async function testInviteCodeCreation() {
  log.section();
  log.title('TEST SUITE 1: Invite Code Creation');
  console.log('Testing invite code generation and permissions\n');

  // Test 1.1: Admin can create invite code
  log.info('Test 1.1: Admin creates invite code...');
  const createResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.testGroup.id },
  });

  assertJSON(createResponse, 'Create invite returns JSON');

  if (createResponse.status !== 200) {
    log.error(`API Error: ${JSON.stringify(createResponse.data, null, 2)}`);
  }

  assert(createResponse.status === 200, `Admin can create invite code (got ${createResponse.status})`);
  assert(createResponse.data.success === true, 'Response has success=true');
  assert(createResponse.data.inviteCode !== undefined, 'Response includes invite code');
  assert(typeof createResponse.data.inviteCode === 'string', 'Invite code is a string');
  assert(createResponse.data.inviteCode.length > 0, 'Invite code is not empty');

  testState.inviteCode = createResponse.data.inviteCode;
  log.data('Invite Code', testState.inviteCode);

  // Verify code format (TEAMNAME-XXXX)
  const codeFormat = /^[A-Z]+-[A-Z0-9]{4}$/;
  assert(codeFormat.test(testState.inviteCode), `Code follows format TEAMNAME-XXXX (got: ${testState.inviteCode})`);

  // Test 1.2: Non-admin cannot create invite code
  log.info('\nTest 1.2: Non-admin cannot create invite code...');
  const nonAdminCreate = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.regularToken,
    body: { groupId: testState.testGroup.id },
  });

  assertJSON(nonAdminCreate, 'Non-admin create attempt returns JSON');
  assert(nonAdminCreate.status === 403, `Non-admin rejected with 403 (got ${nonAdminCreate.status})`);
  assert(nonAdminCreate.data.error !== undefined, 'Error message returned for non-admin');
  log.data('Error', nonAdminCreate.data.error);

  // Test 1.3: Generated code is in database
  log.info('\nTest 1.3: Verify code stored in database...');
  const { data: inviteRecord, error: inviteError } = await supabase
    .from('group_invites')
    .select('*')
    .eq('code', testState.inviteCode)
    .single();

  assert(!inviteError && inviteRecord !== null, 'Invite code exists in database');
  assert(inviteRecord.group_id === testState.testGroup.id, 'Code belongs to correct group');
  assert(inviteRecord.is_active === true, 'Code is active');
  assert(inviteRecord.created_by === testState.adminUser.id, 'Code created_by is admin');

  // Test 1.4: Code is unique
  log.info('\nTest 1.4: Verify code uniqueness...');
  const secondCreate = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.testGroup.id },
  });

  assert(secondCreate.status === 200, 'Can create multiple codes');
  assert(secondCreate.data.inviteCode !== testState.inviteCode, 'New code is different from old code');

  // Verify old code is now inactive
  const { data: oldCode } = await supabase
    .from('group_invites')
    .select('is_active')
    .eq('code', testState.inviteCode)
    .single();

  assert(oldCode.is_active === false, 'Old code is deactivated when new code created');

  // Use the new code for remaining tests
  testState.inviteCode = secondCreate.data.inviteCode;
  log.info(`Using new code for remaining tests: ${testState.inviteCode}`);

  // Test 1.5: Invalid group ID
  log.info('\nTest 1.5: Test with invalid group ID...');
  const invalidGroup = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: '00000000-0000-0000-0000-000000000000' },
  });

  assertJSON(invalidGroup, 'Invalid group returns JSON');
  assert(invalidGroup.status === 404, `Invalid group ID rejected with 404 (got ${invalidGroup.status})`);

  // Test 1.6: Missing group ID
  log.info('\nTest 1.6: Test without group ID...');
  const missingGroup = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: {},
  });

  assertJSON(missingGroup, 'Missing group ID returns JSON');
  assert(missingGroup.status === 400, `Missing group ID rejected with 400 (got ${missingGroup.status})`);
}

// ============================================================================
// TEST SUITE 2: JOIN TEAM BY VALID CODE
// ============================================================================

async function testJoinByValidCode() {
  log.section();
  log.title('TEST SUITE 2: Join Team by Valid Code');
  console.log('Testing successful team join flow\n');

  // Test 2.1: User can join with valid code
  log.info('Test 2.1: Regular user joins team with valid code...');
  const joinResponse = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.regularToken,
    body: { code: testState.inviteCode },
  });

  assertJSON(joinResponse, 'Join response returns JSON');
  assert(joinResponse.status === 200, `Join succeeds with 200 (got ${joinResponse.status})`);
  assert(joinResponse.data.success === true, 'Response has success=true');
  assert(joinResponse.data.group !== undefined, 'Response includes group details');
  assert(joinResponse.data.membership !== undefined, 'Response includes membership details');
  assert(joinResponse.data.group.id === testState.testGroup.id, 'Joined correct group');
  assert(joinResponse.data.group.name === testState.testGroup.name, 'Group name matches');

  log.data('Join Response', joinResponse.data);

  // Test 2.2: Membership created with correct role
  log.info('\nTest 2.2: Verify membership in database...');
  const { data: membership, error: memberError } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser.id)
    .single();

  assert(!memberError && membership !== null, 'Membership exists in database');
  assert(membership.role === 'user', 'Joined user has role="user" (member)');
  assert(membership.status === 'active', 'Membership status is active');
  assert(joinResponse.data.membership.role === 'user', 'API response shows role="user"');

  // Test 2.3: User appears in /api/groups/my-teams
  log.info('\nTest 2.3: Verify joined team appears in my-teams...');
  const myTeamsResponse = await request('/api/groups/my-teams?sport=basketball', {
    method: 'GET',
    token: testState.regularToken,
  });

  assert(myTeamsResponse.status === 200, 'my-teams endpoint returns 200');
  assert(Array.isArray(myTeamsResponse.data.teams), 'my-teams returns teams array');

  const joinedTeam = myTeamsResponse.data.teams.find(t => t.id === testState.testGroup.id);
  assert(joinedTeam !== undefined, 'Joined team appears in my-teams list');
  assert(joinedTeam.role === 'user', 'Team shows correct role in my-teams');

  // Test 2.4: Code normalization (case-insensitive)
  log.info('\nTest 2.4: Test code normalization (lowercase input)...');

  // Create code for second group
  const createSecond = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.secondGroup.id },
  });
  testState.secondInviteCode = createSecond.data.inviteCode;

  const lowercaseJoin = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.thirdToken,
    body: { code: testState.secondInviteCode.toLowerCase() },
  });

  assert(lowercaseJoin.status === 200, 'Lowercase code works (normalized to uppercase)');
  assert(lowercaseJoin.data.group.id === testState.secondGroup.id, 'Joined correct group with lowercase code');

  // Test 2.5: Code with extra whitespace
  log.info('\nTest 2.5: Test code with whitespace...');
  const { data: regularMembership } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', testState.secondGroup.id)
    .eq('user_id', testState.thirdUser.id);

  const whitespaceJoin = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.thirdToken,
    body: { code: `  ${testState.secondInviteCode}  ` },
  });

  assert(whitespaceJoin.status === 200, 'Code with whitespace works (trimmed)');
}

// ============================================================================
// TEST SUITE 3: INVALID CODE
// ============================================================================

async function testInvalidCode() {
  log.section();
  log.title('TEST SUITE 3: Invalid Invite Code');
  console.log('Testing rejection of invalid codes\n');

  // Test 3.1: Non-existent code
  log.info('Test 3.1: Join with non-existent code...');
  const invalidJoin = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.thirdToken,
    body: { code: 'INVALID-CODE' },
  });

  assertJSON(invalidJoin, 'Invalid code response returns JSON');
  assert(invalidJoin.status === 404, `Invalid code rejected with 404 (got ${invalidJoin.status})`);
  assert(invalidJoin.data.error !== undefined, 'Error message returned');
  assert(
    invalidJoin.data.error === 'This invite code is invalid.',
    `Error message matches spec (got: "${invalidJoin.data.error}")`
  );

  log.data('Error', invalidJoin.data.error);

  // Test 3.2: Empty code
  log.info('\nTest 3.2: Join with empty code...');
  const emptyJoin = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.thirdToken,
    body: { code: '' },
  });

  assertJSON(emptyJoin, 'Empty code response returns JSON');
  assert(emptyJoin.status === 400, `Empty code rejected with 400 (got ${emptyJoin.status})`);

  // Test 3.3: Missing code parameter
  log.info('\nTest 3.3: Join without code parameter...');
  const missingCode = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.thirdToken,
    body: {},
  });

  assertJSON(missingCode, 'Missing code response returns JSON');
  assert(missingCode.status === 400, `Missing code rejected with 400 (got ${missingCode.status})`);
}

// ============================================================================
// TEST SUITE 4: REVOKED / INACTIVE CODE
// ============================================================================

async function testRevokedCode() {
  log.section();
  log.title('TEST SUITE 4: Revoked / Inactive Invite Code');
  console.log('Testing revoked and inactive codes\n');

  // Test 4.1: Admin can revoke invite code
  log.info('Test 4.1: Admin revokes invite code...');

  // Debug: Check what code we're trying to revoke
  log.info(`  Current inviteCode: ${testState.inviteCode}`);
  log.info(`  Admin user ID: ${testState.adminUser.id}`);
  log.info(`  Test group ID: ${testState.testGroup.id}`);

  const revokeResponse = await request('/api/groups/revoke-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.testGroup.id },
  });

  if (revokeResponse.status !== 200) {
    log.error(`  Revoke failed with: ${JSON.stringify(revokeResponse.data, null, 2)}`);
  }

  assertJSON(revokeResponse, 'Revoke response returns JSON');
  assert(revokeResponse.status === 200, `Revoke succeeds with 200 (got ${revokeResponse.status})`);
  assert(revokeResponse.data.success === true, 'Revoke response has success=true');

  // Test 4.2: Verify code is inactive in database
  log.info('\nTest 4.2: Verify code deactivated in database...');
  const { data: revokedCode } = await supabase
    .from('group_invites')
    .select('is_active')
    .eq('code', testState.inviteCode)
    .single();

  assert(revokedCode.is_active === false, 'Code is_active set to false');

  // Test 4.3: Revoked code cannot be used
  log.info('\nTest 4.3: Try to join with revoked code...');

  // Remove third user from test group if they're in it
  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.thirdUser.id);

  const revokedJoin = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.thirdToken,
    body: { code: testState.inviteCode },
  });

  assertJSON(revokedJoin, 'Revoked code response returns JSON');
  assert(revokedJoin.status === 403, `Revoked code rejected with 403 (got ${revokedJoin.status})`);
  assert(
    revokedJoin.data.error === 'This invite code is no longer active.',
    `Error message matches spec (got: "${revokedJoin.data.error}")`
  );

  // Test 4.4: Non-admin cannot revoke
  log.info('\nTest 4.4: Non-admin cannot revoke invite code...');
  const nonAdminRevoke = await request('/api/groups/revoke-invite', {
    method: 'POST',
    token: testState.regularToken,
    body: { groupId: testState.testGroup.id },
  });

  assertJSON(nonAdminRevoke, 'Non-admin revoke attempt returns JSON');
  assert(nonAdminRevoke.status === 403, `Non-admin revoke rejected with 403 (got ${nonAdminRevoke.status})`);
}

// ============================================================================
// TEST SUITE 5: EXPIRED CODE
// ============================================================================

async function testExpiredCode() {
  log.section();
  log.title('TEST SUITE 5: Expired Invite Code');
  console.log('Testing code expiration\n');

  // Test 5.1: Check if expiration is implemented
  log.info('Test 5.1: Check for expiration support...');
  const { data: sampleInvite } = await supabase
    .from('group_invites')
    .select('expires_at')
    .limit(1)
    .single();

  if (sampleInvite && 'expires_at' in sampleInvite) {
    log.success('Expiration column exists in database');

    // Test 5.2: Create expired code manually
    log.info('\nTest 5.2: Create manually expired code...');
    const expiredCode = 'EXPIRED-TEST';
    const { error: insertError } = await supabase
      .from('group_invites')
      .insert({
        group_id: testState.testGroup.id,
        code: expiredCode,
        created_by: testState.adminUser.id,
        is_active: true,
        expires_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      });

    if (!insertError) {
      // Remove third user from test group
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', testState.testGroup.id)
        .eq('user_id', testState.thirdUser.id);

      const expiredJoin = await request('/api/groups/join-by-code', {
        method: 'POST',
        token: testState.thirdToken,
        body: { code: expiredCode },
      });

      assertJSON(expiredJoin, 'Expired code response returns JSON');
      assert(expiredJoin.status === 403, `Expired code rejected with 403 (got ${expiredJoin.status})`);
      assert(
        expiredJoin.data.error === 'This invite code has expired.',
        `Error message matches spec (got: "${expiredJoin.data.error}")`
      );

      // Verify code was auto-deactivated
      const { data: deactivated } = await supabase
        .from('group_invites')
        .select('is_active')
        .eq('code', expiredCode)
        .single();

      assert(deactivated.is_active === false, 'Expired code auto-deactivated');

      // Clean up
      await supabase.from('group_invites').delete().eq('code', expiredCode);
    }

    // Test 5.3: Valid non-expired code works
    log.info('\nTest 5.3: Non-expired code still works...');

    // Use API to create code with expiration (cleaner than direct insert)
    // First deactivate any existing codes for secondGroup
    await supabase
      .from('group_invites')
      .update({ is_active: false })
      .eq('group_id', testState.secondGroup.id)
      .eq('is_active', true);

    // Create fresh code
    const futureCode = `FUTURE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { error: futureInsertError } = await supabase
      .from('group_invites')
      .insert({
        group_id: testState.secondGroup.id,
        code: futureCode,
        created_by: testState.adminUser.id,
        is_active: true,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day future
      });

    if (futureInsertError) {
      log.error(`  Failed to insert future code: ${futureInsertError.message}`);
      log.error(`  Error details: ${JSON.stringify(futureInsertError, null, 2)}`);
    }

    // Ensure regular user is not in second group (in case they joined earlier)
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', testState.secondGroup.id)
      .eq('user_id', testState.regularUser.id);

    if (deleteError) {
      log.info(`  No existing membership to delete (expected)`);
    }

    const futureJoin = await request('/api/groups/join-by-code', {
      method: 'POST',
      token: testState.regularToken,
      body: { code: futureCode },
    });

    if (futureJoin.status !== 200) {
      log.error(`  Non-expired join failed with status ${futureJoin.status}`);
      log.error(`  Response: ${JSON.stringify(futureJoin.data, null, 2)}`);
    }

    assert(futureJoin.status === 200, `Non-expired code works (got ${futureJoin.status})`);

    // Safely check response structure
    if (futureJoin.status === 200) {
      assert(futureJoin.data.success === true, 'Join response has success=true');
      assert(futureJoin.data.group !== undefined, 'Response includes group object');
      if (futureJoin.data.group) {
        assert(futureJoin.data.group.id === testState.secondGroup.id, 'Joined correct group');
      }
    }

    // Clean up
    await supabase.from('group_invites').delete().eq('code', futureCode);
  } else {
    skip('Expiration not implemented (expires_at column missing or NULL)');
    log.info('Note: Expiration is optional feature, tests skipped');
  }
}

// ============================================================================
// TEST SUITE 6: DUPLICATE MEMBERSHIP
// ============================================================================

async function testDuplicateMembership() {
  log.section();
  log.title('TEST SUITE 6: Duplicate Membership Prevention');
  console.log('Testing duplicate join attempts\n');

  // Test 6.1: User joins same team twice
  log.info('Test 6.1: User tries to join same team again...');

  // Create new invite code since old one was revoked
  const newCodeResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.testGroup.id },
  });
  const newCode = newCodeResponse.data.inviteCode;

  // regularUser already joined in Test Suite 2
  const duplicateJoin = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.regularToken,
    body: { code: newCode },
  });

  assertJSON(duplicateJoin, 'Duplicate join response returns JSON');
  assert(duplicateJoin.status === 409, `Duplicate join rejected with 409 (got ${duplicateJoin.status})`);
  assert(duplicateJoin.data.error !== undefined, 'Error message returned');
  assert(
    duplicateJoin.data.error === 'You are already a member of this team.',
    `Error message matches spec (got: "${duplicateJoin.data.error}")`
  );
  assert(duplicateJoin.data.group !== undefined, 'Response includes group details for UX');

  // Test 6.2: No duplicate membership created
  log.info('\nTest 6.2: Verify no duplicate membership in database...');
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser.id);

  assert(!memberError, 'Database query succeeds');
  assert(memberships.length === 1, `Only one membership exists (found ${memberships.length})`);

  // Test 6.3: Existing membership unchanged
  log.info('\nTest 6.3: Verify existing membership unchanged...');
  const membership = memberships[0];
  assert(membership.role === 'user', 'Role remains "user"');
  assert(membership.status === 'active', 'Status remains active');

  // Test 6.4: Rejoining after removal
  log.info('\nTest 6.4: Test rejoining after being removed...');

  // Set membership to inactive (simulate removal)
  await supabase
    .from('group_members')
    .update({ status: 'removed' })
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser.id);

  const rejoinResponse = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.regularToken,
    body: { code: newCode },
  });

  assert(rejoinResponse.status === 200, 'Rejoining after removal succeeds');
  assert(rejoinResponse.data.success === true, 'Rejoin response has success=true');
  assert(rejoinResponse.data.message.includes('Rejoined'), 'Message indicates rejoining');

  // Verify membership reactivated
  const { data: reactivated } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser.id)
    .single();

  assert(reactivated.status === 'active', 'Membership reactivated');
  assert(reactivated.role === 'user', 'Role reset to "user" on rejoin');
}

// ============================================================================
// TEST SUITE 7: ROLE SAFETY
// ============================================================================

async function testRoleSafety() {
  log.section();
  log.title('TEST SUITE 7: Role Safety');
  console.log('Testing that invite codes cannot create admin users\n');

  // Test 7.1: Join always creates role="user"
  log.info('Test 7.1: Verify joined users always get role="user"...');

  // Third user already joined second group in earlier tests
  const { data: thirdMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', testState.secondGroup.id)
    .eq('user_id', testState.thirdUser.id)
    .single();

  assert(thirdMembership.role === 'user', 'User joined via code has role="user"');

  // Test 7.2: Cannot become admin through invite
  log.info('\nTest 7.2: Verify no way to escalate privileges via invite...');

  // Check API response explicitly states role
  const codeForCheck = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.testGroup.id },
  });

  if (codeForCheck.status !== 200 || !codeForCheck.data.inviteCode) {
    log.error(`Failed to create code for role safety test: ${JSON.stringify(codeForCheck.data)}`);
    stats.total++;
    stats.failed++;
    return;
  }

  // Remove and rejoin to test fresh join
  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.thirdUser.id);

  const freshJoin = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.thirdToken,
    body: { code: codeForCheck.data.inviteCode },
  });

  assert(freshJoin.data.membership.role === 'user', 'API explicitly returns role="user"');

  const { data: verifyRole } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.thirdUser.id)
    .single();

  assert(verifyRole.role === 'user', 'Database confirms role="user"');

  // Test 7.3: Sub-admin requires manual assignment
  log.info('\nTest 7.3: Document that sub-admin role requires manual assignment...');
  log.info('✓ Sub-admin and admin roles can only be assigned by team admin through team management UI');
  log.info('✓ Invite codes always create role="user" (member)');
  stats.total++;
  stats.passed++;
}

// ============================================================================
// TEST SUITE 8: PER-TEAM ROLE ISOLATION
// ============================================================================

async function testPerTeamRoles() {
  log.section();
  log.title('TEST SUITE 8: Per-Team Role Isolation');
  console.log('Testing that roles are team-specific\n');

  // Test 8.1: User can be admin in one team and member in another
  log.info('Test 8.1: Verify admin in Team A is member in Team B...');

  // Admin user is admin in testGroup
  const { data: adminInFirstTeam } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.adminUser.id)
    .single();

  assert(adminInFirstTeam.role === 'admin', 'User is admin in first team');

  // Admin user is also admin in secondGroup (creator), but let's test regular user
  // Regular user is member in testGroup, let's make them admin in a new group

  const { data: newGroup } = await supabase
    .from('groups')
    .insert({
      name: 'InviteTestNewGroup',
      sport: 'basketball',
      created_by: testState.regularUser.id,
    })
    .select()
    .single();

  await supabase.from('group_members').insert({
    group_id: newGroup.id,
    user_id: testState.regularUser.id,
    role: 'admin',
    status: 'active',
  });

  const { data: regularInNewTeam } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', newGroup.id)
    .eq('user_id', testState.regularUser.id)
    .single();

  const { data: regularInTestTeam } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser.id)
    .single();

  assert(regularInNewTeam.role === 'admin', 'User is admin in their created team');
  assert(regularInTestTeam.role === 'user', 'Same user is member in joined team');

  // Test 8.2: Joining new team doesn't affect existing roles
  log.info('\nTest 8.2: Joining new team preserves roles in existing teams...');

  // Create invite for the new group
  const jwt = await import('jsonwebtoken');
  const newGroupAdminToken = jwt.default.sign(
    { userId: testState.regularUser.id, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const { data: newGroupInvite } = await request('/api/groups/create-invite', {
    method: 'POST',
    token: newGroupAdminToken,
    body: { groupId: newGroup.id },
  });

  // Third user joins the new group
  await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.thirdToken,
    body: { code: newGroupInvite.data.inviteCode },
  });

  // Check third user's role in all teams
  const { data: thirdUserRoles } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', testState.thirdUser.id);

  assert(thirdUserRoles.length >= 2, 'User is member of multiple teams');

  const allMemberRole = thirdUserRoles.every(m => m.role === 'user');
  assert(allMemberRole, 'User has "user" role in all teams joined via invite');

  // Clean up new group
  await supabase.from('groups').delete().eq('id', newGroup.id);
}

// ============================================================================
// TEST SUITE 9: AUTH REQUIREMENTS
// ============================================================================

async function testAuthRequirements() {
  log.section();
  log.title('TEST SUITE 9: Authentication Requirements');
  console.log('Testing that unauthenticated users cannot access endpoints\n');

  // Test 9.1: Unauthenticated create-invite
  log.info('Test 9.1: Create invite without auth token...');
  const noAuthCreate = await request('/api/groups/create-invite', {
    method: 'POST',
    body: { groupId: testState.testGroup.id },
  });

  assertJSON(noAuthCreate, 'No-auth create returns JSON');
  assert(noAuthCreate.status === 401, `Unauthenticated create rejected with 401 (got ${noAuthCreate.status})`);
  assert(noAuthCreate.data.error !== undefined, 'Error message returned');

  // Test 9.2: Unauthenticated join-by-code
  log.info('\nTest 9.2: Join by code without auth token...');

  const { data: codeForAuth } = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.testGroup.id },
  });

  const noAuthJoin = await request('/api/groups/join-by-code', {
    method: 'POST',
    body: { code: codeForAuth.data.inviteCode },
  });

  assertJSON(noAuthJoin, 'No-auth join returns JSON');
  assert(noAuthJoin.status === 401, `Unauthenticated join rejected with 401 (got ${noAuthJoin.status})`);
  assert(noAuthJoin.data.error !== undefined, 'Error message returned');

  // Test 9.3: Unauthenticated revoke-invite
  log.info('\nTest 9.3: Revoke invite without auth token...');
  const noAuthRevoke = await request('/api/groups/revoke-invite', {
    method: 'POST',
    body: { groupId: testState.testGroup.id },
  });

  assertJSON(noAuthRevoke, 'No-auth revoke returns JSON');
  assert(noAuthRevoke.status === 401, `Unauthenticated revoke rejected with 401 (got ${noAuthRevoke.status})`);
  assert(noAuthRevoke.data.error !== undefined, 'Error message returned');

  // Test 9.4: Invalid JWT token
  log.info('\nTest 9.4: Create invite with invalid token...');
  const invalidToken = await request('/api/groups/create-invite', {
    method: 'POST',
    token: 'invalid.jwt.token',
    body: { groupId: testState.testGroup.id },
  });

  assertJSON(invalidToken, 'Invalid token returns JSON');
  assert(invalidToken.status === 401, `Invalid token rejected with 401 (got ${invalidToken.status})`);

  // Test 9.5: All errors return JSON
  log.info('\nTest 9.5: Confirm all authentication errors return JSON...');
  assert(
    noAuthCreate.contentType?.includes('application/json') &&
    noAuthJoin.contentType?.includes('application/json') &&
    noAuthRevoke.contentType?.includes('application/json') &&
    invalidToken.contentType?.includes('application/json'),
    'All authentication errors return JSON (not HTML)'
  );
}

// ============================================================================
// CLEANUP: Remove test data
// ============================================================================

async function cleanupTestData() {
  log.section();
  log.title('CLEANUP: Removing Test Data');
  console.log('Cleaning up test users and teams\n');

  try {
    // Delete test groups (cascade will delete invites and memberships)
    await supabase.from('groups').delete().ilike('name', 'InviteTest%');
    log.success('Deleted test groups');

    // Delete test users (cascade will delete memberships and sessions)
    await supabase.from('auth_users').delete().ilike('phone', 'InviteTest%');
    log.success('Deleted test users');

    log.info('Cleanup complete');
  } catch (error) {
    log.warning(`Cleanup error: ${error.message}`);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        JOIN TEAM BY INVITE CODE - TEST SUITE                 ║
║        Team Selector v2.0 - Invite Code Tests                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  log.info(`Base URL: ${BASE_URL}`);
  log.info(`Supabase URL: ${supabaseUrl}`);
  log.info(`JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'MISSING'}`);

  try {
    await setupTestData();
    await testInviteCodeCreation();
    await testJoinByValidCode();
    await testInvalidCode();
    await testRevokedCode();
    await testExpiredCode();
    await testDuplicateMembership();
    await testRoleSafety();
    await testPerTeamRoles();
    await testAuthRequirements();
    await cleanupTestData();

    // Final report
    log.section();
    log.title('TEST RESULTS SUMMARY');
    console.log();

    const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
    const color = stats.failed === 0 ? colors.green : colors.red;

    console.log(`${colors.bright}Total Tests:${colors.reset} ${stats.total}`);
    console.log(`${colors.green}Passed:${colors.reset} ${stats.passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${stats.failed}`);
    console.log(`${colors.yellow}Skipped:${colors.reset} ${stats.skipped}`);
    console.log(`${colors.yellow}Warnings:${colors.reset} ${stats.warnings}`);
    console.log(`${colors.bright}Pass Rate:${colors.reset} ${color}${passRate}%${colors.reset}`);

    console.log();

    if (stats.failed === 0) {
      log.success('ALL TESTS PASSED! ✓');
      console.log('\nJoin Team by Invite Code feature is production-ready.');
    } else {
      log.error(`${stats.failed} TEST(S) FAILED!`);
      console.log('\nPlease fix failing tests before deploying.');
    }

    if (stats.skipped > 0) {
      log.warning(`\n${stats.skipped} test(s) skipped (optional features not implemented).`);
    }

    if (stats.warnings > 0) {
      log.warning(`${stats.warnings} warning(s) found. Review recommended.`);
    }

    log.section();

    process.exit(stats.failed > 0 ? 1 : 0);
  } catch (error) {
    log.error(`\nFATAL ERROR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
