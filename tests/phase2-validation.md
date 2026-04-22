# Phase 2 Validation Test Plan

## Test 1: Regular User Cannot See Ratings

**Setup:**
- Login as regular user (not admin/sub-admin)
- Navigate to session setup
- Select a group with players

**Expected Result:**
- ✅ Player list shows: Name + Position only
- ❌ No ratings displayed
- ❌ No "Rating: X" text

**Actual Result:**
- [ ] PASS
- [ ] FAIL

---

## Test 2: Regular User Cannot See Stars

**Setup:**
- Login as regular user
- View player list
- Check if star indicators are visible

**Expected Result:**
- ❌ No star icons or indicators visible
- ✅ All players look the same (no visual distinction)

**Actual Result:**
- [ ] PASS
- [ ] FAIL

---

## Test 3: Regular User Cannot See Balance Info

**Setup:**
- Login as regular user
- Generate teams
- View team display page

**Expected Result:**
- ❌ Balance Summary section hidden
- ❌ No "Rating Difference" shown
- ❌ No "Total: X" for teams
- ✅ Player names and positions visible only

**Actual Result:**
- [ ] PASS
- [ ] FAIL

---

## Test 4: Admin Can See All Data

**Setup:**
- Login as admin user (phone: 0525502281)
- View players and generate teams

**Expected Result:**
- ✅ Ratings visible in player list
- ✅ Star designation visible
- ✅ Balance summary visible on team display
- ✅ Team totals visible

**Actual Result:**
- [ ] PASS
- [ ] FAIL

---

## Test 5: Connected Players Stay Together

**Setup:**
1. Create connection between Player A and Player B (prefer_together)
2. Select both players for a session
3. Generate teams

**Expected Result:**
- ✅ Player A and Player B are on the SAME team
- ✅ Never split across teams

**Test Multiple Times:**
- [ ] Attempt 1: Together? ___
- [ ] Attempt 2: Together? ___
- [ ] Attempt 3: Together? ___
- [ ] Attempt 4: Together? ___
- [ ] Attempt 5: Together? ___

**Result:**
- [ ] PASS (100% together)
- [ ] FAIL (split at least once)

---

## Test 6: Reshuffle Respects Connections

**Setup:**
1. Use same session with Player A + Player B connected
2. Click "Regenerate Teams" button
3. Check new team assignments

**Expected Result:**
- ✅ After reshuffle, Player A and Player B still on same team
- ✅ Connection constraint never broken

**Test Multiple Reshuffles:**
- [ ] Reshuffle 1: Together? ___
- [ ] Reshuffle 2: Together? ___
- [ ] Reshuffle 3: Together? ___
- [ ] Reshuffle 4: Together? ___
- [ ] Reshuffle 5: Together? ___

**Result:**
- [ ] PASS (100% together)
- [ ] FAIL (split at least once)

---

## Test 7: Multiple Connection Groups

**Setup:**
1. Create connections:
   - Player A ↔ Player B (together)
   - Player C ↔ Player D (together)
2. Select all 4 players + 2 more (6 total for 3v3)
3. Generate teams

**Expected Result:**
- ✅ A and B on same team
- ✅ C and D on same team
- ✅ Other 2 players distributed to balance

**Actual Result:**
- [ ] PASS
- [ ] FAIL

---

## Test 8: Large Connection Group

**Setup:**
1. Create chain: A ↔ B ↔ C (all together)
2. Select A, B, C + 5 more players (8 total for 4v4)
3. Generate teams

**Expected Result:**
- ✅ A, B, and C all on the SAME team
- ✅ Other team has 4 different players

**Actual Result:**
- [ ] PASS
- [ ] FAIL

---

## Test 9: Connection Data Not Exposed to Regular Users

**Setup:**
- Login as regular user
- Inspect API responses (Network tab in browser DevTools)

**Expected Result:**
- ❌ No `defaultRating` in player data
- ❌ No `finalRating` in player data
- ❌ No `isStar` in player data
- ❌ No `balance` object in team generation response
- ✅ Only `id`, `name`, `position` visible

**Actual Result:**
- [ ] PASS
- [ ] FAIL

---

## Test 10: Balancing Still Works Behind the Scenes

**Setup:**
- Login as admin to verify internal ratings exist
- Note team ratings
- Login as regular user
- Generate teams with same players

**Expected Result:**
- ✅ Teams are balanced (check via admin account)
- ✅ Star players distributed evenly
- ✅ Regular user doesn't see any of this data
- ✅ Algorithm still uses ratings internally

**Actual Result:**
- [ ] PASS
- [ ] FAIL

---

## Summary

**Total Tests:** 10

**Passed:** ___

**Failed:** ___

**Phase 2 Complete:** [ ] YES [ ] NO

---

## Critical Issues Found

1. 
2. 
3. 

---

## Notes

