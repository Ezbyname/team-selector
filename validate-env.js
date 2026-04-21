/**
 * Environment Variable Validation Script
 * Run before starting backend tests
 */

console.log('Validating environment configuration...\n');

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
const optional = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'NODE_ENV'];

let hasErrors = false;

// Check required variables
console.log('Required Variables:');
required.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.log(`  ❌ ${key}: MISSING`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const display = key.includes('SECRET') || key.includes('KEY')
      ? value.substring(0, 10) + '...' + value.substring(value.length - 5)
      : value;
    console.log(`  ✓ ${key}: ${display}`);
  }
});

// Validate specific requirements
console.log('\nValidation Checks:');

// JWT_SECRET length
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  if (jwtSecret.length < 32) {
    console.log(`  ❌ JWT_SECRET too short (${jwtSecret.length} chars, need 32+)`);
    hasErrors = true;
  } else {
    console.log(`  ✓ JWT_SECRET length: ${jwtSecret.length} chars`);
  }
}

// SUPABASE_URL format
const supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl) {
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    console.log(`  ❌ SUPABASE_URL invalid format (should be https://xxx.supabase.co)`);
    hasErrors = true;
  } else {
    console.log(`  ✓ SUPABASE_URL format valid`);
  }
}

// Check optional variables
console.log('\nOptional Variables:');
optional.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.log(`  ⚠ ${key}: Not set`);
    if (key.includes('TWILIO')) {
      console.log(`     → OTP will be logged to console (dev mode)`);
    }
  } else {
    const display = key.includes('TOKEN') || key.includes('SID')
      ? value.substring(0, 8) + '...'
      : value;
    console.log(`  ✓ ${key}: ${display}`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ VALIDATION FAILED');
  console.log('\nPlease fix the errors above before proceeding.');
  console.log('See .env.example for reference.\n');
  process.exit(1);
} else {
  console.log('✓ VALIDATION PASSED');
  console.log('\nEnvironment is correctly configured.');
  console.log('You can now run: vercel dev\n');
  process.exit(0);
}
