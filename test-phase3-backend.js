/**
 * Phase 3 Backend Validation Test Suite
 * Tests admin/grading system with multi-grader averaging + ceiling
 *
 * Prerequisites:
 * 1. Database migration 003 deployed
 * 2. Dev server running (vercel dev)
 * 3. Admin user registered (052-550-2281)
 * 4. Admin bootstrap run (set-admin.js)
 */

import { supabase } from './lib/supabase.js';
import { normalizePhone } from './lib/phone.js';

const BASE_URL = 'http://localhost:3000';

// Test users
// NOTE: Using a separate test admin (not 052-550-2281) to avoid conflicts
const testUsers = {
  admin: { phone: '058-000-0000', password: 'AdminPass123!', token: null, id: null },
  subAdmin: { phone: '058-111-1111', password: 'SubPass123!', token: null, id: null },
  regularUser: { phone: '058-222-2222', password: 'UserPass123!', token: null, id: null }
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
    return { status: 0, error: error.message };
  }
}

async function cleanup() {
  log('\nCleaning up test data...', 'info');

  // Delete test users (including test admin)
  for (const user of Object.values(testUsers)) {
    const phoneNormalized = normalizePhone(user.phone);
    await supabase.from('auth_users').delete().eq('phone_normalized', phoneNormalized);
  }

  // Delete test player ratings
  await supabase.from('player_ratings').delete().eq('player_name', 'Test Player Alpha');
  await supabase.from('player_ratings').delete().eq('player_name', 'Test Player Beta');
  await supabase.from('player_ratings').delete().eq('player_name', 'Multi Test Player');
  await supabase.from('player_ratings').delete().eq('player_name', 'Test Validation');
  await supabase.from('player_ratings').delete().eq('player_name', 'Test Min');
  await supabase.from('player_ratings').delete().eq('player_name', 'Test Max');

  log('Cleanup complete\n', 'success');
}

async function setupTestUsers() {
  log('Setting up test users...', 'info');

  // Register test admin user
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
      log(`Test admin user registered (ID: ${testUsers.admin.id})`, 'info');

      // Promote to admin using direct DB access
      const phoneNormalized = normalizePhone(testUsers.admin.phone);
      await supabase
        .from('auth_users')
        .update({ role: 'admin' })
        .eq('phone_normalized', phoneNormalized);

      log(`Test admin promoted to admin role`, 'info');
    }
  }

  // Register sub-admin user
  const subAdminRegister = await request('/api/auth/send-otp', {
    body: { phone: testUsers.subAdmin.phone }
  });

  if (subAdminRegister.status === 200 && subAdminRegister.data.otpCode) {
    await request('/api/auth/verify-otp', {
      body: { phone: testUsers.subAdmin.phone, code: subAdminRegister.data.otpCode }
    });

    const register = await request('/api/auth/register', {
      body: {
        phone: testUsers.subAdmin.phone,
        password: testUsers.subAdmin.password,
        displayName: 'Sub Admin Test'
      }
    });

    if (register.status === 201) {
      testUsers.subAdmin.id = register.data.user.id;
      log(`Sub-admin user registered (ID: ${testUsers.subAdmin.id})`, 'info');
    }
  }

  // Register regular user
  const userRegister = await request('/api/auth/send-otp', {
    body: { phone: testUsers.regularUser.phone }
  });

  if (userRegister.status === 200 && userRegister.data.otpCode) {
    await request('/api/auth/verify-otp', {
      body: { phone: testUsers.regularUser.phone, code: userRegister.data.otpCode }
    });

    const register = await request('/api/auth/register', {
      body: {
        phone: testUsers.regularUser.phone,
        password: testUsers.regularUser.password,
        displayName: 'Regular User Test'
      }
    });

    if (register.status === 201) {
      testUsers.regularUser.id = register.data.user.id;
      log(`Regular user registered (ID: ${testUsers.regularUser.id})`, 'info');
    }
  }

  log('Test users setup complete\n', 'success');
}

async function loginTestUsers() {
  log('Logging in test users...', 'info');

  // Login test admin
  const adminLogin = await request('/api/auth/login', {
    body: { phone: testUsers.admin.phone, password: testUsers.admin.password }
  });

  if (adminLogin.status === 200) {
    testUsers.admin.token = adminLogin.data.accessToken;
    log(`Test admin logged in`, 'info');
  } else {
    log(`⚠ Test admin login failed`, 'error');
    console.error('Admin login response:', adminLogin);
    throw new Error('Test admin login failed');
  }

  // Login sub-admin
  const subAdminLogin = await request('/api/auth/login', {
    body: { phone: testUsers.subAdmin.phone, password: testUsers.subAdmin.password }
  });

  if (subAdminLogin.status === 200) {
    testUsers.subAdmin.token = subAdminLogin.data.accessToken;
    log(`Sub-admin logged in`, 'info');
  }

  // Login regular user
  const userLogin = await request('/api/auth/login', {
    body: { phone: testUsers.regularUser.phone, password: testUsers.regularUser.password }
  });

  if (userLogin.status === 200) {
    testUsers.regularUser.token = userLogin.data.accessToken;
    log(`Regular user logged in\n`, 'info');
  }
}

async function runTests() {
  log('\n=== PHASE 3 BACKEND VALIDATION ===\n', 'info');

  await cleanup();
  await setupTestUsers();
  await loginTestUsers();

  // TEST SUITE 1: Admin Management
  log('TEST SUITE 1: Admin Management', 'info');

  // Test 1.1: Regular user cannot create sub-admin
  const unauthorizedCreate = await request('/api/admin/create-sub-admin', {
    headers: { Authorization: `Bearer ${testUsers.regularUser.token}` },
    body: { userId: testUsers.regularUser.id }
  });
  test('Regular user cannot create sub-admin (403)', unauthorizedCreate.status === 403);

  // Test 1.2: Admin creates sub-admin
  const createSubAdmin = await request('/api/admin/create-sub-admin', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { userId: testUsers.subAdmin.id, grantGradingPermission: false }
  });
  test('Admin creates sub-admin successfully', createSubAdmin.status === 200);
  test('Sub-admin role updated', createSubAdmin.data.user?.role === 'sub_admin');
  test('Grading permission NOT granted', createSubAdmin.data.user?.can_grade_players === false);

  // Test 1.3: Admin grants grading permission
  const grantPermission = await request('/api/admin/grant-grading-permission', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { userId: testUsers.subAdmin.id }
  });
  test('Admin grants grading permission', grantPermission.status === 200);
  test('Sub-admin has grading permission', grantPermission.data.user?.can_grade_players === true);

  // Test 1.4: List users
  const listUsers = await request('/api/admin/users', {
    method: 'GET',
    headers: { Authorization: `Bearer ${testUsers.admin.token}` }
  });
  test('Admin lists users', listUsers.status === 200);
  test('Users list contains sub-admin', listUsers.data.users?.some(u => u.id === testUsers.subAdmin.id));

  log('');

  // TEST SUITE 2: Grading Permissions
  log('TEST SUITE 2: Grading Permissions', 'info');

  // Test 2.1: Regular user cannot grade
  const regularUserGrade = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.regularUser.token}` },
    body: {
      playerName: 'Test Player Alpha',
      sport: 'basketball',
      grade: 8
    }
  });
  test('Regular user cannot grade (403)', regularUserGrade.status === 403);

  // Test 2.2: Sub-admin WITH permission can grade
  const subAdminGrade = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.subAdmin.token}` },
    body: {
      playerName: 'Test Player Alpha',
      sport: 'basketball',
      grade: 7
    }
  });
  test('Sub-admin with permission can grade', subAdminGrade.status === 200);
  test('Grade saved correctly', subAdminGrade.data.rating?.yourGrade === 7);

  // Test 2.3: Revoke grading permission
  const revokePermission = await request('/api/admin/revoke-grading-permission', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { userId: testUsers.subAdmin.id }
  });
  test('Admin revokes grading permission', revokePermission.status === 200);

  // Re-login sub-admin to get fresh token
  const relogin = await request('/api/auth/login', {
    body: { phone: testUsers.subAdmin.phone, password: testUsers.subAdmin.password }
  });
  testUsers.subAdmin.token = relogin.data.accessToken;

  // Test 2.4: Sub-admin WITHOUT permission cannot grade
  const subAdminNoPermGrade = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.subAdmin.token}` },
    body: {
      playerName: 'Test Player Beta',
      sport: 'soccer',
      grade: 6
    }
  });
  test('Sub-admin without permission cannot grade (403)', subAdminNoPermGrade.status === 403);

  log('');

  // TEST SUITE 3: Multi-Grader Averaging + Ceiling
  log('TEST SUITE 3: Multi-Grader Averaging + Ceiling', 'info');

  // Test 3.1: Admin grades player (first grade: 7)
  const adminGrade1 = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      playerName: 'Multi Test Player',
      sport: 'basketball',
      grade: 7
    }
  });
  test('Admin submits first grade (7)', adminGrade1.status === 200);
  test('Final grade is 7 (single grader)', adminGrade1.data.rating?.finalGrade === 7);

  // Re-grant permission to sub-admin
  await request('/api/admin/grant-grading-permission', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { userId: testUsers.subAdmin.id }
  });

  // Re-login sub-admin
  const relogin2 = await request('/api/auth/login', {
    body: { phone: testUsers.subAdmin.phone, password: testUsers.subAdmin.password }
  });
  testUsers.subAdmin.token = relogin2.data.accessToken;

  // Test 3.2: Sub-admin grades same player (second grade: 8)
  const subAdminGrade2 = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.subAdmin.token}` },
    body: {
      playerName: 'Multi Test Player',
      sport: 'basketball',
      grade: 8
    }
  });
  test('Sub-admin submits second grade (8)', subAdminGrade2.status === 200);
  test('Grader count is 2', subAdminGrade2.data.rating?.graderCount === 2);

  // Average: (7 + 8) / 2 = 7.5 → Ceiling = 8
  test('Final grade is 8 (avg 7.5 → ceiling)', subAdminGrade2.data.rating?.finalGrade === 8);

  // Test 3.3: Create third test user and grade
  // Simulate third grader to test ceiling with 3 graders
  const thirdUser = { phone: '058-333-3333', password: 'Third123!', token: null };

  // Register and promote
  const thirdOtp = await request('/api/auth/send-otp', { body: { phone: thirdUser.phone } });
  if (thirdOtp.status === 200) {
    await request('/api/auth/verify-otp', {
      body: { phone: thirdUser.phone, code: thirdOtp.data.otpCode }
    });

    const thirdReg = await request('/api/auth/register', {
      body: {
        phone: thirdUser.phone,
        password: thirdUser.password,
        displayName: 'Third Grader'
      }
    });

    if (thirdReg.status === 201) {
      // Grant permission
      await request('/api/admin/grant-grading-permission', {
        headers: { Authorization: `Bearer ${testUsers.admin.token}` },
        body: { userId: thirdReg.data.user.id }
      });

      // Login
      const thirdLogin = await request('/api/auth/login', {
        body: { phone: thirdUser.phone, password: thirdUser.password }
      });
      thirdUser.token = thirdLogin.data.accessToken;

      // Grade with 6 → Average: (7 + 8 + 6) / 3 = 7 → Ceiling = 7
      const thirdGrade = await request('/api/ratings/grade-player', {
        headers: { Authorization: `Bearer ${thirdUser.token}` },
        body: {
          playerName: 'Multi Test Player',
          sport: 'basketball',
          grade: 6
        }
      });

      test('Third grader submits grade (6)', thirdGrade.status === 200);
      test('Grader count is 3', thirdGrade.data.rating?.graderCount === 3);
      test('Final grade is 7 (avg 7.0 → ceiling)', thirdGrade.data.rating?.finalGrade === 7);

      // Cleanup third user
      const thirdNorm = normalizePhone(thirdUser.phone);
      await supabase.from('auth_users').delete().eq('phone_normalized', thirdNorm);
    }
  }

  log('');

  // TEST SUITE 4: Grade Validation
  log('TEST SUITE 4: Grade Validation', 'info');

  // Test 4.1: Reject decimal grade
  const decimalGrade = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      playerName: 'Test Validation',
      sport: 'basketball',
      grade: 7.5
    }
  });
  test('Decimal grade rejected (400)', decimalGrade.status === 400);
  test('Error mentions integer required', decimalGrade.data.error?.includes('integer'));

  // Test 4.2: Reject grade below 1
  const lowGrade = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      playerName: 'Test Validation',
      sport: 'basketball',
      grade: 0
    }
  });
  test('Grade below 1 rejected (400)', lowGrade.status === 400);

  // Test 4.3: Reject grade above 10
  const highGrade = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      playerName: 'Test Validation',
      sport: 'basketball',
      grade: 11
    }
  });
  test('Grade above 10 rejected (400)', highGrade.status === 400);

  // Test 4.4: Accept grade 1
  const grade1 = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      playerName: 'Test Min',
      sport: 'basketball',
      grade: 1
    }
  });
  test('Grade 1 accepted', grade1.status === 200);

  // Test 4.5: Accept grade 10
  const grade10 = await request('/api/ratings/grade-player', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: {
      playerName: 'Test Max',
      sport: 'basketball',
      grade: 10
    }
  });
  test('Grade 10 accepted', grade10.status === 200);

  log('');

  // TEST SUITE 5: Revoke Sub-Admin
  log('TEST SUITE 5: Revoke Sub-Admin', 'info');

  // Test 5.1: Admin revokes sub-admin
  const revokeSubAdmin = await request('/api/admin/revoke-sub-admin', {
    headers: { Authorization: `Bearer ${testUsers.admin.token}` },
    body: { userId: testUsers.subAdmin.id }
  });
  test('Admin revokes sub-admin', revokeSubAdmin.status === 200);
  test('Role changed to user', revokeSubAdmin.data.user?.role === 'user');
  test('Grading permission removed', revokeSubAdmin.data.user?.can_grade_players === false);

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
    log('Phase 3 backend is working correctly.\n', 'success');
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
