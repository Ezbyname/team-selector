/**
 * Test: Rate Limiting Safety in Production
 *
 * Verifies that rate limiting fails loudly in production without Redis
 *
 * Run with: NODE_ENV=production node test-rate-limit-safety.js
 */

// Import rate limiting
import { checkRateLimit, isRateLimitingConfigured, isProduction } from './lib/rate-limit.js';

async function testProductionSafety() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST: Rate Limiting Safety in Production                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Test 1: Verify production mode detected
  console.log('Test 1: Production Mode Detection');
  const isProd = isProduction();
  if (isProd) {
    console.log('  ✅ Production mode detected');
  } else {
    console.log('  ❌ FAILED: Production mode not detected');
    process.exit(1);
  }

  // Test 2: Verify Redis not configured
  console.log('\nTest 2: Redis Configuration Check');
  const isConfigured = isRateLimitingConfigured();
  if (!isConfigured) {
    console.log('  ✅ Redis correctly detected as NOT configured');
  } else {
    console.log('  ❌ FAILED: Redis shows as configured when it should not be');
    process.exit(1);
  }

  // Test 3: Verify rate limiting fails loudly (does NOT silently allow)
  console.log('\nTest 3: Rate Limiting Behavior Without Redis');
  const result = await checkRateLimit('test-user-123', 5, 60000);

  console.log('  Result:', result);

  if (result.allowed === false) {
    console.log('  ✅ Rate limiting DENIES request (fail closed)');
  } else {
    console.log('  ❌ FAILED: Rate limiting allowed request without Redis');
    process.exit(1);
  }

  if (result.error) {
    console.log(`  ✅ Error message present: "${result.error}"`);
  } else {
    console.log('  ⚠️  WARNING: No error message, but request was denied');
  }

  // Test 4: Verify no silent in-memory fallback
  console.log('\nTest 4: No Silent In-Memory Fallback');
  const attempts = [];
  for (let i = 0; i < 10; i++) {
    const result = await checkRateLimit(`test-user-${i}`, 5, 60000);
    attempts.push(result.allowed);
  }

  const anyAllowed = attempts.some(a => a === true);
  if (!anyAllowed) {
    console.log('  ✅ All requests denied (no silent fallback to in-memory)');
  } else {
    console.log('  ❌ FAILED: Some requests were allowed (silent fallback detected)');
    console.log(`     Allowed: ${attempts.filter(a => a).length}/10`);
    process.exit(1);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST RESULT: PASS ✅                                      ║');
  console.log('║                                                            ║');
  console.log('║  Rate limiting correctly fails in production without Redis║');
  console.log('║  No silent fallback to in-memory Map()                    ║');
  console.log('║  Security vulnerability FIXED                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

testProductionSafety().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
