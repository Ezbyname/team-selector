# Manual Testing Guide: Join Team by Invite Code

This guide provides step-by-step instructions for manually testing the invite code feature.

## Prerequisites

1. Dev server running: `npm start` (port 3006)
2. Two user accounts:
   - **Admin User**: Has password login enabled
   - **Regular User**: Fresh account or existing member

## Test Scenarios

---

### Scenario 1: Empty State → Join Team

**Goal:** Test joining a team when user has no teams

**Steps:**

1. **Setup:**
   - Create a fresh user account via phone registration
   - Do NOT create any teams yet

2. **Navigate to Dashboard:**
   - Login with new account
   - Should see empty state: "Welcome! You are not part of any team yet"

3. **Click "Join a Team" button:**
   - Modal should open with title "Join Team"
   - Input field labeled "Invite Code"
   - Helper text: "Ask your team admin for the team code."
   - "Cancel" and "Join Team" buttons visible

4. **Test Invalid Code:**
   - Enter: `INVALID-CODE`
   - Click "Join Team"
   - Should show error: "This invite code is invalid."
   - Input should have red border
   - Error message in red text below input

5. **Test Valid Code:**
   - Get valid code from admin (e.g., `ATLIT-4829`)
   - Enter code in input
   - Click "Join Team"
   - Should show loading state: button says "Joining..."
   - Spinner appears on button

6. **Success State:**
   - Modal should transition to success screen
   - Green checkmark icon
   - "Successfully Joined!" title
   - Message: "You are now a member of [Team Name]"
   - "Open Team" button visible

7. **Verify:**
   - Click "Open Team"
   - Should redirect to team session setup page
   - Team name appears in header

**Expected Results:**
- ✅ Modal opens smoothly
- ✅ Invalid code shows proper error
- ✅ Valid code joins team successfully
- ✅ Success animation plays
- ✅ Redirect works after success

---

### Scenario 2: My Teams Page → Join Team

**Goal:** Test joining additional teams from teams list

**Steps:**

1. **Setup:**
   - Login as user who is already in at least one team
   - Navigate to sport selection
   - Choose Basketball or Football

2. **On My Teams Page:**
   - Should see breadcrumb: Home → Sports → Basketball
   - Header shows: "Your Basketball Teams"
   - Two buttons visible: "+ Create Team" and "Join Team"

3. **Click "Join Team" button:**
   - Modal opens (same as empty state)

4. **Test Already Member:**
   - Enter invite code for team you're already in
   - Click "Join Team"
   - Should show error: "You are already a member of this team."
   - Modal should remain open showing error

5. **Test Different Team:**
   - Enter invite code for a different team in same sport
   - Click "Join Team"
   - Success screen appears
   - After success, teams list should refresh automatically
   - New team appears in the list

**Expected Results:**
- ✅ Join Team button visible and styled correctly
- ✅ "Already member" error handled gracefully
- ✅ Successfully joining adds team to list without reload
- ✅ Team appears with correct badge (Member role)

---

### Scenario 3: Successful Join Flow

**Goal:** Complete end-to-end successful join

**Steps:**

1. **Admin Creates Code:**
   - Login as team admin
   - Navigate to team settings (TODO: UI not yet built)
   - Alternative: Use API directly or check database

2. **User Joins:**
   - Login as different user
   - From any entry point (dashboard or my-teams)
   - Click "Join Team"
   - Enter valid code

3. **Verify All States:**
   - Input accepts code (uppercase conversion automatic)
   - Button shows loading state
   - Success screen appears with correct team name
   - "Open Team" redirects properly

4. **Verify in Database:**
   - Open Supabase dashboard
   - Check `group_members` table
   - New row exists with:
     - `group_id`: Matches team
     - `user_id`: Matches joining user
     - `role`: "user" (not admin)
     - `status`: "active"

5. **Verify in UI:**
   - Navigate to "My Teams"
   - Joined team appears in list
   - Role badge shows "Member"
   - Can click into team to view session setup

**Expected Results:**
- ✅ Code works regardless of case (ATLIT-4829 or atlit-4829)
- ✅ Membership created with correct role
- ✅ Team immediately accessible
- ✅ No duplicate memberships created

---

### Scenario 4: Invalid Code Flow

**Goal:** Test all error cases

**Steps:**

1. **Non-Existent Code:**
   - Input: `FAKE-CODE`
   - Expected: "This invite code is invalid."
   - Status: Modal stays open, error message red

2. **Empty Code:**
   - Leave input blank
   - Click "Join Team"
   - Expected: "Please enter an invite code"
   - Status: Client-side validation

3. **Revoked Code:**
   - Admin revokes a code (API: POST /api/groups/revoke-invite)
   - User tries to use old code
   - Expected: "This invite code is no longer active."
   - Status: 403 error, clear message

4. **Whitespace Handling:**
   - Input: `  ATLIT-4829  ` (with spaces)
   - Expected: Spaces trimmed, code works normally
   - Status: Join succeeds

5. **Case Insensitivity:**
   - Input: `atlit-4829` (lowercase)
   - Expected: Normalized to uppercase, works
   - Status: Join succeeds

**Expected Results:**
- ✅ All errors return JSON (not HTML)
- ✅ Error messages match specification exactly
- ✅ Modal provides clear feedback
- ✅ Input normalization works silently

---

### Scenario 5: Already Member Flow

**Goal:** Test duplicate membership prevention

**Steps:**

1. **Join Team First Time:**
   - User successfully joins Team A
   - Verify membership in database

2. **Try to Join Again:**
   - Use same code or generate new code for Team A
   - Enter code in join modal
   - Click "Join Team"

3. **Expected Behavior:**
   - Error message: "You are already a member of this team."
   - Status code: 409
   - Response includes group details:
     ```json
     {
       "error": "You are already a member of this team.",
       "group": {
         "id": "...",
         "name": "Team A",
         "sport": "basketball"
       }
     }
     ```

4. **UI Enhancement (Optional):**
   - Modal could show: "You're already in this team. [Open Team] button"
   - Or just show error and let user close modal

5. **Verify Database:**
   - Check `group_members` table
   - Confirm only ONE membership row exists
   - Confirm membership unchanged (same joined_at timestamp)

**Expected Results:**
- ✅ 409 status code returned
- ✅ Clear error message
- ✅ No duplicate rows in database
- ✅ Existing membership preserved

---

## Edge Cases to Test

### Case 1: Code Normalization
- **Input:** `  atlit-4829  ` (mixed case, whitespace)
- **Expected:** Works (trimmed and uppercased)

### Case 2: Network Error
- **Setup:** Stop dev server
- **Action:** Try to join team
- **Expected:** "Network error. Please try again." message

### Case 3: Session Expiry
- **Setup:** Use expired JWT token
- **Action:** Try to join team
- **Expected:** Redirect to login page

### Case 4: Concurrent Joins
- **Setup:** Two users join same team simultaneously
- **Expected:** Both succeed, both become members

### Case 5: Deleted Team
- **Setup:** Admin deletes team while user has modal open
- **Action:** User tries to join
- **Expected:** "Team not found." error (404)

---

## Checklist: Feature Completeness

Before marking feature as complete, verify:

### API Endpoints
- [x] POST /api/groups/create-invite (admin only)
- [x] POST /api/groups/join-by-code (authenticated user)
- [x] POST /api/groups/revoke-invite (admin only)

### Database
- [x] `group_invites` table exists
- [x] Code uniqueness enforced
- [x] Expiration column present (optional feature)
- [x] Proper indexes on code and group_id

### Frontend
- [x] Join team button in dashboard empty state
- [x] Join team button in my-teams page
- [x] Modal component loads correctly
- [x] Input validation works
- [x] Loading states display
- [x] Success animation plays
- [x] Error messages show properly

### Security
- [x] Unauthenticated requests rejected (401)
- [x] Non-admin cannot create codes (403)
- [x] Non-admin cannot revoke codes (403)
- [x] Expired codes rejected (403)
- [x] Inactive codes rejected (403)
- [x] JWT validation works

### User Experience
- [x] Code normalization (uppercase, trim)
- [x] Case-insensitive matching
- [x] Duplicate prevention (409)
- [x] Rejoining support (reactivate membership)
- [x] Clear error messages
- [x] Success redirect works

### Data Integrity
- [x] Only one active code per group
- [x] Memberships created with role="user"
- [x] Status set to "active"
- [x] No duplicate memberships
- [x] Joined team appears in my-teams

---

## Automated Test Coverage

Run automated tests with:

```bash
npm run test:invite-codes
```

This runs comprehensive tests covering:

1. **Invite Code Creation** (6 tests)
   - Admin can create code
   - Non-admin cannot create code
   - Code stored in database
   - Code uniqueness
   - Invalid/missing group ID

2. **Join by Valid Code** (5 tests)
   - User can join with valid code
   - Membership created with correct role
   - Team appears in my-teams
   - Code normalization
   - Whitespace handling

3. **Invalid Code** (3 tests)
   - Non-existent code rejected
   - Empty code rejected
   - Missing code parameter rejected

4. **Revoked/Inactive Code** (4 tests)
   - Admin can revoke code
   - Code deactivated in database
   - Revoked code cannot be used
   - Non-admin cannot revoke

5. **Expired Code** (3 tests)
   - Expired code rejected
   - Expired code auto-deactivated
   - Non-expired code works

6. **Duplicate Membership** (4 tests)
   - Duplicate join rejected with 409
   - No duplicate rows created
   - Existing membership unchanged
   - Rejoining after removal works

7. **Role Safety** (3 tests)
   - Join always creates role="user"
   - Cannot escalate to admin via invite
   - Sub-admin requires manual assignment

8. **Per-Team Role Isolation** (2 tests)
   - User can be admin in one team, member in another
   - Joining new team doesn't affect existing roles

9. **Auth Requirements** (5 tests)
   - Unauthenticated create rejected
   - Unauthenticated join rejected
   - Unauthenticated revoke rejected
   - Invalid JWT rejected
   - All errors return JSON

**Total:** 35+ automated tests

---

## Known Limitations

1. **Admin UI for Code Management:**
   - No UI to view current invite code
   - No UI to generate new code
   - No UI to revoke code
   - **Workaround:** Use API directly or check database

2. **Expiration:**
   - Database supports expiration (`expires_at` column)
   - API handles expired codes
   - No UI to set expiration date on creation
   - Currently all codes created without expiration (NULL)

3. **Usage Tracking:**
   - No tracking of how many times code was used
   - No tracking of who joined via which code
   - **Future enhancement:** Add `used_count` and `used_by` tracking

4. **Invite Links:**
   - No shareable URL format (e.g., /join?code=ATLIT-4829)
   - Users must manually enter code
   - **Future enhancement:** Add direct invite links

---

## Troubleshooting

### Modal Doesn't Open
- Check browser console for JavaScript errors
- Verify `/components/join-team-modal.html` loads correctly
- Check that `window.joinTeamModal` is defined

### "Network Error" on Valid Code
- Verify dev server is running (port 3006)
- Check browser network tab for actual error
- Verify API endpoints exist in `/api/groups/`

### Code Always Shows "Invalid"
- Check database: Is code in `group_invites` table?
- Check `is_active` = true
- Check code spelling (case-insensitive but must match)

### Success But Team Not Visible
- Refresh the page
- Check `group_members` table in database
- Verify sport filter matches team's sport
- Check membership status = 'active'

### "Already Member" But Not in Team
- Check database for membership with status='removed'
- Try rejoining (should reactivate membership)
- Verify user_id and group_id match

---

## Test Completion Criteria

Feature is **production-ready** when:

✅ All automated tests pass (35+ tests)  
✅ All manual test scenarios complete successfully  
✅ All error cases return proper JSON responses  
✅ All edge cases handled gracefully  
✅ No duplicate memberships created  
✅ Role safety enforced (always "user")  
✅ Auth requirements enforced (401 for unauthenticated)  
✅ Admin-only operations protected (403 for non-admin)  
✅ Code normalization works (case, whitespace)  
✅ Success states provide clear feedback  
✅ Error states provide actionable messages  

**Status:** Ready for production deployment after automated tests pass.
