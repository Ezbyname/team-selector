/**
 * Unit Tests for Team Balancing Algorithm
 */

import { generateBalancedTeams, shuffle, calculateImbalance } from './lib/teamBalancer.js';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, condition, details = '') {
  results.tests.push({ name, passed: condition, details });
  if (condition) {
    results.passed++;
    console.log(`✓ ${name}`);
  } else {
    results.failed++;
    console.log(`✗ ${name}`);
    if (details) console.log(`  ${details}`);
  }
}

// Test 1: Equal ratings, different positions
console.log('\n=== Test 1: Equal ratings, different positions ===');
const test1Players = [
  { id: '1', name: 'P1', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '2', name: 'P2', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '3', name: 'P3', position: 'Forward', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '4', name: 'P4', position: 'Forward', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '5', name: 'P5', position: 'Center', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '6', name: 'P6', position: 'Center', defaultRating: 5, finalRating: 5, isStar: false }
];

const result1 = generateBalancedTeams(test1Players, 3);
console.log('Team 1:', result1.teams[0].positionBreakdown);
console.log('Team 2:', result1.teams[1].positionBreakdown);

test('Test 1: Both teams have 3 players',
  result1.teams[0].players.length === 3 && result1.teams[1].players.length === 3);
test('Test 1: Each team has 1 Guard',
  result1.teams[0].positionBreakdown.Guard === 1 && result1.teams[1].positionBreakdown.Guard === 1);
test('Test 1: Each team has 1 Forward',
  result1.teams[0].positionBreakdown.Forward === 1 && result1.teams[1].positionBreakdown.Forward === 1);
test('Test 1: Each team has 1 Center',
  result1.teams[0].positionBreakdown.Center === 1 && result1.teams[1].positionBreakdown.Center === 1);

// Test 2: Unequal ratings, same position
console.log('\n=== Test 2: Unequal ratings, same position ===');
const test2Players = [
  { id: '1', name: 'P1', position: 'Guard', defaultRating: 10, finalRating: 10, isStar: false },
  { id: '2', name: 'P2', position: 'Guard', defaultRating: 8, finalRating: 8, isStar: false },
  { id: '3', name: 'P3', position: 'Guard', defaultRating: 6, finalRating: 6, isStar: false },
  { id: '4', name: 'P4', position: 'Guard', defaultRating: 4, finalRating: 4, isStar: false }
];

const result2 = generateBalancedTeams(test2Players, 2);
console.log('Team 1 rating:', result2.teams[0].totalRating);
console.log('Team 2 rating:', result2.teams[1].totalRating);

test('Test 2: Both teams have 2 players',
  result2.teams[0].players.length === 2 && result2.teams[1].players.length === 2);
test('Test 2: Ratings balanced (diff ≤ 2)',
  result2.balance.ratingDifference <= 2,
  `Rating difference: ${result2.balance.ratingDifference}`);

// Test 3: Star distribution
console.log('\n=== Test 3: Star distribution ===');
const test3Players = [
  { id: '1', name: 'P1', position: 'Guard', defaultRating: 8, finalRating: 8, isStar: true },
  { id: '2', name: 'P2', position: 'Forward', defaultRating: 7, finalRating: 7, isStar: false },
  { id: '3', name: 'P3', position: 'Center', defaultRating: 6, finalRating: 6, isStar: true },
  { id: '4', name: 'P4', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false }
];

const result3 = generateBalancedTeams(test3Players, 2);
console.log('Team 1 stars:', result3.teams[0].starCount);
console.log('Team 2 stars:', result3.teams[1].starCount);

test('Test 3: Stars distributed evenly',
  result3.balance.starDifference === 0,
  `Star difference: ${result3.balance.starDifference}`);

// Test 4: Odd number with bench
console.log('\n=== Test 4: Odd number with bench ===');
const test4Players = [
  { id: '1', name: 'P1', position: 'Guard', defaultRating: 7, finalRating: 7, isStar: false },
  { id: '2', name: 'P2', position: 'Forward', defaultRating: 6, finalRating: 6, isStar: false },
  { id: '3', name: 'P3', position: 'Center', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '4', name: 'P4', position: 'Guard', defaultRating: 8, finalRating: 8, isStar: false },
  { id: '5', name: 'P5', position: 'Forward', defaultRating: 7, finalRating: 7, isStar: false },
  { id: '6', name: 'P6', position: 'Center', defaultRating: 6, finalRating: 6, isStar: false },
  { id: '7', name: 'P7', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false }
];

const result4 = generateBalancedTeams(test4Players, 3);
console.log('Team 1 size:', result4.teams[0].players.length);
console.log('Team 2 size:', result4.teams[1].players.length);
console.log('Bench size:', result4.bench.length);

test('Test 4: Each team has 3 players',
  result4.teams[0].players.length === 3 && result4.teams[1].players.length === 3);
test('Test 4: 1 player on bench',
  result4.bench.length === 1);

// Test 5: All default ratings (no grading)
console.log('\n=== Test 5: All default ratings (no grading) ===');
const test5Players = [
  { id: '1', name: 'P1', position: 'Guard', defaultRating: 5, finalRating: null, isStar: false },
  { id: '2', name: 'P2', position: 'Forward', defaultRating: 5, finalRating: null, isStar: false },
  { id: '3', name: 'P3', position: 'Center', defaultRating: 5, finalRating: null, isStar: false },
  { id: '4', name: 'P4', position: 'Guard', defaultRating: 5, finalRating: null, isStar: false },
  { id: '5', name: 'P5', position: 'Forward', defaultRating: 5, finalRating: null, isStar: false },
  { id: '6', name: 'P6', position: 'Center', defaultRating: 5, finalRating: null, isStar: false }
];

const result5 = generateBalancedTeams(test5Players, 3);
console.log('Team 1 rating:', result5.teams[0].totalRating);
console.log('Team 2 rating:', result5.teams[1].totalRating);

test('Test 5: Teams have equal ratings (all default)',
  result5.balance.ratingDifference === 0);
test('Test 5: Position balanced',
  result5.balance.positionImbalancePenalty <= 2,
  `Position imbalance: ${result5.balance.positionImbalancePenalty}`);

// Test 6: Real scenario (mixed ratings)
console.log('\n=== Test 6: Real scenario (15 players, mixed ratings) ===');
const test6Players = [
  { id: '1', name: 'Player A', position: 'Guard', defaultRating: 5, finalRating: 8, isStar: true },
  { id: '2', name: 'Player B', position: 'Guard', defaultRating: 5, finalRating: 7, isStar: false },
  { id: '3', name: 'Player C', position: 'Forward', defaultRating: 5, finalRating: 6, isStar: false },
  { id: '4', name: 'Player D', position: 'Forward', defaultRating: 5, finalRating: 9, isStar: true },
  { id: '5', name: 'Player E', position: 'Center', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '6', name: 'Player F', position: 'Guard', defaultRating: 5, finalRating: 7, isStar: false },
  { id: '7', name: 'Player G', position: 'Forward', defaultRating: 5, finalRating: 6, isStar: false },
  { id: '8', name: 'Player H', position: 'Center', defaultRating: 5, finalRating: 8, isStar: false },
  { id: '9', name: 'Player I', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '10', name: 'Player J', position: 'Forward', defaultRating: 5, finalRating: 7, isStar: false },
  { id: '11', name: 'Player K', position: 'Center', defaultRating: 5, finalRating: 6, isStar: false },
  { id: '12', name: 'Player L', position: 'Guard', defaultRating: 5, finalRating: 8, isStar: true },
  { id: '13', name: 'Player M', position: 'Forward', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '14', name: 'Player N', position: 'Center', defaultRating: 5, finalRating: 7, isStar: false },
  { id: '15', name: 'Player O', position: 'Guard', defaultRating: 5, finalRating: 6, isStar: false }
];

const result6 = generateBalancedTeams(test6Players, 5);
console.log('Team 1 rating:', result6.teams[0].totalRating);
console.log('Team 2 rating:', result6.teams[1].totalRating);
console.log('Rating difference:', result6.balance.ratingDifference);
console.log('Star difference:', result6.balance.starDifference);
console.log('Bench size:', result6.bench.length);

test('Test 6: Each team has 5 players',
  result6.teams[0].players.length === 5 && result6.teams[1].players.length === 5);
test('Test 6: Ratings balanced (diff ≤ 5)',
  result6.balance.ratingDifference <= 5,
  `Rating difference: ${result6.balance.ratingDifference}`);
test('Test 6: Stars balanced',
  result6.balance.starDifference <= 1,
  `Star difference: ${result6.balance.starDifference}`);
test('Test 6: 5 players on bench',
  result6.bench.length === 5);

// Test 7: Shuffle randomness
console.log('\n=== Test 7: Shuffle produces different results ===');
const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const shuffle1 = shuffle(testArray);
const shuffle2 = shuffle(testArray);
const shuffle3 = shuffle(testArray);

const allSame = JSON.stringify(shuffle1) === JSON.stringify(shuffle2) &&
                 JSON.stringify(shuffle2) === JSON.stringify(shuffle3);

test('Test 7: Shuffle produces different results',
  !allSame,
  `All shuffles identical: ${allSame}`);

// Test 8: Error handling - not enough players
console.log('\n=== Test 8: Error handling ===');
try {
  generateBalancedTeams([{ id: '1', name: 'P1', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false }], 2);
  test('Test 8: Error on 1 player', false, 'Should have thrown error');
} catch (error) {
  test('Test 8: Error on 1 player', error.message.includes('at least 2'), error.message);
}

// Test 9: Team size penalty verification
console.log('\n=== Test 9: Team size penalty ===');
const test9Players = [
  { id: '1', name: 'P1', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '2', name: 'P2', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '3', name: 'P3', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false }
];

const result9 = generateBalancedTeams(test9Players, 2);
console.log('Team 1 size:', result9.teams[0].players.length);
console.log('Team 2 size:', result9.teams[1].players.length);
console.log('Team size difference:', result9.balance.teamSizeDifference);

test('Test 9: Team size difference calculated',
  result9.balance.teamSizeDifference === 1);

// Print summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Total: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed === 0) {
  console.log('\n✓ ALL TESTS PASSED!');
  process.exit(0);
} else {
  console.log('\n✗ SOME TESTS FAILED!');
  process.exit(1);
}
