# Connection Grouping Behavior

## Current Implementation: Transitive Grouping (BFS)

### How It Works

The current implementation uses **Breadth-First Search (BFS)** on the connection graph.

**This creates transitive grouping:**

```
A → B, B → C
Results in group: [A, B, C]
```

All three players will be kept together on the same team.

### Examples

**Example 1: Simple Chain**
```
Connections:
- A → B
- B → C

Result:
Group: [A, B, C]

All three on same team.
```

**Example 2: Star Pattern**
```
Connections:
- A → B
- A → C
- A → D

Result:
Group: [A, B, C, D]

All four on same team.
```

**Example 3: Multiple Chains**
```
Connections:
- A → B
- B → C
- D → E

Result:
Group 1: [A, B, C]
Group 2: [D, E]

Group 1 together on one team.
Group 2 together (can be same or different team based on balance).
```

---

## Alternative: Direct-Only Grouping

### How It Would Work

Only **directly connected** pairs stay together.
No transitive closure.

**Example:**
```
A → B, B → C
Results in:
- Pair 1: (A, B) must be together
- Pair 2: (B, C) must be together
- C is NOT required to be with A
```

### Implementation

**Option A: Pairs Only (No BFS)**
```javascript
function findDirectPairs(players, connections) {
  // Return array of pairs, not transitive groups
  return connections.map(conn => {
    return [
      players.find(p => p.id === conn.playerAId),
      players.find(p => p.id === conn.playerBId)
    ];
  });
}
```

**Allocator handles pairs:**
- Place A with B
- Place B with C
- B is in both pairs, so A, B, C end up together anyway

**Option B: Strict Pairs (Allow Splitting)**
```javascript
// Only enforce direct connections
// Allow transitive players to be on different teams

A → B, B → C:
- A must be with B
- B must be with C
- But if we can't fit all 3 together, 
  choose which constraint to violate
```

---

## Recommendation

### Current Behavior (Transitive) Is Likely Correct

**Reasoning:**

1. **User Intent:**
   If operator sets:
   - "Player A wants to play with Player B"
   - "Player B wants to play with Player C"
   
   The implicit intent is probably that A, B, and C should all be together.

2. **Simplicity:**
   Easier to understand: "Connected players stay together"
   
3. **Avoids Conflicts:**
   Direct-only can create impossible constraints:
   - A must be with B
   - B must be with C
   - C must be with D
   - But only room for 3 players per team
   
   Transitive grouping surfaces this problem immediately.

---

## User Choice

### If Current Behavior Is Undesired

**Option 1: Disable Transitivity**

Change `findConnectedGroups` to return pairs instead of full transitive groups.

**Code change:**
```javascript
// In lib/teamBalancer.js
function findDirectPairs(players, connections) {
  const pairs = [];
  
  connections.forEach(conn => {
    const playerA = players.find(p => p.id === conn.playerAId);
    const playerB = players.find(p => p.id === conn.playerBId);
    
    if (playerA && playerB) {
      pairs.push([playerA, playerB]);
    }
  });
  
  return pairs;
}
```

Then adjust `allocateToTeamsWithConnections` to handle pairs instead of groups.

---

**Option 2: Add Transitivity Control**

Add a flag to connection:
```sql
CREATE TABLE player_connections (
  ...
  is_transitive BOOLEAN DEFAULT true
);
```

If `is_transitive = false`, only enforce direct connection.
If `is_transitive = true`, use BFS for group.

---

## Testing Current Behavior

### Test Case: A → B → C

**Setup:**
```sql
-- Group-level connections
INSERT INTO player_connections (group_id, player_id, connected_to_id)
VALUES 
  ('group-uuid', 'player-a-uuid', 'player-b-uuid'),
  ('group-uuid', 'player-b-uuid', 'player-c-uuid');
```

**Session with A, B, C + 3 more players (6 total for 3v3):**

**Expected with Transitive (current):**
```
Team 1: A, B, C
Team 2: D, E, F
```

**Expected with Direct-Only:**
```
Team 1: A, B, ?
Team 2: ?, C, ?
```

Where B could be on either team (or both if pairs overlap).

---

## Decision Required

**Please confirm:**

1. **Keep current transitive behavior?**
   - A → B, B → C results in [A, B, C] together
   - ✅ Recommended

2. **Switch to direct-only pairs?**
   - A → B, B → C results in two separate constraints
   - May create conflicts

3. **Add transitivity control flag?**
   - Per-connection setting
   - More complex UI

---

## Current Status

**Implementation:** Transitive grouping (BFS)

**Ready to change if requested.**

**Recommendation:** Keep transitive unless specific use case requires direct-only.
