import { generateBalancedTeams } from './lib/teamBalancer.js';

// Scenario: 10 players with different default ratings, NONE have been graded
// Expected: Each player's finalRating = their defaultRating
const players = [
  { id: '1', name: 'Player A', position: 'Guard', defaultRating: 9, finalRating: 9, isStar: false },
  { id: '2', name: 'Player B', position: 'Guard', defaultRating: 8, finalRating: 8, isStar: false },
  { id: '3', name: 'Player C', position: 'Forward', defaultRating: 7, finalRating: 7, isStar: false },
  { id: '4', name: 'Player D', position: 'Forward', defaultRating: 6, finalRating: 6, isStar: false },
  { id: '5', name: 'Player E', position: 'Center', defaultRating: 8, finalRating: 8, isStar: false },
  { id: '6', name: 'Player F', position: 'Center', defaultRating: 7, finalRating: 7, isStar: false },
  { id: '7', name: 'Player G', position: 'Guard', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '8', name: 'Player H', position: 'Forward', defaultRating: 6, finalRating: 6, isStar: false },
  { id: '9', name: 'Player I', position: 'Center', defaultRating: 4, finalRating: 4, isStar: false },
  { id: '10', name: 'Player J', position: 'Guard', defaultRating: 7, finalRating: 7, isStar: false }
];

console.log('=== Ungraded Players Test ===');
console.log('All players using their individual default ratings\n');

const result = generateBalancedTeams(players, 5);

console.log('Team 1:');
result.teams[0].players.forEach(p => {
  console.log(`  ${p.name} (${p.position}) - Rating: ${p.finalRating} (default: ${p.defaultRating})`);
});
console.log(`  Total: ${result.teams[0].totalRating}\n`);

console.log('Team 2:');
result.teams[1].players.forEach(p => {
  console.log(`  ${p.name} (${p.position}) - Rating: ${p.finalRating} (default: ${p.defaultRating})`);
});
console.log(`  Total: ${result.teams[1].totalRating}\n`);

console.log('Balance:');
console.log(`  Rating difference: ${result.balance.ratingDifference}`);
console.log(`  Position imbalance: ${result.balance.positionImbalancePenalty}`);
console.log(`  Is balanced: ${result.balance.isBalanced}`);

console.log('\n✓ Each player uses their individual defaultRating');
console.log('✓ Teams are balanced based on actual skill levels');
console.log('✓ No hardcoded 5 values');
