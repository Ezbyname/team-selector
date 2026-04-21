/**
 * Authentication Flow Validation Test
 * Tests complete end-to-end auth flow
 */

const BASE_URL = 'http://localhost:3000/api/auth';

// Test state
const testState = {
  phone: '058-999-1111', // Fresh test phone
  otpCode: null,
  accessToken: null,
  refreshToken: null,
  user: null
};

// Test results
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
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
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

  // Add refresh token cookie if we have it and no explicit cookie set
  if (testState.refreshToken && !headers['Cookie']) {
    headers['Cookie'] = `refresh_token=${testState.refreshToken}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie && setCookie.includes('refresh_token=')) {
      const match = setCookie.match(/refresh_token=([^;]+)/);
      if (match) {
        testState.refreshToken = match[1];
      }
    }

    const data = await response.json();
    return { status: response.status, data, headers: response.headers };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  log('\n=== AUTHENTICATION FLOW VALIDATION ===\n', 'info');
  log(`Testing with phone: ${testState.phone}\n`, 'info');

  // Cleanup test user first
  log('Cleaning up test user...', 'info');
  const { supabase } = await import('./lib/supabase.js');
  const { normalizePhone } = await import('./lib/phone.js');
  const phoneNormalized = normalizePhone(testState.phone);
  await supabase.from('auth_users').delete().eq('phone_normalized', phoneNormalized);
  log('Cleanup complete\n', 'info');

  // Test 1: Send OTP
  log('TEST 1: Send OTP', 'info');
  const sendOtp = await request('/send-otp', {
    body: { phone: testState.phone }
  });

  test('Send OTP returns 200', sendOtp.status === 200, `Got ${sendOtp.status}`);
  test('Send OTP has success=true', sendOtp.data.success === true);
  test('Send OTP includes expiresAt', !!sendOtp.data.expiresAt);
  test('Send OTP returns otpCode (dev mode)', !!sendOtp.data.otpCode);

  if (sendOtp.data.otpCode) {
    testState.otpCode = sendOtp.data.otpCode;
    log(`  OTP Code: ${testState.otpCode}\n`, 'info');
  } else {
    log('  ✗ Cannot continue without OTP code\n', 'error');
    return printResults();
  }

  // Test 2: Send OTP to invalid phone
  log('TEST 2: Invalid phone rejection', 'info');
  const invalidOtp = await request('/send-otp', {
    body: { phone: 'invalid' }
  });

  test('Invalid phone returns 400', invalidOtp.status === 400);
  test('Invalid phone has error message', !!invalidOtp.data.error);
  log('');

  // Test 3: Verify OTP
  log('TEST 3: Verify OTP', 'info');
  const verifyOtp = await request('/verify-otp', {
    body: { phone: testState.phone, code: testState.otpCode }
  });

  test('Verify OTP returns 200', verifyOtp.status === 200);
  test('Verify OTP has success=true', verifyOtp.data.success === true);
  test('Verify OTP returns phoneNormalized', !!verifyOtp.data.phoneNormalized);
  log('');

  // Test 4: Verify wrong OTP
  log('TEST 4: Wrong OTP rejection', 'info');
  const wrongOtp = await request('/verify-otp', {
    body: { phone: testState.phone, code: '000000' }
  });

  test('Wrong OTP returns 400', wrongOtp.status === 400);
  test('Wrong OTP has error message', !!wrongOtp.data.error);
  log('');

  // Test 5: Register new user
  log('TEST 5: User Registration', 'info');
  const register = await request('/register', {
    body: {
      phone: testState.phone,
      password: 'TestPass123!',
      displayName: 'Auth Test User'
    }
  });

  test('Register returns 201', register.status === 201, `Got ${register.status}`);
  test('Register has success=true', register.data.success === true);
  test('Register returns accessToken', !!register.data.accessToken);
  test('Register returns user object', !!register.data.user);
  test('Register sets refresh_token cookie', !!testState.refreshToken);

  if (register.data.accessToken) {
    testState.accessToken = register.data.accessToken;
    testState.user = register.data.user;
    log(`  User ID: ${testState.user.id}`, 'info');
    log(`  Access Token: ${testState.accessToken.substring(0, 20)}...`, 'info');
    log(`  Refresh Token: ${testState.refreshToken ? 'Set' : 'Not set'}\n`, 'info');
  }

  // Test 6: Register duplicate phone
  log('TEST 6: Duplicate phone rejection', 'info');
  const duplicate = await request('/register', {
    body: {
      phone: testState.phone,
      password: 'TestPass123!',
      displayName: 'Another User'
    }
  });

  test('Duplicate phone returns 409', duplicate.status === 409);
  test('Duplicate phone has error message', !!duplicate.data.error);
  log('');

  // Test 7: Logout
  log('TEST 7: Logout', 'info');
  const logout = await request('/logout', {});

  test('Logout returns 200', logout.status === 200);
  test('Logout has success=true', logout.data.success === true);
  log('');

  // Test 8: Login
  log('TEST 8: Login', 'info');
  const login = await request('/login', {
    body: {
      phone: testState.phone,
      password: 'TestPass123!'
    }
  });

  test('Login returns 200', login.status === 200);
  test('Login has success=true', login.data.success === true);
  test('Login returns accessToken', !!login.data.accessToken);
  test('Login returns user object', !!login.data.user);
  test('Login returns same user ID', login.data.user?.id === testState.user?.id);

  if (login.data.accessToken) {
    testState.accessToken = login.data.accessToken;
    log(`  New Access Token: ${testState.accessToken.substring(0, 20)}...\n`, 'info');
  }

  // Test 9: Login with wrong password
  log('TEST 9: Wrong password rejection', 'info');
  const wrongPass = await request('/login', {
    body: {
      phone: testState.phone,
      password: 'WrongPassword'
    }
  });

  test('Wrong password returns 401', wrongPass.status === 401);
  test('Wrong password has error message', !!wrongPass.data.error);
  log('');

  // Test 10: Refresh token
  log('TEST 10: Token Refresh', 'info');
  await sleep(1000); // Small delay
  const refresh = await request('/refresh', {});

  test('Refresh returns 200', refresh.status === 200);
  test('Refresh has success=true', refresh.data.success === true);
  test('Refresh returns new accessToken', !!refresh.data.accessToken);
  test('Refresh returns user object', !!refresh.data.user);
  test('New token is different', refresh.data.accessToken !== testState.accessToken);

  if (refresh.data.accessToken) {
    const oldToken = testState.accessToken.substring(0, 20);
    const newToken = refresh.data.accessToken.substring(0, 20);
    log(`  Old Token: ${oldToken}...`, 'info');
    log(`  New Token: ${newToken}...`, 'info');
    log(`  Token rotated: ${oldToken !== newToken ? 'Yes' : 'No'}\n`, 'info');
  }

  // Test 11: Logout again
  log('TEST 11: Final Logout', 'info');
  const finalLogout = await request('/logout', {});

  test('Final logout returns 200', finalLogout.status === 200);
  test('Final logout has success=true', finalLogout.data.success === true);
  log('');

  // Test 12: Refresh after logout should fail
  log('TEST 12: Refresh after logout', 'info');
  const refreshAfterLogout = await request('/refresh', {});

  test('Refresh after logout returns 401', refreshAfterLogout.status === 401);
  test('Refresh after logout has error message', !!refreshAfterLogout.data.error);
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
    log('Authentication flow is working correctly.\n', 'success');
    process.exit(0);
  } else {
    log('✗ SOME TESTS FAILED!', 'error');
    log('Review failures above.\n', 'error');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\nUnexpected error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
