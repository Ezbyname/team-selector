/**
 * Test Authentication Fix: Existing User Flow
 * Verifies that existing users can login without blocking errors
 */

const BASE_URL = 'http://localhost:3001';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testExistingUserFlow() {
  log('\n=== Testing Authentication Fix ===\n', 'blue');

  // Test with existing test admin user (phone: 058-000-0000)
  const testPhone = '058-000-0000';

  log('TEST 1: Existing user enters phone number', 'blue');
  log(`  Phone: ${testPhone}`, 'blue');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone })
    });

    const data = await response.json();

    log(`  Response status: ${response.status}`, 'blue');
    log(`  Response data: ${JSON.stringify(data, null, 2)}`, 'blue');

    // Verify fix
    const checks = {
      statusOk: response.status === 200,
      hasSuccess: data.success === true,
      hasUserExists: data.userExists === true,
      hasMessage: typeof data.message === 'string',
      noError: !data.error
    };

    log('\n✓ Verification Checks:', 'blue');
    Object.entries(checks).forEach(([check, passed]) => {
      const symbol = passed ? '✓' : '✗';
      const color = passed ? 'green' : 'red';
      log(`  ${symbol} ${check}: ${passed}`, color);
    });

    const allPassed = Object.values(checks).every(v => v === true);

    if (allPassed) {
      log('\n✅ SUCCESS: Authentication fix working correctly!', 'green');
      log('  ✓ Existing user detection works', 'green');
      log('  ✓ Returns 200 OK (not error)', 'green');
      log('  ✓ Provides userExists flag', 'green');
      log('  ✓ No blocking error message', 'green');
      log('\n→ UI should now redirect to login screen', 'green');
      return true;
    } else {
      log('\n❌ FAILED: Authentication fix not working', 'red');
      return false;
    }

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log('  → Dev server not running. Start with: vercel dev', 'yellow');
    }
    return false;
  }
}

async function testNewUserFlow() {
  log('\n=== Testing New User Flow ===\n', 'blue');

  // Test with non-existent phone
  const testPhone = '050-999-9999';

  log('TEST 2: New user enters phone number', 'blue');
  log(`  Phone: ${testPhone}`, 'blue');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone })
    });

    const data = await response.json();

    log(`  Response status: ${response.status}`, 'blue');
    log(`  Response data: ${JSON.stringify(data, null, 2)}`, 'blue');

    // Verify new user flow
    const checks = {
      statusOk: response.status === 200,
      hasSuccess: data.success === true,
      userExistsFalse: data.userExists === false,
      hasOtpCode: typeof data.otpCode === 'string', // Dev mode only
      noError: !data.error
    };

    log('\n✓ Verification Checks:', 'blue');
    Object.entries(checks).forEach(([check, passed]) => {
      const symbol = passed ? '✓' : '✗';
      const color = passed ? 'green' : 'red';
      log(`  ${symbol} ${check}: ${passed}`, color);
    });

    const allPassed = Object.values(checks).every(v => v === true);

    if (allPassed) {
      log('\n✅ SUCCESS: New user flow working correctly!', 'green');
      log('  ✓ OTP sent successfully', 'green');
      log('  ✓ userExists = false', 'green');
      log('  ✓ No error response', 'green');
      log('\n→ UI should show OTP verification screen', 'green');
      return true;
    } else {
      log('\n❌ FAILED: New user flow not working', 'red');
      return false;
    }

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  const test1 = await testExistingUserFlow();
  const test2 = await testNewUserFlow();

  log('\n=== SUMMARY ===\n', 'blue');
  log(`Existing User Flow: ${test1 ? '✅ PASS' : '❌ FAIL'}`, test1 ? 'green' : 'red');
  log(`New User Flow: ${test2 ? '✅ PASS' : '❌ FAIL'}`, test2 ? 'green' : 'red');

  if (test1 && test2) {
    log('\n🎉 All tests passed! Authentication fix is working.', 'green');
    log('\nNext steps:', 'blue');
    log('  1. Test in browser: http://localhost:3001/login.html', 'blue');
    log('  2. Enter phone: 058-000-0000', 'blue');
    log('  3. Verify it goes directly to login screen', 'blue');
    log('  4. Enter password: AdminPass123!', 'blue');
    log('  5. Should login successfully\n', 'blue');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Review logs above.', 'yellow');
    process.exit(1);
  }
}

runTests().catch(error => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  process.exit(1);
});
