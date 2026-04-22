import { generateBalancedTeams } from './lib/teamBalancer.js';

const players = [
  { id: '1', name: 'Player A', position: 'Guard', defaultRating: 5, finalRating: 9, isStar: true },
  { id: '2', name: 'Player B', position: 'Guard', defaultRating: 5, finalRating: 7, isStar: false },
  { id: '3', name: 'Player C', position: 'Forward', defaultRating: 5, finalRating: 8, isStar: false },
  { id: '4', name: 'Player D', position: 'Forward', defaultRating: 5, finalRating: 6, isStar: false },
  { id: '5', name: 'Player E', position: 'Center', defaultRating: 5, finalRating: 7, isStar: true },
  { id: '6', name: 'Player F', position: 'Center', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '7', name: 'Player G', position: 'Guard', defaultRating: 5, finalRating: 6, isStar: false },
  { id: '8', name: 'Player H', position: 'Forward', defaultRating: 5, finalRating: 8, isStar: false },
  { id: '9', name: 'Player I', position: 'Center', defaultRating: 5, finalRating: 5, isStar: false },
  { id: '10', name: 'Player J', position: 'Guard', defaultRating: 5, finalRating: 7, isStar: false }
];

console.log('=== Example 1 ===');
const result1 = generateBalancedTeams(players, 5);
console.log('Team 1:', result1.teams[0].players.map(p => `${p.name} (${p.position}, R:${p.finalRating}${p.isStar ? ' ⭐' : ''})`));
console.log('Team 1 Rating:', result1.teams[0].totalRating);
console.log('Team 2:', result1.teams[1].players.map(p => `${p.name} (${p.position}, R:${p.finalRating}${p.isStar ? ' ⭐' : ''})`));
console.log('Team 2 Rating:', result1.teams[1].totalRating);
console.log('Balance:', result1.balance);

console.log('\n=== Example 2 ===');
const result2 = generateBalancedTeams(players, 5);
console.log('Team 1:', result2.teams[0].players.map(p => `${p.name} (${p.position}, R:${p.finalRating}${p.isStar ? ' ⭐' : ''})`));
console.log('Team 1 Rating:', result2.teams[0].totalRating);
console.log('Team 2:', result2.teams[1].players.map(p => `${p.name} (${p.position}, R:${p.finalRating}${p.isStar ? ' ⭐' : ''})`));
console.log('Team 2 Rating:', result2.teams[1].totalRating);
console.log('Balance:', result2.balance);

console.log('\n=== Example 3 ===');
const result3 = generateBalancedTeams(players, 5);
console.log('Team 1:', result3.teams[0].players.map(p => `${p.name} (${p.position}, R:${p.finalRating}${p.isStar ? ' ⭐' : ''})`));
console.log('Team 1 Rating:', result3.teams[0].totalRating);
console.log('Team 2:', result3.teams[1].players.map(p => `${p.name} (${p.position}, R:${p.finalRating}${p.isStar ? ' ⭐' : ''})`));
console.log('Team 2 Rating:', result3.teams[1].totalRating);
console.log('Balance:', result3.balance);
