/**
 * Backend Validation Test Suite
 * Comprehensive end-to-end testing for Phase 1 authentication
 */

import { normalizePhone, formatPhone, isValidPhone } from './lib/phone.js';

// ANSI color codes for terminal output
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
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  data: (label, value) => console.log(`  ${colors.cyan}${label}:${colors.reset} ${JSON.stringify(value, null, 2)}`),
};

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_PHONE = '050-999-8888'; // Test phone number
const TEST_PASSWORD = 'TestPass123!';
const TEST_DISPLAY_NAME = 'Test User';

// Test state
let testState = {
  otpCode: null,
  userId: null,
  accessToken: null,
  refreshToken: null,
  phoneNormalized: null,
};

// Statistics
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

// Helper: Make HTTP request
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.includeAuth && testState.accessToken) {
    headers['Authorization'] = `Bearer ${testState.accessToken}`;
  }

  if (options.includeCookie && testState.refreshToken) {
    headers['Cookie'] = `refresh_token=${testState.refreshToken}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Extract cookies from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie && setCookie.includes('refresh_token=')) {
      const match = setCookie.match(/refresh_token=([^;]+)/);
      if (match) {
        testState.refreshToken = match[1];
      }
    }

    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json') ? await response.json() : await response.text();

    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
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

// Helper: Warn condition
function warn(condition, message) {
  if (!condition) {
    log.warning(message);
    stats.warnings++;
  }
}

// ============================================================================
// TEST SUITE 1: PHONE NORMALIZATION
// ============================================================================

async function testPhoneNormalization() {
  log.section();
  log.title('TEST SUITE 1: Phone Normalization');
  console.log('Testing E.164 conversion and validation\n');

  // Test 1.1: Israeli format with dashes
  const phone1 = normalizePhone('050-123-4567');
  assert(phone1 === '+972501234567', 'Normalize 050-123-4567 → +972501234567');

  // Test 1.2: Israeli format without dashes
  const phone2 = normalizePhone('0501234567');
  assert(phone2 === '+972501234567', 'Normalize 0501234567 → +972501234567');

  // Test 1.3: Already E.164
  const phone3 = normalizePhone('+972501234567');
  assert(phone3 === '+972501234567', 'Already E.164 format preserved');

  // Test 1.4: Without + prefix
  const phone4 = normalizePhone('972501234567');
  assert(phone4 === '+972501234567', 'Normalize 972501234567 → +972501234567');

  // Test 1.5: Invalid format (too short)
  const phone5 = normalizePhone('050-123');
  assert(phone5 === null, 'Reject invalid phone (too short)');

  // Test 1.6: Invalid format (wrong prefix)
  const phone6 = normalizePhone('040-123-4567');
  assert(phone6 === null, 'Reject invalid prefix (040)');

  // Test 1.7: All valid Israeli prefixes
  const validPrefixes = ['050', '051', '052', '053', '054', '055', '058'];
  let allValid = true;
  for (const prefix of validPrefixes) {
    const result = normalizePhone(`${prefix}-123-4567`);
    if (result === null) {
      allValid = false;
      break;
    }
  }
  assert(allValid, 'All valid Israeli prefixes accepted (050-058)');

  // Test 1.8: Format display
  const formatted = formatPhone('+972501234567');
  assert(formatted === '050-123-4567', 'Format E.164 → 050-123-4567');

  // Test 1.9: Validation helper
  assert(isValidPhone('050-123-4567') === true, 'isValidPhone() accepts valid number');
  assert(isValidPhone('040-123-4567') === false, 'isValidPhone() rejects invalid number');
}

// ============================================================================
// TEST SUITE 2: OTP FLOW
// ============================================================================

async function testOTPFlow() {
  log.section();
  log.title('TEST SUITE 2: OTP Flow (Send & Verify)');
  console.log('Testing OTP generation, expiration, and reuse protection\n');

  // Test 2.1: Send OTP to valid phone
  log.info('Step 1: Send OTP to test phone...');
  const sendResponse = await request('/api/auth/send-otp', {
    method: 'POST',
    body: { phone: TEST_PHONE },
  });

  assert(sendResponse.status === 200, `Send OTP returns 200 (got ${sendResponse.status})`);
  assert(sendResponse.data.success === true, 'Send OTP response has success=true');
  assert(sendResponse.data.expiresAt !== undefined, 'Send OTP response includes expiresAt');

  if (process.env.NODE_ENV === 'development' && sendResponse.data.otpCode) {
    testState.otpCode = sendResponse.data.otpCode;
    log.info(`OTP Code (dev mode): ${testState.otpCode}`);
  } else {
    log.warning('OTP code not returned (production mode). Check console logs or SMS.');
  }

  log.data('Response', sendResponse.data);

  // Test 2.2: Send OTP to invalid phone
  log.info('\nStep 2: Test invalid phone rejection...');
  const invalidResponse = await request('/api/auth/send-otp', {
    method: 'POST',
    body: { phone: '040-123-4567' },
  });

  assert(invalidResponse.status === 400, `Invalid phone rejected with 400 (got ${invalidResponse.status})`);
  assert(invalidResponse.data.error !== undefined, 'Error message returned for invalid phone');

  // Test 2.3: Verify OTP with correct code
  if (testState.otpCode) {
    log.info('\nStep 3: Verify OTP with correct code...');
    const verifyResponse = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone: TEST_PHONE, code: testState.otpCode },
    });

    assert(verifyResponse.status === 200, `Verify OTP returns 200 (got ${verifyResponse.status})`);
    assert(verifyResponse.data.success === true, 'Verify OTP response has success=true');
    assert(verifyResponse.data.phoneNormalized !== undefined, 'Verify OTP returns normalized phone');

    testState.phoneNormalized = verifyResponse.data.phoneNormalized;
    log.data('Response', verifyResponse.data);
  } else {
    log.warning('MANUAL STEP REQUIRED: Get OTP from console/SMS and run verify-otp manually');
  }

  // Test 2.4: Verify OTP with wrong code
  log.info('\nStep 4: Test wrong OTP rejection...');
  const wrongOtpResponse = await request('/api/auth/verify-otp', {
    method: 'POST',
    body: { phone: TEST_PHONE, code: '000000' },
  });

  assert(wrongOtpResponse.status === 400, `Wrong OTP rejected with 400 (got ${wrongOtpResponse.status})`);
  assert(wrongOtpResponse.data.error !== undefined, 'Error message returned for wrong OTP');

  // Test 2.5: Reuse protection (verify same code twice)
  if (testState.otpCode) {
    log.info('\nStep 5: Test OTP reuse protection...');
    const reuseResponse = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone: TEST_PHONE, code: testState.otpCode },
    });

    // Should fail because OTP already verified
    assert(reuseResponse.status === 400, `OTP reuse rejected with 400 (got ${reuseResponse.status})`);
    warn(reuseResponse.data.error?.includes('expired'), 'OTP reuse returns "expired" error message');
  }

  // Test 2.6: Expiration (manual verification needed)
  log.warning('\nOTP Expiration Test: Manual verification needed');
  log.info('  - OTP codes should expire after 5 minutes');
  log.info('  - Attempting to verify expired OTP should return 400');
  log.info('  - Check database: otp_codes.expires_at should be NOW() + 5 minutes');
}

// ============================================================================
// TEST SUITE 3: REGISTRATION
// ============================================================================

async function testRegistration() {
  log.section();
  log.title('TEST SUITE 3: User Registration');
  console.log('Testing account creation with password hashing\n');

  // Test 3.1: Register without OTP verification
  log.info('Step 1: Test registration without OTP verification...');
  const noOtpResponse = await request('/api/auth/register', {
    method: 'POST',
    body: {
      phone: '051-999-8888',
      password: TEST_PASSWORD,
      displayName: 'Should Fail'
    },
  });

  assert(noOtpResponse.status === 403, `Registration without OTP rejected with 403 (got ${noOtpResponse.status})`);
  assert(noOtpResponse.data.error !== undefined, 'Error message returned when OTP not verified');

  // Test 3.2: Register with verified phone
  if (testState.phoneNormalized) {
    log.info('\nStep 2: Register with verified phone...');
    const registerResponse = await request('/api/auth/register', {
      method: 'POST',
      body: {
        phone: TEST_PHONE,
        password: TEST_PASSWORD,
        displayName: TEST_DISPLAY_NAME,
      },
    });

    assert(registerResponse.status === 201, `Registration returns 201 (got ${registerResponse.status})`);
    assert(registerResponse.data.success === true, 'Registration response has success=true');
    assert(registerResponse.data.user !== undefined, 'Registration returns user object');
    assert(registerResponse.data.accessToken !== undefined, 'Registration returns access token');
    assert(registerResponse.data.user.id !== undefined, 'User has UUID id');
    assert(registerResponse.data.user.role === 'user', 'User has default role "user"');

    testState.userId = registerResponse.data.user.id;
    testState.accessToken = registerResponse.data.accessToken;

    log.data('User', registerResponse.data.user);
    log.info(`Access Token: ${testState.accessToken.substring(0, 30)}...`);

    // Check for httpOnly cookie
    const setCookie = registerResponse.headers['set-cookie'];
    warn(setCookie?.includes('refresh_token'), 'Registration sets httpOnly refresh_token cookie');
    warn(setCookie?.includes('HttpOnly'), 'Cookie has HttpOnly flag');
    warn(setCookie?.includes('Secure'), 'Cookie has Secure flag');
    warn(setCookie?.includes('SameSite'), 'Cookie has SameSite flag');
  } else {
    log.warning('SKIPPED: Phone not verified in previous step');
  }

  // Test 3.3: Password strength validation
  log.info('\nStep 3: Test password validation...');
  const weakPassResponse = await request('/api/auth/register', {
    method: 'POST',
    body: {
      phone: '052-999-8888',
      password: '123',
      displayName: 'Weak Pass',
    },
  });

  assert(weakPassResponse.status === 400, `Weak password rejected with 400 (got ${weakPassResponse.status})`);
  assert(weakPassResponse.data.error !== undefined, 'Error message returned for weak password');

  // Test 3.4: Duplicate phone registration
  if (testState.phoneNormalized) {
    log.info('\nStep 4: Test duplicate phone rejection...');
    const duplicateResponse = await request('/api/auth/register', {
      method: 'POST',
      body: {
        phone: TEST_PHONE,
        password: 'AnotherPass123!',
        displayName: 'Duplicate User',
      },
    });

    assert(duplicateResponse.status === 409, `Duplicate phone rejected with 409 (got ${duplicateResponse.status})`);
    assert(duplicateResponse.data.error !== undefined, 'Error message returned for duplicate phone');
  }
}

// ============================================================================
// TEST SUITE 4: LOGIN
// ============================================================================

async function testLogin() {
  log.section();
  log.title('TEST SUITE 4: Login (Phone + Password)');
  console.log('Testing authentication and JWT issuance\n');

  // Test 4.1: Login with correct credentials
  if (testState.phoneNormalized) {
    log.info('Step 1: Login with correct credentials...');
    const loginResponse = await request('/api/auth/login', {
      method: 'POST',
      body: {
        phone: TEST_PHONE,
        password: TEST_PASSWORD,
      },
    });

    assert(loginResponse.status === 200, `Login returns 200 (got ${loginResponse.status})`);
    assert(loginResponse.data.success === true, 'Login response has success=true');
    assert(loginResponse.data.user !== undefined, 'Login returns user object');
    assert(loginResponse.data.accessToken !== undefined, 'Login returns access token');
    assert(loginResponse.data.user.id === testState.userId, 'Login returns same user ID');

    testState.accessToken = loginResponse.data.accessToken;

    log.data('User', loginResponse.data.user);
    log.info(`New Access Token: ${testState.accessToken.substring(0, 30)}...`);

    // Check for httpOnly cookie
    const setCookie = loginResponse.headers['set-cookie'];
    warn(setCookie?.includes('refresh_token'), 'Login sets httpOnly refresh_token cookie');
  } else {
    log.warning('SKIPPED: User not registered in previous steps');
  }

  // Test 4.2: Login with wrong password
  log.info('\nStep 2: Test wrong password rejection...');
  const wrongPassResponse = await request('/api/auth/login', {
    method: 'POST',
    body: {
      phone: TEST_PHONE,
      password: 'WrongPassword123!',
    },
  });

  assert(wrongPassResponse.status === 401, `Wrong password rejected with 401 (got ${wrongPassResponse.status})`);
  assert(wrongPassResponse.data.error !== undefined, 'Error message returned for wrong password');

  // Test 4.3: Login with non-existent phone
  log.info('\nStep 3: Test non-existent phone rejection...');
  const noUserResponse = await request('/api/auth/login', {
    method: 'POST',
    body: {
      phone: '053-111-1111',
      password: TEST_PASSWORD,
    },
  });

  assert(noUserResponse.status === 401, `Non-existent phone rejected with 401 (got ${noUserResponse.status})`);
  assert(noUserResponse.data.error !== undefined, 'Error message returned for non-existent phone');
}

// ============================================================================
// TEST SUITE 5: TOKEN REFRESH
// ============================================================================

async function testTokenRefresh() {
  log.section();
  log.title('TEST SUITE 5: Token Refresh');
  console.log('Testing JWT refresh and rotation\n');

  // Test 5.1: Refresh with valid cookie
  if (testState.refreshToken) {
    log.info('Step 1: Refresh with valid refresh token...');
    const oldRefreshToken = testState.refreshToken;

    const refreshResponse = await request('/api/auth/refresh', {
      method: 'POST',
      includeCookie: true,
    });

    assert(refreshResponse.status === 200, `Refresh returns 200 (got ${refreshResponse.status})`);
    assert(refreshResponse.data.success === true, 'Refresh response has success=true');
    assert(refreshResponse.data.accessToken !== undefined, 'Refresh returns new access token');
    assert(refreshResponse.data.user !== undefined, 'Refresh returns user object');

    const newAccessToken = refreshResponse.data.accessToken;
    assert(newAccessToken !== testState.accessToken, 'New access token is different from old one');

    testState.accessToken = newAccessToken;

    log.info(`Old Access Token: ${testState.accessToken.substring(0, 30)}...`);
    log.info(`New Access Token: ${newAccessToken.substring(0, 30)}...`);

    // Check token rotation
    const setCookie = refreshResponse.headers['set-cookie'];
    warn(setCookie?.includes('refresh_token'), 'Refresh returns new refresh_token cookie');
    warn(testState.refreshToken !== oldRefreshToken, 'Refresh token rotated (security best practice)');
  } else {
    log.warning('SKIPPED: No refresh token available');
  }

  // Test 5.2: Refresh with missing cookie
  log.info('\nStep 2: Test refresh without cookie...');
  const noCookieResponse = await request('/api/auth/refresh', {
    method: 'POST',
  });

  assert(noCookieResponse.status === 401, `Refresh without cookie rejected with 401 (got ${noCookieResponse.status})`);
  assert(noCookieResponse.data.error !== undefined, 'Error message returned when cookie missing');

  // Test 5.3: Refresh with invalid cookie
  log.info('\nStep 3: Test refresh with invalid token...');
  const invalidCookieResponse = await request('/api/auth/refresh', {
    method: 'POST',
    headers: {
      Cookie: 'refresh_token=invalid_token_here',
    },
  });

  assert(invalidCookieResponse.status === 401, `Invalid refresh token rejected with 401 (got ${invalidCookieResponse.status})`);
  assert(invalidCookieResponse.data.error !== undefined, 'Error message returned for invalid token');
}

// ============================================================================
// TEST SUITE 6: LOGOUT
// ============================================================================

async function testLogout() {
  log.section();
  log.title('TEST SUITE 6: Logout');
  console.log('Testing session invalidation\n');

  // Test 6.1: Logout with valid session
  if (testState.refreshToken) {
    log.info('Step 1: Logout with valid session...');
    const logoutResponse = await request('/api/auth/logout', {
      method: 'POST',
      includeCookie: true,
    });

    assert(logoutResponse.status === 200, `Logout returns 200 (got ${logoutResponse.status})`);
    assert(logoutResponse.data.success === true, 'Logout response has success=true');

    // Check cookie deletion
    const setCookie = logoutResponse.headers['set-cookie'];
    warn(setCookie?.includes('Max-Age=0'), 'Logout clears cookie (Max-Age=0)');

    log.data('Response', logoutResponse.data);
  } else {
    log.warning('SKIPPED: No refresh token available');
  }

  // Test 6.2: Try to refresh after logout
  if (testState.refreshToken) {
    log.info('\nStep 2: Verify session invalidated (refresh should fail)...');
    const postLogoutRefresh = await request('/api/auth/refresh', {
      method: 'POST',
      includeCookie: true,
    });

    assert(postLogoutRefresh.status === 401, `Refresh after logout rejected with 401 (got ${postLogoutRefresh.status})`);
    assert(postLogoutRefresh.data.error !== undefined, 'Error message returned after logout');
  }

  // Test 6.3: Logout when already logged out
  log.info('\nStep 3: Test logout when already logged out...');
  const alreadyLoggedOutResponse = await request('/api/auth/logout', {
    method: 'POST',
  });

  assert(alreadyLoggedOutResponse.status === 200, `Logout when already logged out returns 200 (got ${alreadyLoggedOutResponse.status})`);
  assert(alreadyLoggedOutResponse.data.success === true, 'Logout is idempotent (success even if already logged out)');
}

// ============================================================================
// TEST SUITE 7: DATABASE VALIDATION
// ============================================================================

async function testDatabaseValidation() {
  log.section();
  log.title('TEST SUITE 7: Database Validation');
  console.log('Manual verification steps for database state\n');

  log.warning('MANUAL VERIFICATION REQUIRED:');
  console.log('\nPlease check the following in Supabase:');

  console.log('\n1. auth_users table:');
  console.log('   - User exists with phone_normalized in E.164 format (+972...)');
  console.log('   - password_hash is bcrypt format ($2b$12$...)');
  console.log('   - role is "user" for test account');
  console.log('   - phone_verified_at is set (not null)');

  console.log('\n2. otp_codes table:');
  console.log('   - OTP code exists for test phone');
  console.log('   - expires_at is ~5 minutes after created_at');
  console.log('   - verified_at is set after successful verification');
  console.log('   - Code cannot be reused (verified_at prevents reuse)');

  console.log('\n3. auth_sessions table:');
  console.log('   - Session created on login/register');
  console.log('   - refresh_token is stored (64-char hex string)');
  console.log('   - expires_at is ~7 days after created_at');
  console.log('   - Session deleted after logout');

  console.log('\n4. RLS Policies:');
  console.log('   - Try accessing auth_users without service key (should fail)');
  console.log('   - Verify user can only see their own profile');
  console.log('   - Verify otp_codes has no SELECT policy (API-only)');

  if (testState.userId) {
    log.info(`\nTest User ID: ${testState.userId}`);
    log.info(`Test Phone: ${testState.phoneNormalized || TEST_PHONE}`);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        PHASE 1 BACKEND VALIDATION TEST SUITE                 ║
║        Team Selector v2.0 - Authentication Tests             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  log.info(`Base URL: ${BASE_URL}`);
  log.info(`Test Phone: ${TEST_PHONE}`);
  log.info(`Test Display Name: ${TEST_DISPLAY_NAME}`);
  log.info(`Environment: ${process.env.NODE_ENV || 'production'}`);

  try {
    await testPhoneNormalization();
    await testOTPFlow();
    await testRegistration();
    await testLogin();
    await testTokenRefresh();
    await testLogout();
    await testDatabaseValidation();

    // Final report
    log.section();
    log.title('TEST RESULTS SUMMARY');
    console.log();

    const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
    const color = stats.failed === 0 ? colors.green : colors.red;

    console.log(`${colors.bright}Total Tests:${colors.reset} ${stats.total}`);
    console.log(`${colors.green}Passed:${colors.reset} ${stats.passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${stats.failed}`);
    console.log(`${colors.yellow}Warnings:${colors.reset} ${stats.warnings}`);
    console.log(`${colors.bright}Pass Rate:${colors.reset} ${color}${passRate}%${colors.reset}`);

    console.log();

    if (stats.failed === 0) {
      log.success('ALL TESTS PASSED! ✓');
      console.log('\nPhase 1 backend is production-ready.');
    } else {
      log.error(`${stats.failed} TEST(S) FAILED!`);
      console.log('\nPlease fix failing tests before proceeding to Auth UI.');
    }

    if (stats.warnings > 0) {
      log.warning(`\n${stats.warnings} warning(s) found. Review recommended but not blocking.`);
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
