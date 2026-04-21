/**
 * JWT Utilities Unit Tests
 * Tests token generation, verification, and expiration
 */

import { generateAccessToken, generateRefreshToken, verifyAccessToken, extractBearerToken, getRefreshTokenExpiration } from './lib/jwt.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log(`${colors.cyan}JWT Utilities Unit Tests${colors.reset}\n`);

// Test 1: Generate access token with user object
test('Generate access token with valid user object', () => {
  const user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phone_normalized: '+972501234567',
    role: 'user'
  };

  const token = generateAccessToken(user);

  assert(typeof token === 'string', 'Token should be a string');
  assert(token.length > 0, 'Token should not be empty');
  assert(token.split('.').length === 3, 'JWT should have 3 parts (header.payload.signature)');
});

// Test 2: Verify access token returns correct payload
test('Verify valid access token returns payload', () => {
  const user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phone_normalized: '+972501234567',
    role: 'user'
  };

  const token = generateAccessToken(user);
  const payload = verifyAccessToken(token);

  assert(payload !== null, 'Payload should not be null');
  assert(payload.sub === user.id, 'Payload sub should match user id');
  assert(payload.role === user.role, 'Payload role should match user role');
  assert(payload.phone === user.phone_normalized, 'Payload phone should match normalized phone');
  assert(typeof payload.iat === 'number', 'Payload should have issued-at timestamp');
  assert(typeof payload.exp === 'number', 'Payload should have expiration timestamp');
});

// Test 3: Verify token expiration is ~15 minutes
test('Access token expires in ~15 minutes', () => {
  const user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phone_normalized: '+972501234567',
    role: 'user'
  };

  const token = generateAccessToken(user);
  const payload = verifyAccessToken(token);

  const expiresIn = payload.exp - payload.iat;
  const fifteenMinutes = 15 * 60; // 900 seconds

  // Allow 1 second tolerance for execution time
  assert(Math.abs(expiresIn - fifteenMinutes) <= 1, `Token should expire in ~15 minutes (got ${expiresIn}s)`);
});

// Test 4: Reject malformed token
test('Reject malformed access token', () => {
  const result = verifyAccessToken('not.a.valid.jwt');
  assert(result === null, 'Malformed token should return null');
});

// Test 5: Reject invalid signature
test('Reject token with invalid signature', () => {
  const user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phone_normalized: '+972501234567',
    role: 'user'
  };

  const token = generateAccessToken(user);
  // Tamper with signature
  const parts = token.split('.');
  const tamperedToken = parts[0] + '.' + parts[1] + '.invalidsignature';

  const result = verifyAccessToken(tamperedToken);
  assert(result === null, 'Token with invalid signature should return null');
});

// Test 6: Generate refresh token (64-char hex)
test('Generate refresh token as 64-char hex string', () => {
  const token = generateRefreshToken();

  assert(typeof token === 'string', 'Refresh token should be a string');
  assert(token.length === 64, `Refresh token should be 64 chars (got ${token.length})`);
  assert(/^[0-9a-f]{64}$/.test(token), 'Refresh token should be hexadecimal');
});

// Test 7: Extract Bearer token from header
test('Extract Bearer token from Authorization header', () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
  const authHeader = `Bearer ${token}`;

  const extracted = extractBearerToken(authHeader);
  assert(extracted === token, 'Should extract token from Bearer header');
});

// Test 8: Reject invalid authorization header format
test('Reject invalid Authorization header format', () => {
  assert(extractBearerToken(null) === null, 'Null header should return null');
  assert(extractBearerToken('') === null, 'Empty header should return null');
  assert(extractBearerToken('InvalidFormat') === null, 'Non-Bearer format should return null');
  assert(extractBearerToken('Basic token123') === null, 'Non-Bearer scheme should return null');
});

// Test 9: Calculate refresh token expiration (7 days)
test('Refresh token expiration is 7 days in future', () => {
  const now = new Date();
  const expiration = getRefreshTokenExpiration();

  assert(expiration instanceof Date, 'Expiration should be a Date object');

  const diffMs = expiration - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Allow 1 second tolerance
  assert(Math.abs(diffDays - 7) < 0.001, `Expiration should be 7 days from now (got ${diffDays.toFixed(3)} days)`);
});

// Test 10: Multiple tokens are unique
test('Multiple refresh tokens are unique', () => {
  const token1 = generateRefreshToken();
  const token2 = generateRefreshToken();
  const token3 = generateRefreshToken();

  assert(token1 !== token2, 'Refresh tokens should be unique');
  assert(token2 !== token3, 'Refresh tokens should be unique');
  assert(token1 !== token3, 'Refresh tokens should be unique');
});

// Summary
console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
console.log(`${colors.cyan}Results:${colors.reset} ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log(`${colors.green}✓ All JWT tests passed!${colors.reset}`);
  process.exit(0);
} else {
  console.log(`${colors.red}✗ ${failed} test(s) failed${colors.reset}`);
  process.exit(1);
}
