/**
 * Connection Group Size Validator
 * Ensures connected groups don't exceed sport-specific limits
 */

/**
 * Find all players in the same connected group as the given player
 * Uses BFS to find transitive connections
 * @param {string} playerId - Player to check
 * @param {Array} connections - Array of {playerId, connectedToId}
 * @returns {Set} - Set of player IDs in the same group
 */
function findConnectedGroup(playerId, connections) {
  const group = new Set();
  const queue = [playerId];
  const visited = new Set();

  // Build adjacency list
  const adjacency = new Map();
  connections.forEach(conn => {
    if (!adjacency.has(conn.playerId)) adjacency.set(conn.playerId, []);
    if (!adjacency.has(conn.connectedToId)) adjacency.set(conn.connectedToId, []);

    adjacency.get(conn.playerId).push(conn.connectedToId);
    adjacency.get(conn.connectedToId).push(conn.playerId);
  });

  // BFS to find all connected players
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    group.add(currentId);

    const neighbors = adjacency.get(currentId) || [];
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        queue.push(neighborId);
      }
    });
  }

  return group;
}

/**
 * Get group size limit for a sport
 * @param {string} sport - 'basketball' or 'soccer'
 * @returns {number} - Maximum connected group size
 */
function getGroupSizeLimit(sport) {
  switch (sport.toLowerCase()) {
    case 'basketball':
      return 4;
    case 'soccer':
      return 10;
    default:
      return 5; // Default fallback
  }
}

/**
 * Validate that adding a connection won't exceed group size limit
 * @param {string} playerId - Player to connect from
 * @param {string} connectedToId - Player to connect to
 * @param {Array} existingConnections - Current connections
 * @param {string} sport - Sport type
 * @returns {Object} - {valid: boolean, groupSize?: number, limit?: number, error?: string}
 */
export function validateConnectionGroupSize(playerId, connectedToId, existingConnections, sport) {
  const limit = getGroupSizeLimit(sport);

  // Simulate adding the new connection
  const simulatedConnections = [
    ...existingConnections,
    { playerId, connectedToId }
  ];

  // Find the resulting group size
  const group = findConnectedGroup(playerId, simulatedConnections);
  const groupSize = group.size;

  if (groupSize > limit) {
    return {
      valid: false,
      groupSize,
      limit,
      error: `Cannot create connection: Would create a group of ${groupSize} players, but ${sport} allows maximum ${limit} players per connected group.`
    };
  }

  return {
    valid: true,
    groupSize,
    limit
  };
}

/**
 * Validate all existing connections for a group
 * @param {Array} connections - All connections
 * @param {string} sport - Sport type
 * @returns {Array} - Array of violations: [{groupPlayerIds: Set, size: number, limit: number}]
 */
export function validateAllConnections(connections, sport) {
  const limit = getGroupSizeLimit(sport);
  const violations = [];
  const checked = new Set();

  // Get all unique player IDs
  const allPlayerIds = new Set();
  connections.forEach(conn => {
    allPlayerIds.add(conn.playerId);
    allPlayerIds.add(conn.connectedToId);
  });

  // Check each player's group
  allPlayerIds.forEach(playerId => {
    if (checked.has(playerId)) return;

    const group = findConnectedGroup(playerId, connections);

    // Mark all players in this group as checked
    group.forEach(id => checked.add(id));

    if (group.size > limit) {
      violations.push({
        groupPlayerIds: group,
        size: group.size,
        limit
      });
    }
  });

  return violations;
}
