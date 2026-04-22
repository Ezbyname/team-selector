/**
 * Phase 5 UI Smoke Test
 * Quick automated check that all pages respond correctly
 */

const BASE_URL = 'http://localhost:3001';

const pages = [
  { path: '/home.html', name: 'Home Page', expectedStatus: 200 },
  { path: '/login.html', name: 'Login Page', expectedStatus: 200 },
  { path: '/session-setup.html', name: 'Session Setup (redirects to login)', expectedStatus: 200 },
  { path: '/team-display.html', name: 'Team Display (redirects to setup)', expectedStatus: 200 },
];

let passed = 0;
let failed = 0;

async function testPage(page) {
  try {
    const response = await fetch(`${BASE_URL}${page.path}`, {
      redirect: 'follow'
    });

    if (response.status === page.expectedStatus) {
      console.log(`\x1b[32m✓\x1b[0m ${page.name} - Status ${response.status}`);
      passed++;
      return true;
    } else {
      console.log(`\x1b[31m✗\x1b[0m ${page.name} - Expected ${page.expectedStatus}, got ${response.status}`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`\x1b[31m✗\x1b[0m ${page.name} - ${error.message}`);
    failed++;
    return false;
  }
}

async function runTests() {
  console.log('\n=== Phase 5 UI Smoke Test ===\n');
  console.log('Testing page availability...\n');

  for (const page of pages) {
    await testPage(page);
  }

  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n\x1b[32m✓ All pages load successfully!\x1b[0m');
    console.log('\nNext step: Manual UI validation');
    console.log('Run: node test-phase5-ui.js');
    process.exit(0);
  } else {
    console.log('\n\x1b[31m✗ Some pages failed to load\x1b[0m');
    console.log('Check that the dev server is running on http://localhost:3001');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\nUnexpected error:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('\n✗ ERROR: Dev server is not running!');
    console.error('  Start the server with: vercel dev');
  }
  process.exit(1);
});
