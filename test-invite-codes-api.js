/**
 * Join Team by Invite Code - API Protocol Tests
 * Tests HTTP methods, headers, security, and edge cases
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
  testGroup: null,
  validCode: null,
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
    ...options.headers,
  };

  // Only add Content-Type if not explicitly set
  if (!options.skipContentType && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
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
// SETUP: Create minimal test data
// ============================================================================

async function setupTestData() {
  log.section();
  log.title('SETUP: Creating Test Data');
  console.log('Setting up minimal data for API tests\n');

  try {
    // Clean up any existing test data
    await supabase.from('auth_users').delete().ilike('phone', 'APITest%');
    await supabase.from('groups').delete().ilike('name', 'APITest%');

    // Create admin user
    const adminPhone = `+972501111${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const { data: adminUser, error: adminError } = await supabase
      .from('auth_users')
      .insert({
        phone: 'APITestAdmin',
        phone_normalized: adminPhone,
        password_hash: '$2b$12$test.hash.placeholder',
        role: 'user',
        phone_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (adminError) throw adminError;
    testState.adminUser = adminUser;

    // Generate JWT
    const jwt = await import('jsonwebtoken');
    testState.adminToken = jwt.default.sign(
      { userId: adminUser.id, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    log.success(`Created admin user: ${adminUser.id}`);

    // Create test group
    const { data: testGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'APITestGroup',
        sport: 'basketball',
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (groupError) throw groupError;
    testState.testGroup = testGroup;

    await supabase.from('group_members').insert({
      group_id: testGroup.id,
      user_id: adminUser.id,
      role: 'admin',
      status: 'active',
    });

    log.success(`Created test group: ${testGroup.id}`);

    // Create a valid invite code for testing
    const { data: invite } = await supabase
      .from('group_invites')
      .insert({
        group_id: testGroup.id,
        code: 'APITEST-VALID',
        created_by: adminUser.id,
        is_active: true,
      })
      .select()
      .single();

    testState.validCode = 'APITEST-VALID';
    log.success('Created valid invite code: APITEST-VALID');

    log.info('\nSetup complete');
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// TEST SUITE 1: HTTP METHOD VALIDATION
// ============================================================================

async function testHttpMethods() {
  log.section();
  log.title('TEST SUITE 1: HTTP Method Validation');
  console.log('Testing that only POST is allowed\n');

  const endpoints = [
    '/api/groups/create-invite',
    '/api/groups/join-by-code',
    '/api/groups/revoke-invite',
  ];

  for (const endpoint of endpoints) {
    log.info(`Testing ${endpoint}...`);

    // Test GET
    const getResponse = await request(endpoint, {
      method: 'GET',
      token: testState.adminToken,
    });
    assert(
      getResponse.status === 405,
      `  GET ${endpoint} rejected with 405 (got ${getResponse.status})`
    );
    assert(
      getResponse.contentType?.includes('application/json'),
      `  GET returns JSON error`
    );

    // Test PUT
    const putResponse = await request(endpoint, {
      method: 'PUT',
      token: testState.adminToken,
      body: {},
    });
    assert(
      putResponse.status === 405,
      `  PUT ${endpoint} rejected with 405 (got ${putResponse.status})`
    );

    // Test DELETE
    const deleteResponse = await request(endpoint, {
      method: 'DELETE',
      token: testState.adminToken,
    });
    assert(
      deleteResponse.status === 405,
      `  DELETE ${endpoint} rejected with 405 (got ${deleteResponse.status})`
    );

    // Test PATCH
    const patchResponse = await request(endpoint, {
      method: 'PATCH',
      token: testState.adminToken,
      body: {},
    });
    assert(
      patchResponse.status === 405,
      `  PATCH ${endpoint} rejected with 405 (got ${patchResponse.status})`
    );

    console.log(); // Blank line between endpoints
  }
}

// ============================================================================
// TEST SUITE 2: CORS HEADERS
// ============================================================================

async function testCorsHeaders() {
  log.section();
  log.title('TEST SUITE 2: CORS Headers');
  console.log('Testing CORS configuration\n');

  const endpoints = [
    '/api/groups/create-invite',
    '/api/groups/join-by-code',
    '/api/groups/revoke-invite',
  ];

  for (const endpoint of endpoints) {
    log.info(`Testing CORS on ${endpoint}...`);

    // Test OPTIONS (preflight)
    const optionsResponse = await request(endpoint, {
      method: 'OPTIONS',
    });

    assert(
      optionsResponse.status === 200,
      `  OPTIONS ${endpoint} returns 200 (got ${optionsResponse.status})`
    );

    // Check CORS headers
    const headers = optionsResponse.headers;
    warn(
      headers['access-control-allow-origin'],
      `  Has Access-Control-Allow-Origin header`
    );
    warn(
      headers['access-control-allow-methods']?.includes('POST'),
      `  Allows POST method`
    );
    warn(
      headers['access-control-allow-headers']?.includes('Authorization'),
      `  Allows Authorization header`
    );

    // Test POST with CORS
    const postResponse = await request(endpoint, {
      method: 'POST',
      token: testState.adminToken,
      body: { groupId: testState.testGroup.id },
    });

    warn(
      postResponse.headers['access-control-allow-origin'],
      `  POST response includes CORS headers`
    );

    console.log();
  }
}

// ============================================================================
// TEST SUITE 3: REQUEST BODY VALIDATION
// ============================================================================

async function testRequestBodyValidation() {
  log.section();
  log.title('TEST SUITE 3: Request Body Validation');
  console.log('Testing malformed and invalid request bodies\n');

  // Test 3.1: Malformed JSON
  log.info('Test 3.1: Malformed JSON body...');
  const malformedResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    skipContentType: true,
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid json here',
  });

  assert(
    malformedResponse.status === 400 || malformedResponse.status === 500,
    `Malformed JSON rejected (got ${malformedResponse.status})`
  );

  // Test 3.2: Empty body
  log.info('\nTest 3.2: Empty request body...');
  const emptyResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: {},
  });

  assert(
    emptyResponse.status === 400,
    `Empty body rejected with 400 (got ${emptyResponse.status})`
  );
  assert(
    emptyResponse.data.error !== undefined,
    'Error message returned for empty body'
  );

  // Test 3.3: Wrong data types
  log.info('\nTest 3.3: Wrong data types in request...');
  const wrongTypeResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: 12345 }, // Number instead of UUID string
  });

  assert(
    wrongTypeResponse.status === 400 || wrongTypeResponse.status === 404,
    `Wrong data type handled (got ${wrongTypeResponse.status})`
  );

  // Test 3.4: Extra fields (should be ignored)
  log.info('\nTest 3.4: Extra fields in request...');
  const extraFieldsResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: {
      groupId: testState.testGroup.id,
      extraField: 'should be ignored',
      malicious: '<script>alert("xss")</script>',
    },
  });

  // Should work - extra fields ignored
  assert(
    extraFieldsResponse.status === 200,
    'Extra fields ignored, request succeeds'
  );

  // Test 3.5: Missing Content-Type header
  log.info('\nTest 3.5: Missing Content-Type header...');
  const noContentTypeResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    skipContentType: true,
    body: JSON.stringify({ groupId: testState.testGroup.id }),
  });

  // Should still work - most frameworks handle this
  warn(
    noContentTypeResponse.status === 200 || noContentTypeResponse.status === 400,
    'Request without Content-Type handled gracefully'
  );
}

// ============================================================================
// TEST SUITE 4: SECURITY - INJECTION ATTEMPTS
// ============================================================================

async function testSecurityInjection() {
  log.section();
  log.title('TEST SUITE 4: Security - Injection Attempts');
  console.log('Testing SQL injection and XSS prevention\n');

  // Test 4.1: SQL Injection in code
  log.info('Test 4.1: SQL injection attempt in invite code...');
  const sqlInjectionCodes = [
    "'; DROP TABLE group_invites; --",
    "' OR '1'='1",
    "1' UNION SELECT * FROM auth_users --",
    "admin'--",
    "' OR 1=1 --",
  ];

  for (const maliciousCode of sqlInjectionCodes) {
    const response = await request('/api/groups/join-by-code', {
      method: 'POST',
      token: testState.adminToken,
      body: { code: maliciousCode },
    });

    // Should be safely rejected as invalid code
    assert(
      response.status === 404 || response.status === 400,
      `  SQL injection safely rejected: "${maliciousCode.substring(0, 20)}..."`
    );
  }

  // Test 4.2: XSS attempts
  log.info('\nTest 4.2: XSS attempts in request...');
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<svg onload=alert(1)>',
  ];

  for (const payload of xssPayloads) {
    const response = await request('/api/groups/join-by-code', {
      method: 'POST',
      token: testState.adminToken,
      body: { code: payload },
    });

    // Should be safely rejected
    assert(
      response.status === 404 || response.status === 400,
      `  XSS payload safely rejected`
    );

    // Verify response doesn't reflect payload
    const responseStr = JSON.stringify(response.data);
    assert(
      !responseStr.includes('<script>') && !responseStr.includes('<img'),
      `  Response doesn't reflect XSS payload`
    );
  }

  // Test 4.3: Path traversal
  log.info('\nTest 4.3: Path traversal attempts...');
  const pathTraversalPayloads = [
    '../../../etc/passwd',
    '..\\..\\windows\\system32',
    '%2e%2e%2f',
  ];

  for (const payload of pathTraversalPayloads) {
    const response = await request('/api/groups/join-by-code', {
      method: 'POST',
      token: testState.adminToken,
      body: { code: payload },
    });

    assert(
      response.status === 404 || response.status === 400,
      `  Path traversal safely rejected`
    );
  }

  // Test 4.4: UUID injection
  log.info('\nTest 4.4: UUID format validation...');
  const invalidUUIDs = [
    'not-a-uuid',
    '123',
    "'; DROP TABLE groups; --",
    '../../../secret',
  ];

  for (const invalidUUID of invalidUUIDs) {
    const response = await request('/api/groups/create-invite', {
      method: 'POST',
      token: testState.adminToken,
      body: { groupId: invalidUUID },
    });

    assert(
      response.status === 400 || response.status === 404,
      `  Invalid UUID safely rejected`
    );
  }
}

// ============================================================================
// TEST SUITE 5: TOKEN VALIDATION
// ============================================================================

async function testTokenValidation() {
  log.section();
  log.title('TEST SUITE 5: Token Validation');
  console.log('Testing JWT token edge cases\n');

  // Test 5.1: Missing Authorization header
  log.info('Test 5.1: Missing Authorization header...');
  const noAuthResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    body: { groupId: testState.testGroup.id },
  });

  assert(
    noAuthResponse.status === 401,
    `Missing auth rejected with 401 (got ${noAuthResponse.status})`
  );
  assert(
    noAuthResponse.contentType?.includes('application/json'),
    'Returns JSON error'
  );

  // Test 5.2: Malformed Authorization header
  log.info('\nTest 5.2: Malformed Authorization header...');
  const malformedHeaders = [
    'InvalidFormat',
    'Bearer',
    'Bearer ',
    'Basic dGVzdDp0ZXN0',
    'bearer lowercase',
  ];

  for (const header of malformedHeaders) {
    const response = await request('/api/groups/create-invite', {
      method: 'POST',
      headers: { Authorization: header },
      body: { groupId: testState.testGroup.id },
    });

    assert(
      response.status === 401,
      `  Malformed header rejected: "${header}"`
    );
  }

  // Test 5.3: Invalid JWT format
  log.info('\nTest 5.3: Invalid JWT format...');
  const invalidTokens = [
    'not.a.jwt',
    'invalid',
    'a.b',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
  ];

  for (const token of invalidTokens) {
    const response = await request('/api/groups/create-invite', {
      method: 'POST',
      token: token,
      body: { groupId: testState.testGroup.id },
    });

    assert(
      response.status === 401,
      `  Invalid JWT format rejected`
    );
  }

  // Test 5.4: Expired token
  log.info('\nTest 5.4: Expired token...');
  const jwt = await import('jsonwebtoken');
  const expiredToken = jwt.default.sign(
    { userId: testState.adminUser.id, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '-1h' } // Expired 1 hour ago
  );

  const expiredResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: expiredToken,
    body: { groupId: testState.testGroup.id },
  });

  assert(
    expiredResponse.status === 401,
    `Expired token rejected with 401 (got ${expiredResponse.status})`
  );

  // Test 5.5: Token with missing claims
  log.info('\nTest 5.5: Token with missing userId...');
  const missingClaimsToken = jwt.default.sign(
    { role: 'user' }, // Missing userId
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const missingClaimsResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: missingClaimsToken,
    body: { groupId: testState.testGroup.id },
  });

  // Should fail when trying to use userId
  assert(
    missingClaimsResponse.status >= 400,
    `Token with missing claims handled (got ${missingClaimsResponse.status})`
  );
}

// ============================================================================
// TEST SUITE 6: RESPONSE FORMAT VALIDATION
// ============================================================================

async function testResponseFormat() {
  log.section();
  log.title('TEST SUITE 6: Response Format Validation');
  console.log('Testing that all responses follow consistent format\n');

  // Test 6.1: Success responses
  log.info('Test 6.1: Success response format...');
  const successResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: testState.testGroup.id },
  });

  if (successResponse.status === 200) {
    assert(
      successResponse.data.success === true,
      'Success response has success=true'
    );
    assert(
      successResponse.contentType?.includes('application/json'),
      'Success response is JSON'
    );
  }

  // Test 6.2: Error responses
  log.info('\nTest 6.2: Error response format...');
  const errorResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: { groupId: '00000000-0000-0000-0000-000000000000' },
  });

  assert(
    errorResponse.status === 404,
    'Error returns appropriate status code'
  );
  assert(
    errorResponse.data.error !== undefined,
    'Error response has error field'
  );
  assert(
    typeof errorResponse.data.error === 'string',
    'Error message is a string'
  );
  assert(
    errorResponse.contentType?.includes('application/json'),
    'Error response is JSON'
  );

  // Test 6.3: All error responses return JSON
  log.info('\nTest 6.3: All errors return JSON (not HTML)...');
  const errorScenarios = [
    { endpoint: '/api/groups/create-invite', method: 'GET', expectedStatus: 405 },
    { endpoint: '/api/groups/join-by-code', method: 'POST', body: {}, expectedStatus: 400 },
    { endpoint: '/api/groups/revoke-invite', method: 'POST', expectedStatus: 401 },
  ];

  for (const scenario of errorScenarios) {
    const response = await request(scenario.endpoint, {
      method: scenario.method,
      body: scenario.body,
    });

    assert(
      response.contentType?.includes('application/json'),
      `  ${scenario.method} ${scenario.endpoint} returns JSON error`
    );
    assert(
      !response.contentType?.includes('text/html'),
      `  Not returning HTML error page`
    );
  }
}

// ============================================================================
// TEST SUITE 7: EDGE CASES
// ============================================================================

async function testEdgeCases() {
  log.section();
  log.title('TEST SUITE 7: Edge Cases');
  console.log('Testing unusual but valid inputs\n');

  // Test 7.1: Very long invite code
  log.info('Test 7.1: Very long invite code...');
  const longCode = 'A'.repeat(1000);
  const longCodeResponse = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.adminToken,
    body: { code: longCode },
  });

  assert(
    longCodeResponse.status === 404 || longCodeResponse.status === 400,
    `Long code handled gracefully (got ${longCodeResponse.status})`
  );

  // Test 7.2: Special characters in code
  log.info('\nTest 7.2: Special characters in invite code...');
  const specialCodes = [
    'TEST-!@#$',
    'TEST-😀😀😀',
    'TEST-\n\r\t',
    'TEST-\\n\\r',
    'TEST-"quotes"',
  ];

  for (const code of specialCodes) {
    const response = await request('/api/groups/join-by-code', {
      method: 'POST',
      token: testState.adminToken,
      body: { code },
    });

    assert(
      response.status === 404 || response.status === 400,
      `  Special characters handled: "${code.substring(0, 20)}"`
    );
  }

  // Test 7.3: Unicode normalization
  log.info('\nTest 7.3: Unicode normalization...');
  const unicodeCodes = [
    'TËST-CODE', // With diacritics
    '测试-CODE', // Chinese characters
    'тест-CODE', // Cyrillic
    'テスト-CODE', // Japanese
  ];

  for (const code of unicodeCodes) {
    const response = await request('/api/groups/join-by-code', {
      method: 'POST',
      token: testState.adminToken,
      body: { code },
    });

    assert(
      response.status === 404 || response.status === 400,
      `  Unicode handled: "${code}"`
    );
  }

  // Test 7.4: Null bytes
  log.info('\nTest 7.4: Null bytes in input...');
  const nullByteResponse = await request('/api/groups/join-by-code', {
    method: 'POST',
    token: testState.adminToken,
    body: { code: 'TEST\x00CODE' },
  });

  assert(
    nullByteResponse.status >= 400,
    'Null bytes handled safely'
  );

  // Test 7.5: Large request body
  log.info('\nTest 7.5: Large request body...');
  const largeBody = {
    groupId: testState.testGroup.id,
    extraData: 'x'.repeat(10000),
  };

  const largeBodyResponse = await request('/api/groups/create-invite', {
    method: 'POST',
    token: testState.adminToken,
    body: largeBody,
  });

  // Should work (extra data ignored) or reject if payload too large
  assert(
    largeBodyResponse.status === 200 || largeBodyResponse.status === 413,
    `Large payload handled (got ${largeBodyResponse.status})`
  );

  // Test 7.6: Rapid repeated requests
  log.info('\nTest 7.6: Rapid repeated requests...');
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      request('/api/groups/create-invite', {
        method: 'POST',
        token: testState.adminToken,
        body: { groupId: testState.testGroup.id },
      })
    );
  }

  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.status === 200).length;

  assert(
    successCount >= 1,
    `Rapid requests handled (${successCount}/5 succeeded)`
  );
  warn(
    successCount === 5,
    'All rapid requests succeeded (no rate limiting)'
  );
}

// ============================================================================
// TEST SUITE 8: CONCURRENT OPERATIONS
// ============================================================================

async function testConcurrentOperations() {
  log.section();
  log.title('TEST SUITE 8: Concurrent Operations');
  console.log('Testing race conditions and concurrent requests\n');

  // Test 8.1: Concurrent code creation
  log.info('Test 8.1: Concurrent invite code creation...');
  const createPromises = [];
  for (let i = 0; i < 3; i++) {
    createPromises.push(
      request('/api/groups/create-invite', {
        method: 'POST',
        token: testState.adminToken,
        body: { groupId: testState.testGroup.id },
      })
    );
  }

  const createResults = await Promise.all(createPromises);
  const successfulCreates = createResults.filter(r => r.status === 200);

  assert(
    successfulCreates.length > 0,
    'At least one concurrent create succeeds'
  );

  // Check codes are unique
  const codes = successfulCreates.map(r => r.data.inviteCode);
  const uniqueCodes = new Set(codes);
  assert(
    uniqueCodes.size === codes.length,
    'All concurrent codes are unique'
  );

  // Test 8.2: Concurrent joins with same code
  log.info('\nTest 8.2: Multiple users joining with same code concurrently...');

  // Create multiple test users
  const jwt = await import('jsonwebtoken');
  const userTokens = [];

  for (let i = 0; i < 3; i++) {
    const phone = `+97250333${i}${Math.floor(Math.random() * 1000)}`;
    const { data: user } = await supabase
      .from('auth_users')
      .insert({
        phone: `APITestConcurrent${i}`,
        phone_normalized: phone,
        password_hash: '$2b$12$test.hash.placeholder',
        role: 'user',
        phone_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    const token = jwt.default.sign(
      { userId: user.id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    userTokens.push({ user, token });
  }

  // All join concurrently
  const joinPromises = userTokens.map(({ token }) =>
    request('/api/groups/join-by-code', {
      method: 'POST',
      token,
      body: { code: testState.validCode },
    })
  );

  const joinResults = await Promise.all(joinPromises);
  const successfulJoins = joinResults.filter(r => r.status === 200);

  assert(
    successfulJoins.length === 3,
    `All concurrent joins succeed (${successfulJoins.length}/3)`
  );

  // Verify no duplicate memberships
  const { data: memberships } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', testState.testGroup.id)
    .in('user_id', userTokens.map(u => u.user.id));

  assert(
    memberships.length === 3,
    'No duplicate memberships from concurrent joins'
  );

  // Clean up test users
  for (const { user } of userTokens) {
    await supabase.from('auth_users').delete().eq('id', user.id);
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

async function cleanupTestData() {
  log.section();
  log.title('CLEANUP: Removing Test Data');
  console.log('Cleaning up test data\n');

  try {
    await supabase.from('groups').delete().ilike('name', 'APITest%');
    log.success('Deleted test groups');

    await supabase.from('auth_users').delete().ilike('phone', 'APITest%');
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
║        INVITE CODE API PROTOCOL TESTS                        ║
║        HTTP Methods, Security, Edge Cases                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  log.info(`Base URL: ${BASE_URL}`);
  log.info(`Testing API-level behavior and security\n`);

  try {
    await setupTestData();
    await testHttpMethods();
    await testCorsHeaders();
    await testRequestBodyValidation();
    await testSecurityInjection();
    await testTokenValidation();
    await testResponseFormat();
    await testEdgeCases();
    await testConcurrentOperations();
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
    console.log(`${colors.yellow}Warnings:${colors.reset} ${stats.warnings}`);
    console.log(`${colors.bright}Pass Rate:${colors.reset} ${color}${passRate}%${colors.reset}`);

    console.log();

    if (stats.failed === 0) {
      log.success('ALL API TESTS PASSED! ✓');
      console.log('\nAPI endpoints are secure and production-ready.');
    } else {
      log.error(`${stats.failed} TEST(S) FAILED!`);
      console.log('\nPlease fix failing tests before deploying.');
    }

    if (stats.warnings > 0) {
      log.warning(`\n${stats.warnings} warning(s) found. Review recommended.`);
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
