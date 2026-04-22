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

/**
 * Count star players in a team
 * @param {Array} team - Array of players
 * @returns {number} - Count of star players
 */
function countStars(team) {
  return team.filter(player => player.isStar).length;
}

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
  const starDiff = Math.abs(countStars(team1) - countStars(team2));
  const posDiff = calculatePositionImbalance(team1, team2);
  const connectionPenalty = 0; // Future: linked players constraint

  return (
    teamSizeDiff * 20 +
    ratingDiff * 10 +
    starDiff * 15 +
    posDiff * 5 +
    connectionPenalty * 10
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
 * Generate a single candidate allocation
 * @param {Array} players - All available players
 * @param {number} playersPerTeam - Players per team
 * @param {number} totalPlaying - Total players in game
 * @returns {Object} - { teams, bench }
 */
function generateSingleCandidate(players, playersPerTeam, totalPlaying) {
  // Shuffle for randomness (Fisher-Yates)
  const shuffled = shuffle(players);

  // Split playing vs bench
  const playing = shuffled.slice(0, totalPlaying);
  const bench = shuffled.slice(totalPlaying);

  // Allocate to teams
  const teams = allocateToTeams(playing, playersPerTeam);

  return { teams, bench };
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
 * @returns {Object} - { teams, bench, balance }
 */
function generateBalancedTeams(players, teamSize, teamCount = 2, candidateCount = 100) {
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

  // Generate multiple candidates
  const candidates = [];
  for (let i = 0; i < candidateCount; i++) {
    const candidate = generateSingleCandidate(players, effectiveTeamSize, totalPlaying);
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
      starCount: countStars(team),
      positionBreakdown: getPositionBreakdown(team)
    })),
    bench: best.bench,
    balance: {
      ratingDifference: Math.abs(sumRatings(best.teams[0]) - sumRatings(best.teams[1])),
      starDifference: Math.abs(countStars(best.teams[0]) - countStars(best.teams[1])),
      positionImbalancePenalty: calculatePositionImbalance(best.teams[0], best.teams[1]),
      teamSizeDifference: Math.abs(best.teams[0].length - best.teams[1].length),
      totalScore: best.score,
      isBalanced: best.score < 50 // Arbitrary threshold for "balanced"
    }
  };
}

export { generateBalancedTeams, shuffle, calculateImbalance };
