/**
 * Phone Normalization Unit Tests
 * Tests E.164 conversion and validation
 */

import { normalizePhone, formatPhone, isValidPhone } from './lib/phone.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
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

console.log(`${colors.cyan}Phone Normalization Unit Tests${colors.reset}\n`);

// Test 1: Normalize Israeli format with dashes
test('Normalize 050-123-4567 → +972501234567', () => {
  const result = normalizePhone('050-123-4567');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

// Test 2: Normalize Israeli format without dashes
test('Normalize 0501234567 → +972501234567', () => {
  const result = normalizePhone('0501234567');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

// Test 3: Already E.164 format preserved
test('Already E.164 format (+972501234567) preserved', () => {
  const result = normalizePhone('+972501234567');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

// Test 4: Without + prefix
test('Normalize 972501234567 → +972501234567', () => {
  const result = normalizePhone('972501234567');
  assert(result === '+972501234567', `Expected +972501234567, got ${result}`);
});

// Test 5: Invalid phone (too short)
test('Reject invalid phone (too short): 050-123', () => {
  const result = normalizePhone('050-123');
  assert(result === null, `Expected null, got ${result}`);
});

// Test 6: Invalid prefix
test('Reject invalid prefix: 040-123-4567', () => {
  const result = normalizePhone('040-123-4567');
  assert(result === null, `Expected null, got ${result}`);
});

// Test 7: All valid Israeli prefixes
test('Accept all valid Israeli prefixes (050-058)', () => {
  const validPrefixes = ['050', '051', '052', '053', '054', '055', '058'];

  for (const prefix of validPrefixes) {
    const result = normalizePhone(`${prefix}-123-4567`);
    assert(result !== null, `Prefix ${prefix} should be valid`);
    assert(result === `+972${prefix.substring(1)}1234567`, `Prefix ${prefix} normalized incorrectly`);
  }
});

// Test 8: Format E.164 to display
test('Format +972501234567 → 050-123-4567', () => {
  const result = formatPhone('+972501234567');
  assert(result === '050-123-4567', `Expected 050-123-4567, got ${result}`);
});

// Test 9: isValidPhone accepts valid number
test('isValidPhone() accepts valid number', () => {
  const result = isValidPhone('050-123-4567');
  assert(result === true, `Expected true, got ${result}`);
});

// Test 10: isValidPhone rejects invalid number
test('isValidPhone() rejects invalid number', () => {
  const result = isValidPhone('040-123-4567');
  assert(result === false, `Expected false, got ${result}`);
});

// Test 11: Handle null/undefined input
test('Handle null input gracefully', () => {
  const result = normalizePhone(null);
  assert(result === null, `Expected null, got ${result}`);
});

// Test 12: Handle empty string
test('Handle empty string gracefully', () => {
  const result = normalizePhone('');
  assert(result === null, `Expected null, got ${result}`);
});

// Test 13: Format invalid E.164 preserves original
test('Format invalid E.164 preserves original', () => {
  const result = formatPhone('invalid');
  assert(result === 'invalid', `Expected original value, got ${result}`);
});

// Summary
console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
console.log(`${colors.cyan}Results:${colors.reset} ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log(`${colors.green}✓ All phone normalization tests passed!${colors.reset}`);
  process.exit(0);
} else {
  console.log(`${colors.red}✗ ${failed} test(s) failed${colors.reset}`);
  process.exit(1);
}
