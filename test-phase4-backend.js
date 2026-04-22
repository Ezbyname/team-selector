/**
 * Phase 4 Backend Validation Test Suite
 * Tests Groups, Players, Sessions with Rating Integration
 *
 * Prerequisites:
 * 1. Database migration 004 deployed
 * 2. Dev server running (vercel dev)
 * 3. Test admin user exists (created by phase 3 tests)
 */

import { supabase } from './lib/supabase.js';
import { normalizePhone } from './lib/phone.js';

const BASE_URL = 'http://localhost:3000';

// Test users (reuse from phase 3)
const testUsers = {
  admin: { phone: '058-000-0000', password: 'AdminPass123!', token: null, id: null },
  regularUser: { phone: '058-222-2222', password: 'UserPass123!', token: null, id: null }
};

const testData = {
  groupId: null,
  sessionId: null,
  playerIds: []
};

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
  console.log(`${colors[type]}${message}\x1b[0m`);
}

function test(name, passed, details = '', debugData = null) {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log(`✓ ${name}`, 'success');
  } else {
    results.failed++;
    log(`✗ ${name}`, 'error');
    if (details) log(`  ${details}`, 'error');
    if (debugData) {
      log(`  Debug: ${JSON.stringify(debugData, null, 2)}`, 'warning');
    }
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      method: options.method || 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      log('\n✗ ERROR: Dev server is not running!', 'error');
      log('  Start the server with: vercel dev', 'error');
      log('  Then run this test again.\n', 'error');
      process.exit(1);
    }
    return { status: 0, error: error.message, data: { error: error.message } };
  }
}

async function cleanup() {
  log('\nCleaning up test data...', 'info');

  // Delete test groups by name pattern (cascades to players, sessions, etc.)
  await supabase.from('groups').delete().ilike('name', 'Test Group%');
  await supabase.from('groups').delete().ilike('name', '%Test%');
  await supabase.from('groups').delete().eq('location', 'Atlit');
  await supabase.from('permanent_groups').delete().ilike('name', 'Test Group%');
  await supabase.from('permanent_groups').delete().ilike('name', '%Test%');

  // Delete test users
  for (const user of Object.values(testUsers)) {
    const phoneNormalized = normalizePhone(user.phone);

    // Get user ID
    const { data: userData } = await supabase
      .from('auth_users')
      .select('id')
      .eq('phone_normalized', phoneNormalized)
      .single();

    if (userData) {
      // Delete player ratings by this user
      await supabase.from('player_ratings').delete().eq('graded_by', userData.id);

      // Delete groups created by this user (cascades to players, sessions, etc.)
      await supabase.from('groups').delete().eq('created_by', userData.id);

      // Delete admin actions
      await supabase.from('admin_actions').delete().eq('admin_id', userData.id);
      await supabase.from('admin_actions').delete().eq('target_user_id', userData.id);
    }
  }

  // Now delete test users (all FKs resolved)
  for (const user of Object.values(testUsers)) {
    const phoneNormalized = normalizePhone(user.phone);
    await supabase.from('auth_users').delete().eq('phone_normalized', phoneNormalized);
  }

  // Also delete grader2 user (created during Test 3.2)
  const grader2Phone = '058-333-3333';
  const grader2Norm = normalizePhone(grader2Phone);
  const { data: grader2Data } = await supabase
    .from('auth_users')
    .select('id')
    .eq('phone_normalized', grader2Norm)
    .single();

  if (grader2Data) {
    await supabase.from('player_ratings').delete().eq('graded_by', grader2Data.id);
    await supabase.from('admin_actions').delete().eq('admin_id', grader2Data.id);
    await supabase.from('auth_users').delete().eq('phone_normalized', grader2Norm);
  }

  log('Cleanup complete\n', 'success');
}

async function setupTestUsers() {
  log('Setting up test users...', 'info');

  // Register admin
  const adminOtp = await request('/api/auth/send-otp', {
    body: { phone: testUsers.admin.phone }
  });

  if (adminOtp.status === 200 && adminOtp.data.otpCode) {
    await request('/api/auth/verify-otp', {
      body: { phone: testUsers.admin.phone, code: adminOtp.data.otpCode }
    });

    const adminReg = await request('/api/auth/register', {
      body: {
        phone: testUsers.admin.phone,
        password: testUsers.admin.password,
        displayName: 'Test Admin'
      }
    });

    if (adminReg.status === 201) {
      testUsers.admin.id = adminReg.data.user.id;
      log(`Test admin registered (ID: ${testUsers.admin.id})`, 'info');
    } else if (adminReg.status === 409) {
      // User already exists, fetch ID
      const phoneNormalized = normalizePhone(testUsers.admin.phone);
      const { data: existingUser } = await supabase
        .from('auth_users')
        .select('id')
        .eq('phone_normalized', phoneNormalized)
        .single();

      if (existingUser) {
        testUsers.admin.id = existingUser.id;
        log(`Test admin already exists (ID: ${testUsers.admin.id})`, 'info');
      }
    } else {
      log(`Admin registration failed: ${adminReg.status} - ${JSON.stringify(adminReg.data)}`, 'error');
    }

    // Promote to admin (idempotent)
    if (testUsers.admin.id) {
      const phoneNormalized = normalizePhone(testUsers.admin.phone);
      await supabase
        .from('auth_users')
        .update({ role: 'admin', can_grade_players: true })
        .eq('phone_normalized', phoneNormalized);
    }
  }

  // Register regular user
  const userOtp = await request('/api/auth/send-otp', {
    body: { phone: testUsers.regularUser.phone }
  });

  if (userOtp.status === 200 && userOtp.data.otpCode) {
    await request('/api/auth/verify-otp', {
      body: { phone: testUsers.regularUser.phone, code: userOtp.data.otpCode }
    });

    const userReg = await request('/api/auth/register', {
      body: {
        phone: testUsers.regularUser.phone,
        password: testUsers.regularUser.password,
        displayName: 'Regular User'
      }
    });

    if (userReg.status === 201) {
      testUsers.regularUser.id = userReg.data.user.id;
      log(`Regular user registered`, 'info');
    }
  }

  log('Test users setup complete\n', 'success');
}

async function loginTestUsers() {
  log('Logging in test users...', 'info');

  const adminLogin = await request('/api/auth/login', {
    body: { phone: testUsers.admin.phone, password: testUsers.admin.password }
  });

  if (adminLogin.status === 200) {
    testUsers.admin.token = adminLogin.data.accessToken;
    // Decode token to verify user ID
    const tokenParts = adminLogin.data.accessToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      log(`Admin logged in - User ID in token: ${payload.sub}`, 'info');
      log(`Admin logged in - User ID from registration: ${testUsers.admin.id}`, 'info');
    } else {
      log(`Admin logged in`, 'info');
    }
  } else {
    log(`Admin login failed: ${adminLogin.status}`, 'error');
  }

  const userLogin = await request('/api/auth/login', {
    body: { phone: testUsers.regularUser.phone, password: testUsers.regularUser.password }
  });

  if (userLogin.status === 200) {
    testUsers.regularUser.token = userLogin.data.accessToken;
    log(`Regular user logged in\n`, 'info');
  }
}

async function runTests() {
  log('\n=== PHASE 4 BACKEND VALIDATION ===\n', 'info');

  await cleanup();
  await setupTestUsers();
  await loginTestUsers();

  // TEST SUITE 1: Group Management
  log('TEST SUITE 1: Group Management', 'info');

  // Test 1.1: Create group
  const createGroup = await request('/api/groups/create', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      name: 'Test Group Atlit',
      location: 'Atlit',
      sport: 'basketball'
    }
  });

  if (createGroup.status !== 201) {
    log(`  Create group failed: ${createGroup.status}`, 'error');
    log(`  Response: ${JSON.stringify(createGroup.data)}`, 'error');
  }

  test('Admin creates group', createGroup.status === 201);
  test('Group has ID', !!createGroup.data.group?.id);

  if (createGroup.data.group?.id) {
    testData.groupId = createGroup.data.group.id;
  }

  // Test 1.2: List groups
  const listGroups = await request('/api/groups/list', {
    method: 'GET',
    headers: { Authorization: `Bearer ${testUsers.admin.token}` }
  });
  test('List groups works', listGroups.status === 200,
    listGroups.status !== 200 ? `Got status ${listGroups.status}` : '',
    listGroups.status !== 200 ? listGroups.data : null);
  test('Group appears in list', listGroups.data.groups?.some(g => g.name === 'Test Group Atlit'),
    !listGroups.data.groups?.some(g => g.name === 'Test Group Atlit') ? 'Group not found in list' : '',
    !listGroups.data.groups?.some(g => g.name === 'Test Group Atlit') ? { groups: listGroups.data.groups } : null);

  log('');

  // TEST SUITE 2: Player Management
  log('TEST SUITE 2: Player Management', 'info');

  // Test 2.1: Add players with default rating (5)
  const players = [
    { name: 'Player A', position: 'Guard' },
    { name: 'Player B', position: 'Forward' },
    { name: 'Player C', position: 'Center' }
  ];

  for (const player of players) {
    const addPlayer = await request('/api/players/add', {
      headers: { Authorization: `Bearer ${testUsers.admin.token}` },
      body: {
        groupId: testData.groupId,
        name: player.name,
        position: player.position
      }
    });

    test(`Add ${player.name} with default rating`, addPlayer.status === 201,
      addPlayer.status !== 201 ? `Got status ${addPlayer.status}` : '',
      addPlayer.status !== 201 ? addPlayer.data : null);
    test(`${player.name} has default rating 5`, addPlayer.data.player?.defaultRating === 5,
      addPlayer.data.player?.defaultRating !== 5 ? `Got rating ${addPlayer.data.player?.defaultRating}` : '',
      addPlayer.data.player?.defaultRating !== 5 ? addPlayer.data : null);

    if (addPlayer.data.player?.id) {
      testData.playerIds.push(addPlayer.data.player.id);
    }
  }

  // Test 2.2: Add player with explicit rating
  const explicitRating = await request('/api/players/add', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      groupId: testData.groupId,
      name: 'Player D Elite',
      position: 'Guard',
      defaultRating: 9
    }
  });
  test('Add player with explicit rating 9', explicitRating.status === 201);
  test('Player has rating 9', explicitRating.data.player?.defaultRating === 9);

  if (explicitRating.data.player?.id) {
    testData.playerIds.push(explicitRating.data.player.id);
  }

  // Test 2.3: Reject invalid rating
  const invalidRating = await request('/api/players/add', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      groupId: testData.groupId,
      name: 'Player Invalid',
      defaultRating: 11
    }
  });
  test('Reject rating > 10', invalidRating.status === 400);

  // Test 2.4: List players
  const listPlayers = await request('/api/players/list', {
    method: 'GET',
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: null
  }, { groupId: testData.groupId });

  const listPlayersWithQuery = await fetch(
    `${BASE_URL}/api/players/list?groupId=${testData.groupId}`,
    {
      headers: { Authorization: `Bearer ${testUsers.admin.token}` }
    }
  ).then(r => r.json());

  test('List players works', listPlayersWithQuery.success === true);
  test('4 players in group', listPlayersWithQuery.players?.length === 4);

  log('');

  // TEST SUITE 3: Player Grading with Averaging
  log('TEST SUITE 3: Player Grading with Averaging', 'info');

  const playerToGrade = testData.playerIds[0]; // Player A

  // Test 3.1: Admin grades player (7)
  const grade1 = await request('/api/players/grade', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      playerId: playerToGrade,
      grade: 7
    }
  });

  console.log('Grade1 request result:', {
    status: grade1.status,
    data: JSON.stringify(grade1.data, null, 2)
  });

  test('Admin grades player with 7', grade1.status === 200,
    grade1.status !== 200 ? `Got status ${grade1.status}: ${JSON.stringify(grade1.data)}` : '');
  test('Final rating is 7 (single grader)', grade1.data.rating?.finalRating === 7,
    grade1.data.rating?.finalRating !== 7 ? `Got finalRating ${grade1.data.rating?.finalRating}` : '');

  // Test 3.2: Create second grader
  const grader2Phone = '058-333-3333';
  const grader2Otp = await request('/api/auth/send-otp', { body: { phone: grader2Phone } });

  console.log('Grader2 OTP result:', { status: grader2Otp.status, hasCode: !!grader2Otp.data.otpCode });

  if (grader2Otp.status === 200 && grader2Otp.data.otpCode) {
    await request('/api/auth/verify-otp', {
      body: { phone: grader2Phone, code: grader2Otp.data.otpCode }
    });

    const grader2Reg = await request('/api/auth/register', {
      body: {
        phone: grader2Phone,
        password: 'Grader123!',
        displayName: 'Grader Two'
      }
    });

    console.log('Grader2 registration result:', { status: grader2Reg.status });

    if (grader2Reg.status === 201 || grader2Reg.status === 409) {
      // Grant grading permission
      const phoneNorm = normalizePhone(grader2Phone);
      await supabase
        .from('auth_users')
        .update({ can_grade_players: true })
        .eq('phone_normalized', phoneNorm);

      // Login
      const grader2Login = await request('/api/auth/login', {
        body: { phone: grader2Phone, password: 'Grader123!' }
      });

      console.log('Grader2 login result:', { status: grader2Login.status, hasToken: !!grader2Login.data.accessToken });

      if (grader2Login.status === 200) {
        // Grade same player with 8
        const grade2 = await request('/api/players/grade', {
          headers: { Authorization: `Bearer ${grader2Login.data.accessToken}` },
          body: {
            playerId: playerToGrade,
            grade: 8
          }
        });

        console.log('Grade2 result:', {
          status: grade2.status,
          finalRating: grade2.data.rating?.finalRating,
          graderCount: grade2.data.rating?.graderCount,
          allGrades: grade2.data.rating?.allGrades
        });

        test('Second grader grades with 8', grade2.status === 200,
          grade2.status !== 200 ? `Got status ${grade2.status}: ${JSON.stringify(grade2.data)}` : '');
        test('Grader count is 2', grade2.data.rating?.graderCount === 2,
          grade2.data.rating?.graderCount !== 2 ? `Got count ${grade2.data.rating?.graderCount}` : '');
        // Average: (7 + 8) / 2 = 7.5 → ceiling = 8
        test('Final rating is 8 (avg 7.5 → ceiling)', grade2.data.rating?.finalRating === 8,
          grade2.data.rating?.finalRating !== 8 ? `Got finalRating ${grade2.data.rating?.finalRating}` : '');
      } else {
        console.log('Grader2 login failed, skipping multi-grader tests');
      }

      // Cleanup grader 2
      const grader2Norm = normalizePhone(grader2Phone);
      const { data: grader2Data } = await supabase
        .from('auth_users')
        .select('id')
        .eq('phone_normalized', grader2Norm)
        .single();

      if (grader2Data) {
        await supabase.from('admin_actions').delete().eq('admin_id', grader2Data.id);
        await supabase.from('auth_users').delete().eq('phone_normalized', grader2Norm);
      }
    } else {
      console.log('Grader2 registration failed, skipping multi-grader tests');
    }
  } else {
    console.log('Grader2 OTP failed, skipping multi-grader tests');
  }

  log('');

  // TEST SUITE 4: Game Sessions
  log('TEST SUITE 4: Game Sessions', 'info');

  // Test 4.1: Create session
  const createSession = await request('/api/sessions/create', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      groupId: testData.groupId,
      sessionDate: '2026-04-25'
    }
  });

  console.log('CreateSession result:', {
    status: createSession.status,
    data: JSON.stringify(createSession.data, null, 2)
  });

  test('Create game session', createSession.status === 201,
    createSession.status !== 201 ? `Got status ${createSession.status}: ${JSON.stringify(createSession.data)}` : '');
  test('Session has ID', !!createSession.data.session?.id,
    !createSession.data.session?.id ? `Session data: ${JSON.stringify(createSession.data)}` : '');

  if (createSession.data.session?.id) {
    testData.sessionId = createSession.data.session.id;
  }

  // Test 4.2: Select players for session (e.g., 3 out of 4)
  const selectedPlayers = testData.playerIds.slice(0, 3);
  const selectPlayers = await request('/api/sessions/select-players', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      sessionId: testData.sessionId,
      playerIds: selectedPlayers
    }
  });
  test('Select 3 players for session', selectPlayers.status === 200);
  test('Selected count is 3', selectPlayers.data.selectedCount === 3);

  // Test 4.3: Get session roster with ratings
  const getRoster = await fetch(
    `${BASE_URL}/api/sessions/roster?sessionId=${testData.sessionId}`,
    {
      headers: { Authorization: `Bearer ${testUsers.admin.token}` }
    }
  ).then(r => r.json());

  test('Get session roster', getRoster.success === true);
  test('Roster has 3 players', getRoster.roster?.length === 3);
  test('Player A has final rating 8 (graded)', getRoster.roster?.find(p => p.name === 'Player A')?.finalRating === 8);
  test('Player B has final rating 5 (default)', getRoster.roster?.find(p => p.name === 'Player B')?.finalRating === 5);

  log('');

  // TEST SUITE 5: Integration Validation
  log('TEST SUITE 5: Integration Validation', 'info');

  // Test 5.1: Add 30 players to simulate real group
  log('  Adding 30 players to test large group...', 'info');
  const largeGroupPlayers = [];

  for (let i = 1; i <= 30; i++) {
    const addPlayer = await request('/api/players/add', {
      headers: { Authorization: `Bearer ${testUsers.admin.token}` },
      body: {
        groupId: testData.groupId,
        name: `Player ${i}`,
        position: i % 3 === 0 ? 'Center' : i % 2 === 0 ? 'Forward' : 'Guard'
      }
    });

    if (addPlayer.status === 201) {
      largeGroupPlayers.push(addPlayer.data.player.id);
    }
  }

  test('Added 30 players to group', largeGroupPlayers.length === 30);

  // Test 5.2: List all players (should be 34 total: 4 initial + 30 new)
  const listAll = await fetch(
    `${BASE_URL}/api/players/list?groupId=${testData.groupId}`,
    {
      headers: { Authorization: `Bearer ${testUsers.admin.token}` }
    }
  ).then(r => r.json());

  test('Group has 34 total players', listAll.players?.length === 34);

  // Test 5.3: Select 15 players for new session (typical game day)
  const gameSession = await request('/api/sessions/create', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { groupId: testData.groupId }
  });

  const selectedForGame = largeGroupPlayers.slice(0, 15);
  const selectForGame = await request('/api/sessions/select-players', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      sessionId: gameSession.data.session.id,
      playerIds: selectedForGame
    }
  });

  test('Select 15 players for game session', selectForGame.status === 200);

  const gameDayRoster = await fetch(
    `${BASE_URL}/api/sessions/roster?sessionId=${gameSession.data.session.id}`,
    {
      headers: { Authorization: `Bearer ${testUsers.admin.token}` }
    }
  ).then(r => r.json());

  test('Game day roster has exactly 15 players', gameDayRoster.roster?.length === 15);
  test('All roster players have default rating 5', gameDayRoster.roster?.every(p => p.defaultRating === 5));

  log('');

  printResults();
}

function printResults() {
  log('\n=== TEST RESULTS ===', 'info');
  log(`Total Tests: ${results.passed + results.failed}`, 'info');
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
  log(`Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`,
      results.failed === 0 ? 'success' : 'warning');

  if (results.failed === 0) {
    log('✓ ALL TESTS PASSED!', 'success');
    log('Phase 4 backend is working correctly.\n', 'success');
    process.exit(0);
  } else {
    log('✗ SOME TESTS FAILED!', 'error');
    log('Review failures above.\n', 'error');
    process.exit(1);
  }
}

runTests().catch(error => {
  log(`\nUnexpected error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
