# Regression Test Suite - Complete Validation

## Test Environment Setup

1. **Start server:** `npm start`
2. **Open debug tool:** `http://localhost:3000/debug-auth.html`
3. **Verify auth:** Token should be valid
4. **Open app:** `http://localhost:3000/groups.html`

---

## Test 1: Login Flow ✓

### Steps
1. Clear token (if logged in)
2. Go to `http://localhost:3000/login.html`
3. Enter valid phone number
4. Submit OTP
5. Should redirect to groups page

### Expected
- ✅ OTP sent successfully
- ✅ OTP verification works
- ✅ Token saved to localStorage
- ✅ Redirect to groups page
- ✅ Groups page loads without auth error

### Failure Indicators
- ❌ "Authentication required" error
- ❌ Redirect loop
- ❌ Token not saved
- ❌ OTP verification fails

---

## Test 2: Create Football Group (Auth Issue) ✓

### Steps
1. Ensure logged in (token exists)
2. Go to groups page
3. Click [+ Create New Group]
4. Name: "Test Football Group"
5. Sport: Football ⚽
6. Location: "Test Field"
7. Click [Create Group]

### Expected
- ✅ Group created successfully
- ✅ Redirect to session setup
- ✅ Header shows "⚽ Test Football Group"
- ✅ No "Authentication required" error

### Debug If Fails
- Open `http://localhost:3000/debug-auth.html`
- Click [Test Token]
- If token invalid: Re-login
- Click [Test Create Football Group]
- Check exact error message

---

## Test 3: Team Sizing Edge Cases ✓

### Test 3.1: 5 Players (Odd)
1. Add 5 players
2. Select all 5
3. Check status display

**Expected:**
- Status: "5 players ready! 🎉"
- Teams: "2v2 + 1 bench"

4. Generate teams

**Expected:**
- Team 1: 2 players
- Team 2: 2 players
- Bench: 1 player

### Test 3.2: 6 Players (Even)
1. Add 6 players
2. Select all 6
3. Check status display

**Expected:**
- Status: "6 players ready! 🎉"
- Teams: "3v3"

4. Generate teams

**Expected:**
- Team 1: 3 players
- Team 2: 3 players
- Bench: empty (no bench section shown)

### Test 3.3: 7 Players (Odd)
**Expected:**
- Status: "7 players ready! 🎉"
- Teams: "3v3 + 1 bench"
- Team 1: 3, Team 2: 3, Bench: 1

### Test 3.4: 9 Players (Odd)
**Expected:**
- Status: "9 players ready! 🎉"
- Teams: "4v4 + 1 bench"
- Team 1: 4, Team 2: 4, Bench: 1

### Test 3.5: 11 Players (Odd)
**Expected:**
- Status: "11 players ready! 🎉"
- Teams: "5v5 + 1 bench"
- Team 1: 5, Team 2: 5, Bench: 1

---

## Test 4: Edit Player ✓

### Steps
1. Open session setup
2. Add player: "Test Player", Guard
3. Click ⋮ on "Test Player"
4. Click [Edit Player]
5. Change name to: "Updated Player"
6. Change position to: "Forward"
7. Click [Save Changes]

### Expected
- ✅ Modal opens with current values
- ✅ Can edit both fields
- ✅ Click Save → Modal closes
- ✅ Player card updates immediately
- ✅ Toast: "Player updated successfully!"
- ✅ Name shows: "Updated Player"
- ✅ Position shows: "Forward"

### API Check
```bash
POST /api/players/update
{
  "playerId": "uuid",
  "name": "Updated Player",
  "position": "Forward"
}

Response (200):
{
  "success": true,
  "player": {
    "id": "uuid",
    "name": "Updated Player",
    "position": "Forward"
  }
}
```

---

## Test 5: Delete Player ✓

### Steps
1. Click ⋮ on a player
2. Click [Delete Player]
3. Confirm deletion in dialog

### Expected
- ✅ Confirmation dialog appears
- ✅ Dialog text includes player name
- ✅ If cancel: nothing happens
- ✅ If confirm:
  - Player disappears immediately
  - Toast: "Player deleted"
  - If player was selected: count decreases
  - Connections involving player removed

### API Check
```bash
DELETE /api/players/delete
{
  "playerId": "uuid"
}

Response (200):
{
  "success": true,
  "message": "Player ... deleted successfully"
}
```

### Cascade Check
After deleting player with connections:
1. Check other players' connection counts
2. Should decrease if they were connected
3. No orphaned connections

---

## Test 6: Connection Logic ✓

### Test 6.1: Create Connection
1. Select 3 players: John, Jane, Mike
2. Click ⋮ on John
3. Click [Manage Connections]

**Expected:**
- ✅ Modal opens
- ✅ Player 1 preselected: "John"
- ✅ Player 2 dropdown does NOT show "John"

4. Select Player 2: "Jane"
5. Check "This session only"
6. Click [Add Connection]

**Expected:**
- ✅ Success toast
- ✅ John's card shows: 🔗 1
- ✅ Jane's card shows: 🔗 1
- ✅ Connection text: "Friends: Jane"

### Test 6.2: Cannot Connect to Self
1. Open connection modal
2. Select John in Player 1
3. Try to select John in Player 2

**Expected:**
- ✅ John is NOT in Player 2 dropdown

### Test 6.3: Dynamic Filtering
1. Player 1: John
2. Player 2 shows: Jane, Mike (not John)
3. Change Player 1 to: Jane
4. Player 2 updates to show: John, Mike (not Jane)

### Test 6.4: Transitive Grouping
1. Connect John ↔ Jane
2. Connect Jane ↔ Mike
3. Check badges

**Expected:**
- ✅ John shows: 🔗 2 (connected to Jane and Mike via transitive)
- ✅ Jane shows: 🔗 2 (connected to John and Mike)
- ✅ Mike shows: 🔗 2 (connected to Jane and John via transitive)

### Test 6.5: Size Limit (Basketball)
1. Create basketball group
2. Add 5 players
3. Connect: A↔B, B↔C, C↔D, D↔E (chain of 5)

**Expected:**
- ✅ 4th connection succeeds (group of 4)
- ❌ 5th connection fails with error: "Would create a group of 5 players, which exceeds the limit of 4 for basketball"

### Test 6.6: Size Limit (Football)
1. Create football group
2. Try to connect 11 players in a chain

**Expected:**
- ✅ Can connect up to 10 players
- ❌ 11th connection fails with limit error

---

## Test 7: Reshuffle Constraints ✓

### Steps
1. Create connections: John ↔ Jane, Mike ↔ Alice
2. Select all 4 players
3. Generate teams
4. Note which team each pair is on
5. Click [🎲 Shuffle]
6. Repeat 5 times

### Expected
- ✅ John and Jane ALWAYS on same team
- ✅ Mike and Alice ALWAYS on same team
- ✅ Teams balanced (ratings considered)
- ✅ Connections NEVER separated
- ✅ Toast: "Teams shuffled! 🎲"

### Edge Case: Impossible Split
1. Connect all 6 players: A↔B, B↔C, C↔D, D↔E, E↔F (chain)
2. Try to generate teams

**Expected:**
- ✅ All 6 players on Team 1 (can't split connection group)
- ✅ Team 2 empty
- ✅ No crash

---

## Test 8: Session Creation ✓

### Steps
1. Select 6 players
2. Create connections
3. Click [⚡ Create Teams]

### Expected
- ✅ POST /api/sessions/create succeeds
- ✅ Session ID returned
- ✅ POST /api/sessions/select-players succeeds
- ✅ POST /api/sessions/generate-teams succeeds
- ✅ Teams returned with players
- ✅ Redirect to team display
- ✅ Teams shown correctly

### API Sequence Check
```bash
1. POST /api/sessions/create
   { groupId: "uuid" }
   → { success: true, session: { id: "uuid" } }

2. POST /api/sessions/select-players
   { sessionId: "uuid", playerIds: ["uuid1", "uuid2", ...] }
   → { success: true }

3. POST /api/sessions/generate-teams
   { sessionId: "uuid", teamSize: 3 }
   → { success: true, teams: [...], bench: [...], balance: {...} }
```

---

## Test 9: Login Flow Regression ✓

### Test 9.1: Fresh Login
1. Clear all localStorage
2. Go to app root
3. Should redirect to login
4. Complete login flow
5. Should end up at groups page

### Test 9.2: Token Expiry
1. Login successfully
2. Wait for token to expire (or manually set expired token)
3. Try to create group

**Expected:**
- ✅ API returns 401
- ✅ Frontend redirects to login
- ✅ After re-login, returns to where user was

### Test 9.3: Invalid Token
1. Login successfully
2. Manually corrupt token in localStorage
3. Try to use app

**Expected:**
- ✅ API returns 401
- ✅ Redirect to login

---

## Test 10: API Response Consistency ✓

### Test All Successful Operations
For each API call, verify response has:
- ✅ `"success": true` field
- ✅ Descriptive data field (`group`, `player`, etc.)
- ✅ Status 200 or 201

### Test All Error Operations
For each error case, verify response has:
- ✅ `"error": "message"` field
- ✅ NO `success` field
- ✅ Appropriate status (400/401/403/404/500)

### Examples
```javascript
// Success
{ success: true, group: { id, name, ... } }  // ✅

// Error
{ error: "Group name is required" }  // ✅

// WRONG (mixed)
{ success: false, error: "..." }  // ❌ Never do this
```

---

## Automated Test Script

### Quick Smoke Test
```bash
# Run this in browser console on debug-auth.html

(async () => {
  console.log('🧪 Running smoke tests...\n');
  
  // Test 1: Token validation
  console.log('1. Testing token...');
  await testToken();
  await sleep(1000);
  
  // Test 2: Create group
  console.log('2. Testing create group...');
  await testCreateGroup();
  await sleep(1000);
  
  console.log('\n✅ Smoke tests complete');
})();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Regression Checklist Summary

- [ ] Login flow works
- [ ] Create football group (no auth error)
- [ ] Team sizing correct for 5, 6, 7, 9, 11 players
- [ ] Edit player works
- [ ] Delete player works (with cascade)
- [ ] Connection modal filters correctly
- [ ] Connection modal preselects source player
- [ ] Transitive connections work
- [ ] Size limits enforced
- [ ] Reshuffle respects connections
- [ ] Session creation flow works
- [ ] Token expiry handled
- [ ] API responses consistent

---

## Test Results Template

```
Date: YYYY-MM-DD
Tester: Name
Browser: Chrome 120
Device: Desktop / Mobile

Test 1: Login Flow - ✅ PASS / ❌ FAIL
Notes: ...

Test 2: Create Football Group - ✅ PASS / ❌ FAIL
Notes: ...

Test 3: Team Sizing (5 players) - ✅ PASS / ❌ FAIL
Notes: ...

[... continue for all tests ...]

Overall Status: ✅ ALL PASS / ⚠️ SOME FAILURES / ❌ CRITICAL FAILURES

Critical Issues Found: ...

Non-Critical Issues: ...

Ready for Production: YES / NO
```

---

## Conclusion

This test suite covers:
- ✅ All 7 original bugs fixed
- ✅ Auth flow end-to-end
- ✅ Edge cases (team sizing)
- ✅ API consistency
- ✅ Connection logic
- ✅ Reshuffle constraints
- ✅ Regression prevention

**Run this full suite before visual redesign to ensure stability.**
