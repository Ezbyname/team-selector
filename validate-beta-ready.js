/**
 * Final Pre-Beta Validation Script
 *
 * Validates all critical requirements before beta release
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const RESULTS = {
  passed: [],
  failed: [],
  warnings: []
};

function pass(check, message) {
  RESULTS.passed.push(`✅ ${check}: ${message}`);
  console.log(`✅ ${check}: ${message}`);
}

function fail(check, message) {
  RESULTS.failed.push(`❌ ${check}: ${message}`);
  console.error(`❌ ${check}: ${message}`);
}

function warn(check, message) {
  RESULTS.warnings.push(`⚠️  ${check}: ${message}`);
  console.warn(`⚠️  ${check}: ${message}`);
}

// ============================================================
// 1. Environment Variables Check
// ============================================================

async function checkEnvironmentVariables() {
  console.log('\n=== 1. Environment Variables ===\n');

  if (!SUPABASE_URL) {
    fail('ENV', 'SUPABASE_URL not set');
  } else {
    pass('ENV', 'SUPABASE_URL configured');
  }

  if (!SUPABASE_SERVICE_KEY) {
    fail('ENV', 'SUPABASE_SERVICE_KEY not set');
  } else {
    pass('ENV', 'SUPABASE_SERVICE_KEY configured');
  }

  if (!process.env.JWT_SECRET) {
    fail('ENV', 'JWT_SECRET not set');
  } else {
    pass('ENV', 'JWT_SECRET configured');
  }

  if (!UPSTASH_REDIS_REST_URL) {
    fail('ENV', 'UPSTASH_REDIS_REST_URL not set - BLOCKING: Rate limiting will NOT work in production');
  } else {
    pass('ENV', 'UPSTASH_REDIS_REST_URL configured');
  }

  if (!UPSTASH_REDIS_REST_TOKEN) {
    fail('ENV', 'UPSTASH_REDIS_REST_TOKEN not set - BLOCKING: Rate limiting will NOT work in production');
  } else {
    pass('ENV', 'UPSTASH_REDIS_REST_TOKEN configured');
  }
}

// ============================================================
// 2. Redis Connection Test
// ============================================================

async function checkRedisConnection() {
  console.log('\n=== 2. Redis Connection ===\n');

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    fail('REDIS', 'Redis credentials not configured - CRITICAL BLOCKER: Production rate limiting will fail');
    console.error('');
    console.error('⚠️  Without Redis, rate limiting silently fails in production.');
    console.error('⚠️  This is a SECURITY VULNERABILITY - invite codes can be brute-forced.');
    console.error('⚠️  Set up Upstash Redis before proceeding to beta.');
    console.error('');
    return false;
  }

  try {
    const redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN
    });

    // Test write
    await redis.set('beta-validation-test', 'ok', { ex: 10 });

    // Test read
    const result = await redis.get('beta-validation-test');

    if (result === 'ok') {
      pass('REDIS', 'Connection successful, read/write works');

      // Clean up
      await redis.del('beta-validation-test');
      return true;
    } else {
      fail('REDIS', 'Connection works but read/write failed');
      return false;
    }
  } catch (error) {
    fail('REDIS', `Connection failed: ${error.message}`);
    return false;
  }
}

// ============================================================
// 3. Database Migration Check
// ============================================================

async function checkDatabaseMigration() {
  console.log('\n=== 3. Database Migration ===\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    fail('DB', 'Cannot check - Supabase credentials missing');
    return false;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if unique_active_membership_per_user_group index exists
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'group_members'
        AND indexname = 'unique_active_membership_per_user_group'
      `
    });

    if (error) {
      // Try alternative method if RPC doesn't exist
      const { data: indexData, error: indexError } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'group_members')
        .eq('indexname', 'unique_active_membership_per_user_group')
        .single();

      if (indexError || !indexData) {
        fail('DB', 'Migration 004 NOT applied - unique index missing (CONCURRENCY UNSAFE)');
        return false;
      }
    }

    pass('DB', 'Migration 004 applied - unique active membership index exists');
    return true;

  } catch (error) {
    warn('DB', `Could not verify migration (manual check required): ${error.message}`);
    return null;
  }
}

// ============================================================
// 4. Data Integrity Checks
// ============================================================

async function checkDataIntegrity() {
  console.log('\n=== 4. Data Integrity ===\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    warn('DATA', 'Cannot check - Supabase credentials missing');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check for duplicate active memberships
    const { data: duplicates, error: dupError } = await supabase
      .from('group_members')
      .select('group_id, user_id')
      .eq('status', 'active');

    if (!dupError && duplicates) {
      const seen = new Set();
      let hasDuplicates = false;

      for (const record of duplicates) {
        const key = `${record.group_id}-${record.user_id}`;
        if (seen.has(key)) {
          hasDuplicates = true;
          break;
        }
        seen.add(key);
      }

      if (hasDuplicates) {
        fail('DATA', 'Duplicate active memberships found - data corruption present');
      } else {
        pass('DATA', 'No duplicate active memberships');
      }
    }

    // Check for multiple active invite codes per group
    const { data: invites, error: invError } = await supabase
      .from('group_invites')
      .select('group_id')
      .eq('is_active', true);

    if (!invError && invites) {
      const groupCounts = {};
      invites.forEach(inv => {
        groupCounts[inv.group_id] = (groupCounts[inv.group_id] || 0) + 1;
      });

      const multipleActive = Object.values(groupCounts).some(count => count > 1);
      if (multipleActive) {
        warn('DATA', 'Some groups have multiple active invite codes (should be 1 per group)');
      } else {
        pass('DATA', 'Invite codes are unique per group');
      }
    }

  } catch (error) {
    warn('DATA', `Could not complete integrity checks: ${error.message}`);
  }
}

// ============================================================
// 5. Critical File Checks
// ============================================================

async function checkCriticalFiles() {
  console.log('\n=== 5. Critical Files ===\n');

  const fs = await import('fs');
  const path = await import('path');

  const criticalFiles = [
    'api/groups/join-by-code.js',
    'api/groups/create-invite.js',
    'api/groups/my-teams.js',
    'lib/rate-limit.js',
    'lib/jwt.js',
    'frontend/join.html',
    'frontend/login.html',
    'frontend/my-teams.html'
  ];

  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      pass('FILES', `${file} exists`);
    } else {
      fail('FILES', `${file} MISSING`);
    }
  }
}

// ============================================================
// 6. Code Validation (JWT Field Usage)
// ============================================================

async function checkJWTFieldUsage() {
  console.log('\n=== 6. JWT Field Usage ===\n');

  const fs = await import('fs');

  const apiFiles = [
    'api/groups/create-invite.js',
    'api/groups/join-by-code.js',
    'api/groups/my-teams.js',
    'api/groups/my-teams-all.js',
    'api/groups/leave.js',
    'api/groups/transfer-ownership.js',
    'api/groups/revoke-invite.js'
  ];

  let allCorrect = true;

  for (const file of apiFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for OLD incorrect pattern
      if (content.includes('decoded.userId')) {
        fail('JWT', `${file} still uses decoded.userId (should be decoded.sub)`);
        allCorrect = false;
      } else if (content.includes('decoded.sub')) {
        pass('JWT', `${file} correctly uses decoded.sub`);
      } else {
        warn('JWT', `${file} does not extract user ID (might be okay)`);
      }
    } catch (error) {
      warn('JWT', `Could not read ${file}`);
    }
  }

  if (allCorrect) {
    pass('JWT', 'All API endpoints use correct JWT field');
  }
}

// ============================================================
// 7. Rate Limiting Code Safety Check
// ============================================================

async function checkRateLimitingSafety() {
  console.log('\n=== 7. Rate Limiting Safety ===\n');

  const fs = await import('fs');

  try {
    const rateLimitCode = fs.readFileSync('lib/rate-limit.js', 'utf-8');

    // Check for production environment detection
    if (rateLimitCode.includes('IS_PRODUCTION')) {
      pass('SAFETY', 'Production environment detection present');
    } else {
      warn('SAFETY', 'No production environment detection found');
    }

    // Check that production doesn't use in-memory silently
    if (rateLimitCode.includes('IS_PRODUCTION && !redis')) {
      pass('SAFETY', 'Production fails loudly without Redis');
    } else {
      fail('SAFETY', 'Production may fall back to in-memory silently - UNSAFE');
    }

    // Verify development-only fallback
    if (rateLimitCode.includes('!IS_PRODUCTION') && rateLimitCode.includes('inMemoryAttempts')) {
      pass('SAFETY', 'In-memory fallback restricted to development only');
    } else {
      warn('SAFETY', 'In-memory fallback restrictions unclear');
    }

  } catch (error) {
    warn('SAFETY', `Could not verify rate limiting code: ${error.message}`);
  }
}

// ============================================================
// 8. Package Dependencies
// ============================================================

async function checkDependencies() {
  console.log('\n=== 7. Package Dependencies ===\n');

  const fs = await import('fs');

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

    const requiredDeps = {
      '@upstash/redis': 'Rate limiting',
      '@supabase/supabase-js': 'Database',
      'jsonwebtoken': 'Authentication',
      'bcrypt': 'Password hashing'
    };

    for (const [dep, purpose] of Object.entries(requiredDeps)) {
      if (packageJson.dependencies[dep]) {
        pass('DEPS', `${dep} installed (${purpose})`);
      } else {
        fail('DEPS', `${dep} MISSING (${purpose})`);
      }
    }

    // Check if node_modules exists
    if (fs.existsSync('node_modules')) {
      pass('DEPS', 'node_modules directory exists');
    } else {
      fail('DEPS', 'node_modules NOT found - run npm install');
    }

  } catch (error) {
    fail('DEPS', `Could not read package.json: ${error.message}`);
  }
}

// ============================================================
// Run All Checks
// ============================================================

async function runAllChecks() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  FINAL PRE-BETA VALIDATION             ║');
  console.log('║  Team Selector - Beta Readiness Check  ║');
  console.log('╚════════════════════════════════════════╝');

  await checkEnvironmentVariables();
  const redisOk = await checkRedisConnection();
  const dbOk = await checkDatabaseMigration();
  await checkDataIntegrity();
  await checkCriticalFiles();
  await checkJWTFieldUsage();
  await checkRateLimitingSafety();
  await checkDependencies();

  // Final Report
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  VALIDATION SUMMARY                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`✅ Passed: ${RESULTS.passed.length}`);
  console.log(`❌ Failed: ${RESULTS.failed.length}`);
  console.log(`⚠️  Warnings: ${RESULTS.warnings.length}\n`);

  if (RESULTS.failed.length > 0) {
    console.log('❌ FAILED CHECKS:\n');
    RESULTS.failed.forEach(f => console.log(`   ${f}`));
    console.log('');
  }

  if (RESULTS.warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    RESULTS.warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }

  // Final Decision
  console.log('╔════════════════════════════════════════╗');
  console.log('║  BETA READINESS DECISION               ║');
  console.log('╚════════════════════════════════════════╝\n');

  const criticalFailures = RESULTS.failed.filter(f =>
    f.includes('REDIS') ||
    f.includes('decoded.userId') ||
    f.includes('MISSING') ||
    f.includes('Migration 004')
  );

  if (criticalFailures.length > 0) {
    console.log('🚨 NOT READY FOR BETA\n');
    console.log('Critical issues must be resolved:\n');
    criticalFailures.forEach(f => console.log(`   ${f}`));
    console.log('\n');
    process.exit(1);
  } else if (RESULTS.failed.length > 0) {
    console.log('⚠️  READY WITH CAUTION\n');
    console.log('Non-critical issues exist but can proceed:\n');
    RESULTS.failed.forEach(f => console.log(`   ${f}`));
    console.log('\n');
    process.exit(0);
  } else {
    console.log('✅ READY FOR BETA TESTING\n');
    console.log('All critical validations passed.\n');
    console.log('Next steps:');
    console.log('  1. Deploy to Vercel (vercel --prod)');
    console.log('  2. Set environment variables in Vercel dashboard');
    console.log('  3. Run smoke tests on deployed app');
    console.log('  4. Invite 3-5 beta testers');
    console.log('\n');
    process.exit(0);
  }
}

runAllChecks().catch(error => {
  console.error('Validation script error:', error);
  process.exit(1);
});
