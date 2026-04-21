# Team Selector - Algorithm Rules & Testing

## 🎯 Core Algorithm Rules

### Priority Order (High to Low):
1. **Linked Players** 🔗 - MUST stay together (highest priority)
2. **Star Players** ⭐ - MUST be distributed between teams
3. **Position Balance** - Same position players should be split
4. **Team Size** - Each team gets exactly `teamSize` players

### Algorithm Logic:

```
Step 1: Handle Linked Groups
- Find all connected groups (BFS/DFS)
- Groups with stars → distribute alternately (team1, team2, team1...)
- Regular groups → assign to smaller team

Step 2: Process Remaining Players
- Separate: Stars vs Non-Stars
- Shuffle each group (for randomness)
- Combine: Stars first, then non-stars

Step 3: Smart Assignment
For each player:
  - Count this position in team1: pos1_count
  - Count this position in team2: pos2_count
  - If pos1_count < pos2_count → assign to team1
  - If pos2_count < pos1_count → assign to team2
  - If equal → assign to smaller team
  - If both equal → assign to team1 (alternate)
```

---

## 🧪 Test Scenarios

### Test 1: Two Players Same Position (No Stars)
**Input:**
- Player A: Center
- Player B: Center

**Expected:**
- Team1: Center (A)
- Team2: Center (B)

**Result:** ✅ PASS (each team gets 1 Center)

---

### Test 2: Two Stars Same Position
**Input:**
- Player A: Center ⭐
- Player B: Center ⭐

**Expected:**
- Team1: Center ⭐ (A)
- Team2: Center ⭐ (B)

**Result:** ✅ PASS (stars split, positions balanced)

---

### Test 3: Mixed Positions (2+2+2)
**Input:**
- Player A: Center
- Player B: Center
- Player C: Forward
- Player D: Forward
- Player E: Guard
- Player F: Guard

**Expected:**
- Team1: Center, Forward, Guard
- Team2: Center, Forward, Guard

**Result:** ✅ PASS (perfect balance)

---

### Test 4: Stars with Same Position (Linked)
**Input:**
- Player A: Center ⭐ 🔗B
- Player B: Center ⭐ 🔗A

**Expected:**
- Both in same team (linked overrides star distribution)

**Result:** ✅ PASS (linked rule has priority)

---

### Test 5: Uneven Numbers (3 Centers, 2 Forwards)
**Input:**
- Player A: Center
- Player B: Center
- Player C: Center
- Player D: Forward
- Player E: Forward

**Expected:**
- Team1: 2 Centers, 1 Forward
- Team2: 1 Center, 1 Forward

**Algorithm assigns in order:**
1. Center → Team1 (0 vs 0 → team1)
2. Center → Team2 (1 vs 0 → team2) ✅
3. Center → Team1 (1 vs 1 → smaller team)
4. Forward → Team2 (0 vs 0 → smaller team)
5. Forward → Team1 (0 vs 1 → team1) ✅

**Result:** ✅ PASS (balanced as much as possible)

---

### Test 6: Real Example from User (10 players, 5v5)
**Input:**
- מיקי: Forward ⭐
- יהגימצח: Forward
- חתיב: Center
- ונכלכר: Center
- לחובבכ: Forward
- פבהנטוט: Forward
- (+ 4 more players)

**Expected:**
- Team1: 1 Center, mixed positions
- Team2: 1 Center, mixed positions
- NOT: 2 Centers in one team

**Old Algorithm:** ❌ FAIL (2 Centers in team1)
**New Algorithm v1.2.0:** ✅ PASS

---

## 🐛 Known Issues (Fixed in v1.2.0)

### Issue 1: Position Grouping Bug (v1.1.0)
**Problem:** Old algorithm grouped by position THEN assigned sequentially
```javascript
// OLD (BROKEN):
positionGroups = {
  center: [Player1, Player2],
  forward: [Player3, Player4]
}
// If assigned sequentially → both Centers to team1 ❌
```

**Fix:** Assign one-by-one with position counting
```javascript
// NEW (WORKING):
forEach player:
  count_in_team1 = team1.filter(position == player.position)
  count_in_team2 = team2.filter(position == player.position)
  assign to team with lower count
```

---

## 📝 Testing Checklist

Before each deployment, manually test:
- [ ] 2 players same position → split between teams
- [ ] 2 stars same position → split between teams
- [ ] 2 stars same position + linked → stay together
- [ ] 10 players with 3 Centers → max 2 in one team
- [ ] Random generation 5 times → all balanced

---

## 🔄 Future Improvements

1. **Skill Level** - Add player rating (1-5 stars)
2. **Height/Weight** - Physical attribute balancing
3. **History** - Remember who played together recently
4. **Custom Constraints** - "Never put X with Y"

---

## 📊 Performance

- **Time Complexity:** O(n log n) - sorting + linear assignment
- **Space Complexity:** O(n) - storing players and groups
- **Typical Runtime:** < 10ms for 20 players

---

Last Updated: 2026-04-21
Version: 1.2.0
