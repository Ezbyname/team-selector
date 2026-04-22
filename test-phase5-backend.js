/**
 * Phase 5 Backend Integration Tests
 * Tests team generation API with real database
 */

import { supabase } from './lib/supabase.js';
import { normalizePhone } from './lib/phone.js';

const BASE_URL = 'http://localhost:3000';

const testUsers = {
  admin: { phone: '058-000-0000', password: 'AdminPass123!', token: null, id: null }
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

function test(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log(`✓ ${name}`, 'success');
  } else {
    results.failed++;
    log(`✗ ${name}`, 'error');
    if (details) log(`  ${details}`, 'error');
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
    if (error.code === 'ECONNREFUSED') {
      log('\n✗ ERROR: Dev server is not running!', 'error');
      log('  Start the server with: vercel dev', 'error');
      process.exit(1);
    }
    return { status: 0, error: error.message, data: { error: error.message } };
  }
}

async function cleanup() {
  log('\nCleaning up test data...', 'info');

  // Delete test groups
  await supabase.from('groups').delete().ilike('name', '%Phase5Test%');
  await supabase.from('permanent_groups').delete().ilike('name', '%Phase5Test%');

  // Delete test users
  for (const user of Object.values(testUsers)) {
    const phoneNormalized = normalizePhone(user.phone);
    const { data: userData } = await supabase
      .from('auth_users')
      .select('id')
      .eq('phone_normalized', phoneNormalized)
      .single();

    if (userData) {
      await supabase.from('player_ratings').delete().eq('graded_by', userData.id);
      await supabase.from('groups').delete().eq('created_by', userData.id);
      await supabase.from('permanent_groups').delete().eq('created_by', userData.id);
      await supabase.from('admin_actions').delete().eq('admin_id', userData.id);
    }
  }

  for (const user of Object.values(testUsers)) {
    const phoneNormalized = normalizePhone(user.phone);
    await supabase.from('auth_users').delete().eq('phone_normalized', phoneNormalized);
  }

  log('Cleanup complete\n', 'success');
}

async function setupTestUser() {
  log('Setting up test user...', 'info');

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
    } else if (adminReg.status === 409) {
      const phoneNormalized = normalizePhone(testUsers.admin.phone);
      const { data: existingUser } = await supabase
        .from('auth_users')
        .select('id')
        .eq('phone_normalized', phoneNormalized)
        .single();
      if (existingUser) testUsers.admin.id = existingUser.id;
    }

    if (testUsers.admin.id) {
      const phoneNormalized = normalizePhone(testUsers.admin.phone);
      await supabase
        .from('auth_users')
        .update({ role: 'admin', can_grade_players: true })
        .eq('phone_normalized', phoneNormalized);
    }
  }

  const adminLogin = await request('/api/auth/login', {
    body: { phone: testUsers.admin.phone, password: testUsers.admin.password }
  });

  if (adminLogin.status === 200) {
    testUsers.admin.token = adminLogin.data.accessToken;
    log('Test admin logged in\n', 'success');
  }
}

async function runTests() {
  log('\n=== PHASE 5 BACKEND VALIDATION ===\n', 'info');

  await cleanup();
  await setupTestUser();

  // Setup: Create group and players
  log('Setting up test group and players...', 'info');

  const createGroup = await request('/api/groups/create', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { name: 'Phase5Test Basketball', location: 'Test', sport: 'basketball' }
  });

  testData.groupId = createGroup.data.group?.id;

  // Add 10 players with varied ratings
  const players = [
    { name: 'Player A', position: 'Guard', defaultRating: 8 },
    { name: 'Player B', position: 'Guard', defaultRating: 7 },
    { name: 'Player C', position: 'Forward', defaultRating: 9 },
    { name: 'Player D', position: 'Forward', defaultRating: 6 },
    { name: 'Player E', position: 'Center', defaultRating: 8 },
    { name: 'Player F', position: 'Center', defaultRating: 7 },
    { name: 'Player G', position: 'Guard', defaultRating: 6 },
    { name: 'Player H', position: 'Forward', defaultRating: 7 },
    { name: 'Player I', position: 'Center', defaultRating: 5 },
    { name: 'Player J', position: 'Guard', defaultRating: 8 }
  ];

  for (const player of players) {
    const addPlayer = await request('/api/players/add', {
      headers: { Authorization: `Bearer ${testUsers.admin.token}` },
      body: { groupId: testData.groupId, ...player }
    });
    if (addPlayer.data.player?.id) {
      testData.playerIds.push(addPlayer.data.player.id);
    }
  }

  // Create session
  const createSession = await request('/api/sessions/create', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { groupId: testData.groupId }
  });

  testData.sessionId = createSession.data.session?.id;

  // Select all 10 players for session
  await request('/api/sessions/select-players', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { sessionId: testData.sessionId, playerIds: testData.playerIds }
  });

  log('Setup complete\n', 'success');

  // TEST 1: Generate teams for existing session
  log('TEST 1: Generate teams for existing session', 'info');

  const generate1 = await request('/api/sessions/generate-teams', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { sessionId: testData.sessionId, teamSize: 5 }
  });

  console.log('Generate1 result:', {
    status: generate1.status,
    data: JSON.stringify(generate1.data, null, 2)
  });

  test('Generate teams succeeds', generate1.status === 200,
    generate1.status !== 200 ? `Got status ${generate1.status}: ${JSON.stringify(generate1.data)}` : '');
  test('Response has 2 teams', generate1.data.teams?.length === 2);
  test('Team 1 has 5 players', generate1.data.teams?.[0]?.players.length === 5);
  test('Team 2 has 5 players', generate1.data.teams?.[1]?.players.length === 5);
  test('No bench (all playing)', generate1.data.bench?.length === 0);
  test('Ratings within ±5', generate1.data.balance?.ratingDifference <= 5,
    `Rating diff: ${generate1.data.balance?.ratingDifference}`);

  log('');

  // TEST 2: Bench handling (11 players, teamSize 5)
  log('TEST 2: Bench handling', 'info');

  // Add 1 more player
  const extraPlayer = await request('/api/players/add', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { groupId: testData.groupId, name: 'Player K', position: 'Guard', defaultRating: 6 }
  });

  const extraPlayerId = extraPlayer.data.player?.id;
  testData.playerIds.push(extraPlayerId);

  // Update session roster
  await request('/api/sessions/select-players', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { sessionId: testData.sessionId, playerIds: testData.playerIds }
  });

  const generate2 = await request('/api/sessions/generate-teams', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { sessionId: testData.sessionId, teamSize: 5 }
  });

  test('11 players: Each team has 5',
    generate2.data.teams?.[0]?.players.length === 5 && generate2.data.teams?.[1]?.players.length === 5);
  test('11 players: 1 on bench', generate2.data.bench?.length === 1);

  log('');

  // TEST 3: Regenerate gives different result
  log('TEST 3: Regenerate randomness', 'info');

  const generate3a = await request('/api/sessions/generate-teams', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { sessionId: testData.sessionId, teamSize: 5 }
  });

  const generate3b = await request('/api/sessions/generate-teams', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { sessionId: testData.sessionId, teamSize: 5 }
  });

  const team1a = JSON.stringify(generate3a.data.teams[0].players.map(p => p.id).sort());
  const team1b = JSON.stringify(generate3b.data.teams[0].players.map(p => p.id).sort());

  test('Regenerate produces different teams', team1a !== team1b);

  log('');

  // TEST 4: Error - session not found
  log('TEST 4: Error handling', 'info');

  const generate4 = await request('/api/sessions/generate-teams', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { sessionId: '00000000-0000-0000-0000-000000000000', teamSize: 5 }
  });

  test('Invalid sessionId returns 404', generate4.status === 404);

  log('');

  // TEST 5: Grade some players and verify mixed graded/ungraded
  log('TEST 5: Mixed graded/ungraded players', 'info');

  // Grade first 3 players
  await request('/api/players/grade', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { playerId: testData.playerIds[0], grade: 9 }
  });

  await request('/api/players/grade', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { playerId: testData.playerIds[1], grade: 8 }
  });

  await request('/api/players/grade', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { playerId: testData.playerIds[2], grade: 10 }
  });

  const generate5 = await request('/api/sessions/generate-teams', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { sessionId: testData.sessionId, teamSize: 5 }
  });

  const allPlayers = [...generate5.data.teams[0].players, ...generate5.data.teams[1].players, ...generate5.data.bench];
  const gradedPlayer = allPlayers.find(p => p.id === testData.playerIds[0]);
  const ungradedPlayer = allPlayers.find(p => p.id === testData.playerIds[3]);

  console.log('Graded player:', { id: gradedPlayer?.id, name: gradedPlayer?.name, defaultRating: gradedPlayer?.defaultRating, finalRating: gradedPlayer?.finalRating });
  console.log('Ungraded player:', { id: ungradedPlayer?.id, name: ungradedPlayer?.name, defaultRating: ungradedPlayer?.defaultRating, finalRating: ungradedPlayer?.finalRating });

  test('Graded player uses finalRating (9)', gradedPlayer?.finalRating === 9,
    gradedPlayer?.finalRating !== 9 ? `Got ${gradedPlayer?.finalRating}, expected 9` : '');
  test('Ungraded player uses defaultRating (not 5)', ungradedPlayer?.finalRating === ungradedPlayer?.defaultRating && ungradedPlayer?.finalRating !== 5,
    `Got finalRating=${ungradedPlayer?.finalRating}, defaultRating=${ungradedPlayer?.defaultRating}`);

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
    log('Phase 5 backend is working correctly.\n', 'success');
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
