/**
 * Team Balancing Algorithm
 * Multi-candidate strategy with scoring optimization
 */

/**
 * Fisher-Yates shuffle implementation
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculate total rating for a team
 * @param {Array} team - Array of players
 * @returns {number} - Sum of finalRating for all players
 */
function sumRatings(team) {
  return team.reduce((sum, player) => sum + (player.finalRating || player.defaultRating || 5), 0);
}

// Star player logic removed - balancing uses ratings only

/**
 * Calculate position imbalance penalty between two teams
 * @param {Array} team1 - First team
 * @param {Array} team2 - Second team
 * @returns {number} - Position imbalance penalty
 */
function calculatePositionImbalance(team1, team2) {
  const positions1 = {};
  const positions2 = {};

  team1.forEach(p => {
    positions1[p.position] = (positions1[p.position] || 0) + 1;
  });

  team2.forEach(p => {
    positions2[p.position] = (positions2[p.position] || 0) + 1;
  });

  // Get all unique positions
  const allPositions = new Set([...Object.keys(positions1), ...Object.keys(positions2)]);

  let penalty = 0;
  allPositions.forEach(pos => {
    const count1 = positions1[pos] || 0;
    const count2 = positions2[pos] || 0;
    penalty += Math.abs(count1 - count2);
  });

  return penalty;
}

/**
 * Calculate imbalance score between two teams
 * Lower score = better balance
 * @param {Array} team1 - First team
 * @param {Array} team2 - Second team
 * @returns {number} - Imbalance score
 */
function calculateImbalance(team1, team2) {
  const teamSizeDiff = Math.abs(team1.length - team2.length);
  const ratingDiff = Math.abs(sumRatings(team1) - sumRatings(team2));
  const posDiff = calculatePositionImbalance(team1, team2);

  return (
    teamSizeDiff * 20 +
    ratingDiff * 10 +
    posDiff * 5
  );
}

/**
 * Find best team index for a player
 * @param {Array} teams - Array of teams
 * @param {Object} player - Player to assign
 * @param {number} teamSize - Maximum team size
 * @returns {number} - Team index (0 or 1)
 */
function getBestTeamIndex(teams, player, teamSize) {
  // If one team is full, use the other
  if (teams[0].length >= teamSize) return 1;
  if (teams[1].length >= teamSize) return 0;

  // Calculate imbalance for each option
  const score0 = calculateImbalance([...teams[0], player], teams[1]);
  const score1 = calculateImbalance(teams[0], [...teams[1], player]);

  return score0 <= score1 ? 0 : 1;
}

/**
 * Allocate players to teams using greedy assignment
 * @param {Array} players - Players to allocate
 * @param {number} teamSize - Players per team
 * @returns {Array} - Array of two teams
 */
function allocateToTeams(players, teamSize) {
  const teams = [[], []];

  for (const player of players) {
    const teamIndex = getBestTeamIndex(teams, player, teamSize);
    teams[teamIndex].push(player);
  }

  return teams;
}

/**
 * Find all connected player groups (prefer_together connections)
 * @param {Array} players - All players
 * @param {Array} connections - Array of {playerAId, playerBId, connectionType}
 * @returns {Array} - Array of player groups that must stay together
 */
function findConnectedGroups(players, connections) {
  // Only process "prefer_together" connections
  const togetherConnections = connections.filter(c => c.connectionType === 'prefer_together');

  if (togetherConnections.length === 0) {
    return players.map(p => [p]); // Each player is their own group
  }

  const playerMap = new Map(players.map(p => [p.id, p]));
  const visited = new Set();
  const groups = [];

  // Build adjacency list for together connections
  const adjacency = new Map();
  togetherConnections.forEach(conn => {
    if (!adjacency.has(conn.playerAId)) adjacency.set(conn.playerAId, []);
    if (!adjacency.has(conn.playerBId)) adjacency.set(conn.playerBId, []);
    adjacency.get(conn.playerAId).push(conn.playerBId);
    adjacency.get(conn.playerBId).push(conn.playerAId);
  });

  // Find connected components using BFS
  players.forEach(player => {
    if (visited.has(player.id)) return;

    const group = [];
    const queue = [player.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      const currentPlayer = playerMap.get(currentId);
      if (currentPlayer) {
        group.push(currentPlayer);
      }

      const neighbors = adjacency.get(currentId) || [];
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      });
    }

    if (group.length > 0) {
      groups.push(group);
    }
  });

  return groups;
}

/**
 * Generate a single candidate allocation respecting connection constraints
 * @param {Array} players - All available players
 * @param {number} playersPerTeam - Players per team
 * @param {number} totalPlaying - Total players in game
 * @param {Array} connections - Player connections
 * @returns {Object} - { teams, bench }
 */
function generateSingleCandidate(players, playersPerTeam, totalPlaying, connections = []) {
  // Find connected groups
  const groups = findConnectedGroups(players, connections);

  // Shuffle groups for randomness
  const shuffledGroups = shuffle(groups);

  // Flatten into players while keeping groups together
  let allPlayers = [];
  shuffledGroups.forEach(group => {
    allPlayers.push(...group);
  });

  // Split playing vs bench
  const playing = allPlayers.slice(0, totalPlaying);
  const bench = allPlayers.slice(totalPlaying);

  // Allocate to teams, respecting connections
  const teams = allocateToTeamsWithConnections(playing, playersPerTeam, connections);

  return { teams, bench };
}

/**
 * Allocate players to teams while respecting connection constraints
 * @param {Array} players - Players to allocate
 * @param {number} teamSize - Players per team
 * @param {Array} connections - Player connections
 * @returns {Array} - Array of two teams
 */
function allocateToTeamsWithConnections(players, teamSize, connections = []) {
  const teams = [[], []];
  const assigned = new Set();

  // Find groups that must stay together
  const groups = findConnectedGroups(players, connections);

  // Sort groups by size (larger groups first) to improve allocation
  groups.sort((a, b) => b.length - a.length);

  // Assign groups to teams
  groups.forEach(group => {
    // Skip if already assigned
    if (group.some(p => assigned.has(p.id))) return;

    // Find team with most space that can fit this group
    let targetTeamIndex = -1;
    let maxSpace = -1;

    for (let i = 0; i < teams.length; i++) {
      const space = teamSize - teams[i].length;
      if (space >= group.length && space > maxSpace) {
        maxSpace = space;
        targetTeamIndex = i;
      }
    }

    // If no team can fit the entire group, try to split (shouldn't happen with proper team sizing)
    if (targetTeamIndex === -1) {
      // Assign to team with most space
      targetTeamIndex = teams[0].length <= teams[1].length ? 0 : 1;
    }

    // Assign all players in group to the same team
    group.forEach(player => {
      if (teams[targetTeamIndex].length < teamSize) {
        teams[targetTeamIndex].push(player);
        assigned.add(player.id);
      }
    });
  });

  return teams;
}

/**
 * Score a candidate allocation
 * @param {Object} candidate - { teams, bench }
 * @returns {number} - Score (lower = better)
 */
function scoreCandidate(candidate) {
  return calculateImbalance(candidate.teams[0], candidate.teams[1]);
}

/**
 * Get position breakdown for a team
 * @param {Array} team - Team players
 * @returns {Object} - { position: count }
 */
function getPositionBreakdown(team) {
  const breakdown = {};
  team.forEach(player => {
    breakdown[player.position] = (breakdown[player.position] || 0) + 1;
  });
  return breakdown;
}

/**
 * Generate balanced teams using multi-candidate strategy
 * @param {Array} players - Available players with ratings
 * @param {number} teamSize - Players per team
 * @param {number} teamCount - Number of teams (default 2)
 * @param {number} candidateCount - Number of candidates to generate (default 100)
 * @param {Array} connections - Player connections (default [])
 * @returns {Object} - { teams, bench, balance }
 */
function generateBalancedTeams(players, teamSize, teamCount = 2, candidateCount = 100, connections = []) {
  if (!players || players.length < 2) {
    throw new Error('Need at least 2 players');
  }

  if (teamSize < 1) {
    throw new Error('Team size must be at least 1');
  }

  const playersPerTeam = teamSize;
  const totalPlaying = Math.min(playersPerTeam * teamCount, players.length);

  // Adjust team size if not enough players
  const effectiveTeamSize = Math.floor(totalPlaying / teamCount);

  // Generate multiple candidates (respecting connections)
  const candidates = [];
  for (let i = 0; i < candidateCount; i++) {
    const candidate = generateSingleCandidate(players, effectiveTeamSize, totalPlaying, connections);
    const score = scoreCandidate(candidate);
    candidates.push({ ...candidate, score });
  }

  // Sort by score (best first)
  candidates.sort((a, b) => a.score - b.score);

  // Return best candidate with formatted output
  const best = candidates[0];

  return {
    teams: best.teams.map((team, index) => ({
      teamNumber: index + 1,
      players: team,
      totalRating: sumRatings(team),
      positionBreakdown: getPositionBreakdown(team)
    })),
    bench: best.bench,
    balance: {
      ratingDifference: Math.abs(sumRatings(best.teams[0]) - sumRatings(best.teams[1])),
      positionImbalancePenalty: calculatePositionImbalance(best.teams[0], best.teams[1]),
      teamSizeDifference: Math.abs(best.teams[0].length - best.teams[1].length),
      totalScore: best.score,
      isBalanced: best.score < 50 // Arbitrary threshold for "balanced"
    }
  };
}

export { generateBalancedTeams, shuffle, calculateImbalance };
