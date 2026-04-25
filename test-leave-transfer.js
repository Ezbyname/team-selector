/**
 * Test Suite: Leave Team & Transfer Ownership
 *
 * Tests admin exit prevention and ownership transfer workflows
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const API_BASE_URL = 'http://localhost:3000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test state
const testState = {
  adminUser: null,
  regularUser1: null,
  regularUser2: null,
  adminToken: null,
  regularToken1: null,
  regularToken2: null,
  testGroup: null,
  testSport: 'basketball'
};

// Helper: Make HTTP request
async function request(path, options = {}) {
  const { method = 'GET', token, body } = options;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config);
  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

// Helper: Create test user
async function createTestUser(phone, phoneNormalized) {
  const { data: existingUser } = await supabase
    .from('auth_users')
    .select('id')
    .eq('phone', phone)
    .single();

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error } = await supabase
    .from('auth_users')
    .insert({
      phone,
      phone_normalized: phoneNormalized,
      password_hash: 'test_hash'
    })
    .select()
    .single();

  if (error) throw error;
  return newUser;
}

// Helper: Generate JWT
function generateToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '24h' });
}

// Helper: Assert
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
}

// ============================================================
// Setup & Teardown
// ============================================================

async function setup() {
  console.log('\n🔧 Setting up test environment...\n');

  // Create test users
  testState.adminUser = await createTestUser('LeaveTestAdmin', '+972501111001');
  testState.regularUser1 = await createTestUser('LeaveTestUser1', '+972502222001');
  testState.regularUser2 = await createTestUser('LeaveTestUser2', '+972503333001');

  testState.adminToken = generateToken(testState.adminUser.id);
  testState.regularToken1 = generateToken(testState.regularUser1.id);
  testState.regularToken2 = generateToken(testState.regularUser2.id);

  // Create test group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: 'Leave Test Team',
      sport: testState.testSport,
      created_by: testState.adminUser.id
    })
    .select()
    .single();

  if (groupError) throw groupError;
  testState.testGroup = group;

  console.log('✅ Test environment ready');
}

async function teardown() {
  console.log('\n🧹 Cleaning up test data...\n');

  // Delete group members
  if (testState.testGroup) {
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', testState.testGroup.id);

    // Delete group
    await supabase
      .from('groups')
      .delete()
      .eq('id', testState.testGroup.id);
  }

  // Delete test users
  const userIds = [
    testState.adminUser?.id,
    testState.regularUser1?.id,
    testState.regularUser2?.id
  ].filter(Boolean);

  // Delete test users by phone pattern
  await supabase
    .from('auth_users')
    .delete()
    .ilike('phone', 'LeaveTest%');

  console.log('✅ Cleanup complete');
}

// ============================================================
// Test Suites
// ============================================================

// Suite 1: Leave Team - Regular User
async function testRegularUserLeave() {
  console.log('Suite 1: Leave Team - Regular User');

  // Add regular user to team
  const { error: addError } = await supabase
    .from('group_members')
    .insert({
      group_id: testState.testGroup.id,
      user_id: testState.regularUser1.id,
      role: 'user',
      status: 'active'
    });

  if (addError) throw addError;

  // Test 1.1: Regular user can leave team
  const leaveResponse = await request('/api/groups/leave', {
    method: 'POST',
    token: testState.regularToken1,
    body: { groupId: testState.testGroup.id }
  });

  assert(leaveResponse.status === 200, `Test 1.1: Regular user can leave (got ${leaveResponse.status})`);
  assert(leaveResponse.data.success === true, 'Test 1.1: Response has success=true');
  console.log('  ✅ Test 1.1: Regular user can leave');

  // Test 1.2: Membership status is 'resigned'
  const { data: membership } = await supabase
    .from('group_members')
    .select('status')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser1.id)
    .single();

  assert(membership.status === 'resigned', `Test 1.2: Status is resigned (got ${membership.status})`);
  console.log('  ✅ Test 1.2: Status set to resigned');

  // Test 1.3: User no longer appears in active team list
  const myTeamsResponse = await request(`/api/groups/my-teams?sport=${testState.testSport}`, {
    token: testState.regularToken1
  });

  const userTeams = myTeamsResponse.data.teams || [];
  const hasTeam = userTeams.some(t => t.id === testState.testGroup.id);

  assert(!hasTeam, 'Test 1.3: Resigned user not in my-teams');
  console.log('  ✅ Test 1.3: Resigned user excluded from my-teams');

  // Test 1.4: Cannot leave again (not an active member)
  const leaveAgainResponse = await request('/api/groups/leave', {
    method: 'POST',
    token: testState.regularToken1,
    body: { groupId: testState.testGroup.id }
  });

  assert(leaveAgainResponse.status === 404, `Test 1.4: Cannot leave twice (got ${leaveAgainResponse.status})`);
  assert(leaveAgainResponse.data.success === false, 'Test 1.4: Response has success=false');
  console.log('  ✅ Test 1.4: Cannot leave twice');

  console.log('');
}

// Suite 2: Leave Team - Sub-Admin
async function testSubAdminLeave() {
  console.log('Suite 2: Leave Team - Sub-Admin');

  // Add sub-admin to team
  const { error: addError } = await supabase
    .from('group_members')
    .insert({
      group_id: testState.testGroup.id,
      user_id: testState.regularUser2.id,
      role: 'sub_admin',
      status: 'active'
    });

  if (addError) throw addError;

  // Test 2.1: Sub-admin can leave team
  const leaveResponse = await request('/api/groups/leave', {
    method: 'POST',
    token: testState.regularToken2,
    body: { groupId: testState.testGroup.id }
  });

  assert(leaveResponse.status === 200, `Test 2.1: Sub-admin can leave (got ${leaveResponse.status})`);
  assert(leaveResponse.data.success === true, 'Test 2.1: Response has success=true');
  console.log('  ✅ Test 2.1: Sub-admin can leave');

  // Test 2.2: Membership status is 'resigned'
  const { data: membership } = await supabase
    .from('group_members')
    .select('status')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser2.id)
    .single();

  assert(membership.status === 'resigned', `Test 2.2: Status is resigned (got ${membership.status})`);
  console.log('  ✅ Test 2.2: Status set to resigned');

  console.log('');
}

// Suite 3: Leave Team - Sole Admin (BLOCKED)
async function testSoleAdminCannotLeave() {
  console.log('Suite 3: Leave Team - Sole Admin (BLOCKED)');

  // Test 3.1: Sole admin cannot leave
  const leaveResponse = await request('/api/groups/leave', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.testGroup.id }
  });

  assert(leaveResponse.status === 403, `Test 3.1: Sole admin blocked (got ${leaveResponse.status})`);
  assert(leaveResponse.data.success === false, 'Test 3.1: Response has success=false');
  assert(
    leaveResponse.data.error.includes('only admin'),
    `Test 3.1: Error mentions sole admin (got: ${leaveResponse.data.error})`
  );
  console.log('  ✅ Test 3.1: Sole admin cannot leave');

  // Test 3.2: Verify group still exists and owner unchanged
  const { data: groupCheck } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', testState.testGroup.id)
    .single();

  assert(groupCheck.created_by === testState.adminUser.id, 'Test 3.2: Owner unchanged');
  console.log('  ✅ Test 3.2: Group owner unchanged');

  console.log('');
}

// Suite 4: Transfer Ownership
async function testTransferOwnership() {
  console.log('Suite 4: Transfer Ownership');

  // Add regular user back as active member
  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser1.id);

  const { error: addError } = await supabase
    .from('group_members')
    .insert({
      group_id: testState.testGroup.id,
      user_id: testState.regularUser1.id,
      role: 'user',
      status: 'active'
    });

  if (addError) throw addError;

  // Test 4.1: Admin can transfer ownership to active member
  const transferResponse = await request('/api/groups/transfer-ownership', {
    method: 'POST',
    token: testState.adminToken,
    body: {
      groupId: testState.testGroup.id,
      targetUserId: testState.regularUser1.id
    }
  });

  assert(transferResponse.status === 200, `Test 4.1: Transfer succeeds (got ${transferResponse.status})`);
  assert(transferResponse.data.success === true, 'Test 4.1: Response has success=true');
  console.log('  ✅ Test 4.1: Ownership transferred');

  // Test 4.2: Target user is now admin in membership
  const { data: newAdminMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser1.id)
    .single();

  assert(newAdminMembership.role === 'admin', `Test 4.2: New admin role in membership (got ${newAdminMembership.role})`);
  console.log('  ✅ Test 4.2: Target user has admin role in membership');

  // Test 4.3: Target user is now owner (created_by)
  const { data: groupAfterTransfer } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', testState.testGroup.id)
    .single();

  assert(groupAfterTransfer.created_by === testState.regularUser1.id, `Test 4.3: Ownership transferred (got ${groupAfterTransfer.created_by})`);
  console.log('  ✅ Test 4.3: Group ownership transferred in database');

  console.log('');
}

// Suite 5: Transfer Ownership - Error Cases
async function testTransferOwnershipErrors() {
  console.log('Suite 5: Transfer Ownership - Error Cases');

  // Reset: Make regularUser1 the sole admin
  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', testState.testGroup.id);

  const { error: addError } = await supabase
    .from('group_members')
    .insert({
      group_id: testState.testGroup.id,
      user_id: testState.regularUser1.id,
      role: 'admin',
      status: 'active'
    });

  if (addError) throw addError;

  // Add another regular user
  await supabase
    .from('group_members')
    .insert({
      group_id: testState.testGroup.id,
      user_id: testState.regularUser2.id,
      role: 'user',
      status: 'active'
    });

  // Test 5.1: Non-admin cannot transfer ownership
  const nonAdminTransfer = await request('/api/groups/transfer-ownership', {
    method: 'POST',
    token: testState.regularToken2,
    body: {
      groupId: testState.testGroup.id,
      targetUserId: testState.adminUser.id
    }
  });

  assert(nonAdminTransfer.status === 403, `Test 5.1: Non-admin blocked (got ${nonAdminTransfer.status})`);
  assert(nonAdminTransfer.data.success === false, 'Test 5.1: Response has success=false');
  console.log('  ✅ Test 5.1: Non-admin cannot transfer');

  // Test 5.2: Cannot transfer to non-member
  const nonMemberTransfer = await request('/api/groups/transfer-ownership', {
    method: 'POST',
    token: testState.regularToken1,
    body: {
      groupId: testState.testGroup.id,
      targetUserId: testState.adminUser.id  // Not a member
    }
  });

  assert(nonMemberTransfer.status === 404, `Test 5.2: Non-member blocked (got ${nonMemberTransfer.status})`);
  assert(nonMemberTransfer.data.success === false, 'Test 5.2: Response has success=false');
  console.log('  ✅ Test 5.2: Cannot transfer to non-member');

  // Test 5.3: Cannot transfer to resigned member
  await supabase
    .from('group_members')
    .update({ status: 'resigned' })
    .eq('group_id', testState.testGroup.id)
    .eq('user_id', testState.regularUser2.id);

  const resignedTransfer = await request('/api/groups/transfer-ownership', {
    method: 'POST',
    token: testState.regularToken1,
    body: {
      groupId: testState.testGroup.id,
      targetUserId: testState.regularUser2.id
    }
  });

  assert(resignedTransfer.status === 404, `Test 5.3: Resigned member blocked (got ${resignedTransfer.status})`);
  assert(resignedTransfer.data.success === false, 'Test 5.3: Response has success=false');
  console.log('  ✅ Test 5.3: Cannot transfer to resigned member');

  // Test 5.4: Cannot transfer to self
  const selfTransfer = await request('/api/groups/transfer-ownership', {
    method: 'POST',
    token: testState.regularToken1,
    body: {
      groupId: testState.testGroup.id,
      targetUserId: testState.regularUser1.id
    }
  });

  assert(selfTransfer.status === 400, `Test 5.4: Self-transfer blocked (got ${selfTransfer.status})`);
  assert(selfTransfer.data.success === false, 'Test 5.4: Response has success=false');
  console.log('  ✅ Test 5.4: Cannot transfer to self');

  console.log('');
}

// ============================================================
// Test Runner
// ============================================================

async function runTests() {
  console.log('========================================');
  console.log('🧪 Leave Team & Transfer Ownership Tests');
  console.log('========================================');

  let passCount = 0;
  let failCount = 0;

  try {
    await setup();

    // Run test suites
    const suites = [
      testRegularUserLeave,
      testSubAdminLeave,
      testSoleAdminCannotLeave,
      testTransferOwnership,
      testTransferOwnershipErrors
    ];

    for (const suite of suites) {
      try {
        await suite();
        passCount++;
      } catch (error) {
        console.error(`\n❌ ${error.message}\n`);
        failCount++;
      }
    }

    await teardown();

  } catch (error) {
    console.error('\n❌ Test setup/teardown failed:', error.message);
    failCount++;
  }

  // Summary
  console.log('========================================');
  console.log('📊 Test Summary');
  console.log('========================================');
  console.log(`Total Suites: ${passCount + failCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Pass Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  console.log('========================================\n');

  process.exit(failCount > 0 ? 1 : 0);
}

runTests();
