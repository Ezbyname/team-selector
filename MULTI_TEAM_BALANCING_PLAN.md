# Multi-Team Balancing Implementation Plan

**Status:** ⏳ BLOCKED - Waiting for beta readiness validation  
**Priority:** HIGH - Next feature after beta blockers resolved  
**Estimated Effort:** 3-4 hours

---

## 🚨 BLOCKERS (Must complete first)

Do NOT implement until ALL of these are verified:

- [ ] Upstash Redis configured and functional
- [ ] Migration 004 applied (unique active membership)
- [ ] `npm run validate:beta` passes with ✅ READY FOR BETA TESTING
- [ ] Rate limiting test returns 429 on 6th attempt
- [ ] Zero console errors on deployed app

**Once blockers resolved:** Proceed with this implementation.

---

## 📋 Current Behavior vs. Required Behavior

### Current (Incorrect)
```
15 players, team size 5:
→ Team 1: 5 players
→ Team 2: 5 players
→ Bench: 5 players ❌ WRONG
```

### Required (Correct)
```
15 players, team size 5:
→ Team 1: 5 players
→ Team 2: 5 players
→ Team 3: 5 players
→ Bench: 0 players ✅ CORRECT
```

---

## 🎯 Algorithm Changes Required

### Current Code Logic

Location: `lib/teamBalancer.js`

```javascript
// Current: Always generates 2 teams
function generateBalancedTeams(players, teamSize, teamCount = 2, ...) {
  const playersPerTeam = teamSize;
  const totalPlaying = Math.min(playersPerTeam * teamCount, players.length);
  // ...
}
```

**Problem:** `teamCount` parameter exists but is hardcoded to 2 in most calls.

---

### Required Calculation

```javascript
function calculateOptimalTeamCount(selectedPlayers, teamSize) {
  const fullTeamCount = Math.floor(selectedPlayers.length / teamSize);
  const benchCount = selectedPlayers.length % teamSize;
  
  return {
    teamCount: fullTeamCount,
    benchCount: benchCount,
    totalPlaying: fullTeamCount * teamSize
  };
}
```

### Examples

| Selected | Team Size | Full Teams | Bench | Notes |
|----------|-----------|------------|-------|-------|
| 10 | 5 | 2 | 0 | Perfect fit |
| 15 | 5 | 3 | 0 | Perfect fit |
| 16 | 5 | 3 | 1 | 1 bench player |
| 14 | 5 | 2 | 4 | 4 bench (can't make 3rd team) |
| 9 | 4 | 2 | 1 | 1 bench player |
| 7 | 3 | 2 | 1 | 1 bench player |
| 8 | 3 | 2 | 2 | 2 bench players |

---

## 🔧 Implementation Steps

### Step 1: Update Team Balancer Algorithm

**File:** `lib/teamBalancer.js`

**Changes:**

1. **Update `allocateToTeams()` to support N teams:**
   ```javascript
   function allocateToTeams(players, teamSize, teamCount) {
     const teams = Array.from({ length: teamCount }, () => []);
     
     for (const player of players) {
       const teamIndex = getBestTeamIndex(teams, player, teamSize);
       teams[teamIndex].push(player);
     }
     
     return teams;
   }
   ```

2. **Update `getBestTeamIndex()` for N teams:**
   ```javascript
   function getBestTeamIndex(teams, player, teamSize) {
     // Find teams that aren't full
     const availableTeams = teams
       .map((team, idx) => ({ team, idx }))
       .filter(({ team }) => team.length < teamSize);
     
     if (availableTeams.length === 0) {
       // All teams full (shouldn't happen)
       return 0;
     }
     
     // If only one available, use it
     if (availableTeams.length === 1) {
       return availableTeams[0].idx;
     }
     
     // Calculate imbalance for each option
     let bestTeamIdx = availableTeams[0].idx;
     let bestScore = Infinity;
     
     for (const { idx } of availableTeams) {
       const testTeams = teams.map((t, i) => 
         i === idx ? [...t, player] : t
       );
       const score = calculateMultiTeamImbalance(testTeams);
       
       if (score < bestScore) {
         bestScore = score;
         bestTeamIdx = idx;
       }
     }
     
     return bestTeamIdx;
   }
   ```

3. **Add `calculateMultiTeamImbalance()` for N teams:**
   ```javascript
   function calculateMultiTeamImbalance(teams) {
     // Calculate variance in team ratings
     const ratings = teams.map(sumRatings);
     const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
     const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0);
     
     // Calculate variance in team sizes
     const sizes = teams.map(t => t.length);
     const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
     const sizeVariance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0);
     
     // Calculate position imbalance (pairwise comparison)
     let positionPenalty = 0;
     for (let i = 0; i < teams.length; i++) {
       for (let j = i + 1; j < teams.length; j++) {
         positionPenalty += calculatePositionImbalance(teams[i], teams[j]);
       }
     }
     
     return (
       variance * 10 +
       sizeVariance * 20 +
       positionPenalty * 5
     );
   }
   ```

4. **Update `generateBalancedTeams()` main function:**
   ```javascript
   function generateBalancedTeams(players, teamSize, requestedTeamCount = null, candidateCount = 100, connections = []) {
     if (!players || players.length < 2) {
       throw new Error('Need at least 2 players');
     }
     
     if (teamSize < 1) {
       throw new Error('Team size must be at least 1');
     }
     
     // Calculate optimal team count if not specified
     const fullTeamCount = Math.floor(players.length / teamSize);
     const teamCount = requestedTeamCount || fullTeamCount;
     
     // Ensure we don't try to create more teams than possible
     const effectiveTeamCount = Math.min(teamCount, fullTeamCount);
     
     if (effectiveTeamCount < 1) {
       throw new Error('Not enough players for even one full team');
     }
     
     const totalPlaying = effectiveTeamCount * teamSize;
     
     // Rest of implementation...
   }
   ```

---

### Step 2: Update API Endpoint

**File:** `api/sessions/generate-teams.js`

**Changes:**

```javascript
async function handler(req, res) {
  // ... existing auth and validation ...
  
  const { sessionId, teamSize, teamCount } = req.body;
  
  // Calculate optimal team count if not specified
  const optimalTeamCount = Math.floor(roster.length / teamSize);
  const effectiveTeamCount = teamCount || optimalTeamCount;
  
  // Generate balanced teams with connection constraints
  const result = generateBalancedTeams(
    players, 
    teamSize, 
    effectiveTeamCount,  // Use calculated count
    100, 
    formattedConnections
  );
  
  // ... rest of response formatting ...
}
```

**Note:** Current API accepts `teamCount` parameter but may default to 2. Remove that default.

---

### Step 3: Update Frontend Team Display

**Files to check/update:**
- `frontend/team-display.html`
- `frontend/session-setup.html`

**Required changes:**

1. **Remove hardcoded 2-team assumption:**

```javascript
// OLD (if exists):
<div class="team-1">Team 1</div>
<div class="team-2">Team 2</div>

// NEW:
<div id="teamsContainer"></div>

<script>
function renderTeams(teams) {
  const container = document.getElementById('teamsContainer');
  container.innerHTML = '';
  
  teams.forEach((team, index) => {
    const teamCard = createTeamCard(team, index + 1);
    container.appendChild(teamCard);
  });
  
  if (bench && bench.length > 0) {
    const benchCard = createBenchCard(bench);
    container.appendChild(benchCard);
  }
}
</script>
```

2. **Dynamic team card generation:**

```javascript
function createTeamCard(team, teamNumber) {
  const card = document.createElement('div');
  card.className = 'team-card';
  card.innerHTML = `
    <h3>Team ${teamNumber}</h3>
    <div class="team-players">
      ${team.players.map(p => `
        <div class="player-item">
          <span class="player-name">${p.name}</span>
          <span class="player-position">${p.position}</span>
        </div>
      `).join('')}
    </div>
    ${canSeeSensitiveData ? `
      <div class="team-stats">
        Total Rating: ${team.totalRating}
      </div>
    ` : ''}
  `;
  return card;
}
```

3. **CSS for N teams:**

```css
.teams-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.team-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Responsive: stack on mobile */
@media (max-width: 768px) {
  .teams-container {
    grid-template-columns: 1fr;
  }
}
```

---

### Step 4: Add Comprehensive Tests

**File:** `test-balancing.js`

**Add new test suite:**

```javascript
// ============================================================
// Test Suite 8: Multi-Team Balancing
// ============================================================

function testMultiTeamBalancing() {
  console.log('Suite 8: Multi-Team Balancing\n');

  // Test 8.1: 10 players, team size 5 → 2 teams, no bench
  const players10 = Array.from({ length: 10 }, (_, i) =>
    createPlayer(i + 1, `Player${i + 1}`, 5 + (i % 3))
  );

  const result1 = generateBalancedTeams(players10, 5);
  
  assert(result1.teams.length === 2, 'Test 8.1: Should generate 2 teams');
  assert(result1.teams[0].players.length === 5, 'Test 8.1: Team 1 has 5 players');
  assert(result1.teams[1].players.length === 5, 'Test 8.1: Team 2 has 5 players');
  assert(result1.bench.length === 0, 'Test 8.1: No bench players');
  console.log('  ✅ Test 8.1: 10 players → 2 teams (5v5), no bench');

  // Test 8.2: 15 players, team size 5 → 3 teams, no bench
  const players15 = Array.from({ length: 15 }, (_, i) =>
    createPlayer(i + 1, `Player${i + 1}`, 5 + (i % 4))
  );

  const result2 = generateBalancedTeams(players15, 5);
  
  assert(result2.teams.length === 3, 'Test 8.2: Should generate 3 teams');
  assert(result2.teams[0].players.length === 5, 'Test 8.2: Team 1 has 5 players');
  assert(result2.teams[1].players.length === 5, 'Test 8.2: Team 2 has 5 players');
  assert(result2.teams[2].players.length === 5, 'Test 8.2: Team 3 has 5 players');
  assert(result2.bench.length === 0, 'Test 8.2: No bench players');
  console.log('  ✅ Test 8.2: 15 players → 3 teams (5v5v5), no bench');

  // Test 8.3: 16 players, team size 5 → 3 teams, 1 bench
  const players16 = Array.from({ length: 16 }, (_, i) =>
    createPlayer(i + 1, `Player${i + 1}`, 5 + (i % 4))
  );

  const result3 = generateBalancedTeams(players16, 5);
  
  assert(result3.teams.length === 3, 'Test 8.3: Should generate 3 teams');
  assert(result3.bench.length === 1, 'Test 8.3: Should have 1 bench player');
  console.log('  ✅ Test 8.3: 16 players → 3 teams + 1 bench');

  // Test 8.4: 14 players, team size 5 → 2 teams, 4 bench
  const players14 = Array.from({ length: 14 }, (_, i) =>
    createPlayer(i + 1, `Player${i + 1}`, 5 + (i % 4))
  );

  const result4 = generateBalancedTeams(players14, 5);
  
  assert(result4.teams.length === 2, 'Test 8.4: Should generate 2 teams (not 3)');
  assert(result4.bench.length === 4, 'Test 8.4: Should have 4 bench players');
  console.log('  ✅ Test 8.4: 14 players → 2 teams + 4 bench (cannot make 3rd team)');

  // Test 8.5: 9 players, team size 4 → 2 teams, 1 bench
  const players9 = Array.from({ length: 9 }, (_, i) =>
    createPlayer(i + 1, `Player${i + 1}`, 5 + (i % 3))
  );

  const result5 = generateBalancedTeams(players9, 4);
  
  assert(result5.teams.length === 2, 'Test 8.5: Should generate 2 teams');
  assert(result5.bench.length === 1, 'Test 8.5: Should have 1 bench player');
  console.log('  ✅ Test 8.5: 9 players → 2 teams (4v4) + 1 bench');

  // Test 8.6: Multi-team rating balance
  const balancedPlayers = [
    createPlayer(1, 'Star1', 10),
    createPlayer(2, 'Star2', 10),
    createPlayer(3, 'Star3', 10),
    createPlayer(4, 'Good1', 7),
    createPlayer(5, 'Good2', 7),
    createPlayer(6, 'Good3', 7),
    createPlayer(7, 'Avg1', 5),
    createPlayer(8, 'Avg2', 5),
    createPlayer(9, 'Avg3', 5)
  ];

  const result6 = generateBalancedTeams(balancedPlayers, 3);
  
  const ratings = result6.teams.map(t => t.totalRating);
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const maxDiff = Math.max(...ratings) - Math.min(...ratings);
  
  assert(maxDiff <= 5, `Test 8.6: Team ratings should be balanced (max diff: ${maxDiff})`);
  console.log(`  ✅ Test 8.6: Multi-team balance (max rating diff: ${maxDiff})`);

  // Test 8.7: Connected players in 3-team scenario
  const connectedPlayers = Array.from({ length: 15 }, (_, i) =>
    createPlayer(i + 1, `Player${i + 1}`, 5 + (i % 4))
  );

  const connections = [
    { playerAId: 1, playerBId: 2, connectionType: 'prefer_together' }
  ];

  const result7 = generateBalancedTeams(connectedPlayers, 5, null, 100, connections);
  
  // Find which teams players 1 and 2 are on
  let player1Team = -1;
  let player2Team = -1;
  
  result7.teams.forEach((team, idx) => {
    if (team.players.find(p => p.id === 1)) player1Team = idx;
    if (team.players.find(p => p.id === 2)) player2Team = idx;
  });
  
  assert(
    player1Team === player2Team,
    `Test 8.7: Connected players should be on same team (P1: Team ${player1Team}, P2: Team ${player2Team})`
  );
  console.log('  ✅ Test 8.7: Connected players stay together in 3-team scenario');

  console.log('');
}
```

---

### Step 5: Privacy Verification

**Ensure regular users do NOT see:**

Current implementation in `api/sessions/generate-teams.js`:

```javascript
const canSeeSensitiveData = canViewSensitiveData(req.user);

return res.status(200).json({
  teams: result.teams.map(team => ({
    teamNumber: team.teamNumber,
    players: team.players.map(p => {
      const baseData = {
        id: p.id,
        name: p.name,
        position: p.position
      };
      
      // Only include sensitive data for admin/sub-admin
      if (canSeeSensitiveData) {
        return {
          ...baseData,
          defaultRating: p.defaultRating,
          finalRating: p.finalRating
        };
      }
      
      return baseData;
    }),
    // Only include team stats for admin/sub-admin
    ...(canSeeSensitiveData && {
      totalRating: team.totalRating
    }),
    positionBreakdown: team.positionBreakdown
  }))
});
```

**This is already correct** - ratings only exposed if `canSeeSensitiveData` returns true.

**Verify in frontend:** Do not display ratings in UI for regular users.

---

## 🧪 Testing Strategy

### Unit Tests (test-balancing.js)

Add Suite 8 with 7 test cases covering:
1. 10 players → 2 teams
2. 15 players → 3 teams
3. 16 players → 3 teams + 1 bench
4. 14 players → 2 teams + 4 bench
5. 9 players → 2 teams + 1 bench
6. Multi-team rating balance
7. Connected players in multi-team

**Target:** 100% pass rate

### Integration Tests

**Manual testing checklist:**

- [ ] Generate teams with 15 players, team size 5 → verify 3 teams created
- [ ] Verify frontend displays 3 teams correctly
- [ ] Reshuffle 3 teams → verify still balanced
- [ ] Regular user view → verify NO ratings shown
- [ ] Admin view → verify ratings shown
- [ ] Connected players → verify stay together across reshuffles

---

## 📊 Success Criteria

Feature complete when:

- [ ] Algorithm generates N teams based on `Math.floor(players / teamSize)`
- [ ] Balancing works across all N teams (not just pairwise)
- [ ] Connected players respected in N-team scenarios
- [ ] Frontend displays N teams dynamically (not hardcoded 2)
- [ ] All 7 new tests pass (100%)
- [ ] Existing tests still pass (no regression)
- [ ] Privacy maintained (regular users see no ratings)
- [ ] Reshuffle works for N teams

---

## 🚧 Implementation Order

1. **Update teamBalancer.js** (~2 hours)
   - Implement multi-team allocation logic
   - Update imbalance calculation for N teams
   - Update main function to calculate optimal team count

2. **Add tests** (~30 minutes)
   - Add Suite 8 with 7 test cases
   - Run and verify 100% pass

3. **Update API endpoint** (~15 minutes)
   - Remove hardcoded teamCount = 2
   - Pass calculated optimal count to balancer

4. **Update frontend** (~1 hour)
   - Make team display dynamic (not hardcoded 2 teams)
   - Test with 2, 3, 4 teams
   - Verify responsive layout

5. **Integration testing** (~30 minutes)
   - Test full flow with 15 players
   - Verify balance across 3 teams
   - Test reshuffle
   - Verify privacy

---

## 🎯 Estimated Timeline

**After beta blockers resolved:**

- Day 1: Algorithm changes + tests (2.5 hours)
- Day 1: API updates (15 minutes)
- Day 1: Frontend updates (1 hour)
- Day 2: Integration testing + bug fixes (1 hour)

**Total:** 3-4 hours over 1-2 days

---

## ⚠️ Known Edge Cases

### Edge Case 1: Very Small Team Size

```
15 players, team size 2:
→ 7 teams of 2, 1 bench
```

**Question:** Is this reasonable? Or should we have minimum/maximum team count?

**Recommendation:** Allow it but warn in UI if team count > 5.

### Edge Case 2: Connected Group Larger Than Team Size

```
5 connected players, team size 3:
→ Cannot fit all on one team
```

**Current behavior:** Algorithm will split them (best effort)

**Recommendation:** Document this limitation

### Edge Case 3: Odd Team Count

```
15 players, team size 4:
→ 3 teams of 4, 3 bench
```

**Behavior:** Correct - cannot make 4 full teams

---

## 📝 Documentation Updates Required

After implementation:

1. Update `README.md` - Mention multi-team support
2. Update `TODO.md` - Mark as complete
3. Add to `CHANGELOG.md` - Document feature addition
4. Update beta tester instructions - Show 3-team example

---

## 🔄 Rollback Plan

If multi-team causes issues:

1. **Feature flag approach:**
   ```javascript
   const ENABLE_MULTI_TEAM = process.env.ENABLE_MULTI_TEAM === 'true';
   
   const effectiveTeamCount = ENABLE_MULTI_TEAM 
     ? Math.floor(players.length / teamSize)
     : 2;
   ```

2. **Quick revert:**
   - Change one line: `const teamCount = 2;`
   - Redeploy

---

**Status:** Ready to implement after beta blockers resolved  
**Priority:** Next immediate feature  
**Risk:** Low (isolated changes, comprehensive tests)
