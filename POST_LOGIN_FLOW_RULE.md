# Post-Login Navigation Flow Rule

## Critical Rule: NEVER Skip Sport Selection

After login, users MUST go through the sport selection step before seeing any teams.

---

## Complete Navigation Flow

```
Login/Register
    ↓
Sport Selection
    ↓
My Teams (filtered by sport)
    ↓
Team Session Setup
```

**DO NOT** skip any step in this flow.

---

## Step-by-Step Flow

### Step 1: Authentication
**Pages:** `/login.html` or `/index.html` (OTP flow)

**After successful login:**
- Store access token in localStorage
- Store user info in localStorage
- **Redirect to:** `/sport-selection.html`

**Code:**
```javascript
// ❌ WRONG - Old behavior
function showMainApp() {
  document.getElementById('mainContainer').style.display = 'block';
}

// ✅ CORRECT - Redirect to sport selection
function showMainApp() {
  window.location.href = '/sport-selection.html';
}
```

---

### Step 2: Sport Selection
**Page:** `/sport-selection.html`

**Display:**
- 🏀 Basketball card
- ⚽ Football card
- Logout link (top-right)

**User Action:** Click a sport

**Behavior:**
- Navigate to `/my-teams.html?sport=basketball`
- Navigate to `/my-teams.html?sport=soccer`

**Important:**
- Do NOT show "all teams" option
- Do NOT combine sports
- Force user to pick ONE sport

**Why:**
- Clear mental model (one sport at a time)
- Simpler team list (no mixing basketball & football)
- Easier team creation (sport prefilled)

---

### Step 3: My Teams (Filtered by Sport)
**Page:** `/my-teams.html?sport={basketball|soccer}`

**API Call:** `GET /api/groups/my-teams?sport=basketball`

**Display:**
- Header: Sport icon + name (e.g., "🏀 Basketball")
- "Back to Sports" button
- "Create Team" button
- Team cards (if user has teams)
- Empty state (if no teams)

**Team Card Shows:**
- Team name
- Role badge (Admin / Sub Admin / Member)
- Member count
- Session count

**Empty State:**
```
🏟️
No teams yet
You are not in any [sport] teams yet

[Create New Team button]
```

**User Actions:**
1. Click team → Go to `/session-setup.html?groupId={teamId}`
2. Click "Create Team" → Go to `/create-team.html?sport={sport}`
3. Click "Back to Sports" → Go to `/sport-selection.html`

---

### Step 4a: Create Team
**Page:** `/create-team.html?sport={basketball|soccer}`

**Display:**
- Back to teams link
- Sport display (prefilled, read-only)
- Team name input
- "Create Team" button

**Behavior:**
- Sport is prefilled from URL parameter
- User enters team name
- POST to `/api/groups/create`
- User becomes admin of new team
- Redirect to `/session-setup.html?groupId={newTeamId}`

---

### Step 4b: Team Session Setup
**Page:** `/session-setup.html?groupId={teamId}`

**Existing page** - no changes needed

**Behavior:**
- Load team details
- Show players, add players, etc.
- Normal team selector flow

---

## API Endpoints

### GET /api/groups/my-teams
**Query Params:**
- `sport` (required): `basketball` or `soccer`

**Returns:**
```json
{
  "success": true,
  "sport": "basketball",
  "teams": [
    {
      "id": "uuid",
      "name": "Friday Basketball",
      "sport": "basketball",
      "role": "admin",
      "isOwner": true,
      "memberCount": 15,
      "sessionCount": 8,
      "createdAt": "2026-04-24T12:00:00Z"
    }
  ]
}
```

**Role Values:**
- `admin` - User created the team
- `sub_admin` - User is sub-admin in team
- `user` - User is regular member

**Logic:**
1. Get teams where user is creator (admin role)
2. Get teams where user is member (via group_members)
3. Filter both by sport
4. Combine and deduplicate
5. Add member/session counts

---

## Database Queries

### Teams User Created (Admin)
```sql
SELECT * FROM groups
WHERE created_by = :userId
AND sport = :sport
ORDER BY created_at DESC;
```

### Teams User Is Member Of
```sql
SELECT g.*, gm.role as member_role
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
WHERE gm.user_id = :userId
AND g.sport = :sport
AND g.created_by != :userId  -- Don't duplicate owned teams
ORDER BY g.created_at DESC;
```

### Combined Results
- User's owned teams get `role: 'admin'`
- User's member teams get `role: [sub_admin|user]`

---

## Key Product Rules

### 1. Multi-Sport Membership
**Rule:** A user can belong to multiple teams across different sports

**Examples:**
- User is admin in "Friday Basketball" ✅
- User is member in "Monday Basketball" ✅
- User is admin in "Wednesday Soccer" ✅
- All valid simultaneously ✅

### 2. Multi-Team Membership
**Rule:** A user can belong to multiple teams in the same sport

**Examples:**
- Member of "Friday Basketball" ✅
- Member of "Sunday Basketball" ✅
- Both are basketball teams ✅

### 3. Team-Specific Roles
**Rule:** User role is per-team, not global

**Examples:**
- Admin in "Friday Basketball"
- Sub-admin in "Monday Basketball"
- Regular member in "Wednesday Basketball"
- All different roles in different teams ✅

**Database:**
- Global role: `auth_users.role`
- Team role: `group_members.role`
- Creator role: Derived from `groups.created_by`

### 4. Sport Separation
**Rule:** Never mix sports in the same view

**Why:**
- Basketball and football have different positions
- Different rating scales
- Different player attributes
- Different scheduling needs

**Implementation:**
- Filter teams by sport
- Show one sport at a time
- Separate navigation per sport

---

## Navigation Components

### Sport Selection Header
```html
<div class="sport-header">
  <h1>Select Sport</h1>
  <p>Choose a sport to view your teams</p>
</div>
```

### Teams Header
```html
<div class="teams-header">
  <a href="/sport-selection.html">← Back to Sports</a>
  <h1>
    <span>🏀</span>
    <span>Basketball</span>
  </h1>
  <button onclick="createTeam()">+ Create Team</button>
</div>
```

### Breadcrumb Pattern
```
Home → Basketball → Friday League → Session
Home → Football → Monday Soccer → Session
```

---

## URL Structure

### Good (Current)
```
/sport-selection.html
/my-teams.html?sport=basketball
/my-teams.html?sport=soccer
/create-team.html?sport=basketball
/session-setup.html?groupId=uuid
```

### Bad (Never Do This)
```
/my-teams.html                    ❌ No sport filter
/all-teams.html                   ❌ Mixing sports
/teams.html?sport=basketball      ❌ Generic name
/basketball/teams.html            ❌ Path-based (breaks pattern)
```

---

## Edge Cases

### 1. User Has No Teams
**Scenario:** New user logs in

**Flow:**
1. Login → Sport Selection
2. Click Basketball → My Teams (empty state)
3. See: "No teams yet" + "Create New Team" button
4. Click button → Create Team page (sport prefilled)
5. Create team → Redirect to team session setup

**Result:** Smooth onboarding, clear next step

---

### 2. User in Only One Sport
**Scenario:** User only plays basketball

**Flow:**
1. Login → Sport Selection (still shows both sports)
2. Click Basketball → See their teams
3. Click Football → See empty state

**Why Not Skip:** User might create football team later

---

### 3. Direct URL Access
**Scenario:** User bookmarks `/session-setup.html?groupId=uuid`

**Behavior:**
- Check authentication
- Load team
- Allow access (bookmark is valid)

**Note:** Don't force sport selection for bookmarked team URLs

---

### 4. Invalid Sport Parameter
**Scenario:** `/my-teams.html?sport=tennis`

**Behavior:**
```javascript
if (!sport || !['basketball', 'soccer'].includes(sport)) {
  window.location.href = '/sport-selection.html';
}
```

**Result:** Redirect to sport selection

---

## Implementation Checklist

### Pages Created
- [x] `/sport-selection.html` - Sport selection screen
- [x] `/my-teams.html` - Filtered team list by sport
- [x] `/create-team.html` - Create team with prefilled sport

### API Endpoints Created
- [x] `GET /api/groups/my-teams?sport={sport}` - Get user's teams

### Redirects Updated
- [x] `login.html` → Redirect to `/sport-selection.html`
- [x] `auth.js` → Redirect to `/sport-selection.html`
- [x] Registration success → Redirect to `/sport-selection.html`

### Navigation Links
- [x] Sport cards → Link to team list
- [x] Team cards → Link to session setup
- [x] Create button → Link to create form
- [x] Back buttons → Link to previous step

---

## Testing Scenarios

### Test 1: New User Flow
1. Register new account
2. Should land on sport selection
3. Click Basketball
4. Should see empty state
5. Click "Create New Team"
6. Enter team name
7. Should create team and redirect to session setup

### Test 2: Existing User Flow
1. Login with existing account
2. Should land on sport selection
3. Click Basketball
4. Should see basketball teams only
5. Click a team
6. Should load team session setup

### Test 3: Multi-Sport User
1. Login as user in both sports
2. Click Basketball → See basketball teams
3. Back to sports
4. Click Football → See football teams
5. No teams should appear in both lists (sport filter works)

### Test 4: Role Display
1. Login as user with mixed roles
2. View teams
3. Admin teams show "Admin" badge
4. Sub-admin teams show "Sub Admin" badge
5. Member teams show "Member" badge

---

## Error Handling

### Missing Sport Parameter
```javascript
if (!sport) {
  window.location.href = '/sport-selection.html';
}
```

### Invalid Sport
```javascript
if (!['basketball', 'soccer'].includes(sport)) {
  window.location.href = '/sport-selection.html';
}
```

### API Error Loading Teams
```html
<div class="loading">
  Error loading teams. Please refresh the page.
</div>
```

### No Authentication
```javascript
if (!accessToken) {
  window.location.href = '/login.html';
}
```

---

## Future Enhancements

### 1. Add More Sports
**Easy to extend:**
```javascript
const sportConfig = {
  basketball: { icon: '🏀', name: 'Basketball' },
  soccer: { icon: '⚽', name: 'Football' },
  volleyball: { icon: '🏐', name: 'Volleyball' },  // Add here
  handball: { icon: '🤾', name: 'Handball' }        // Add here
};
```

### 2. Recent Sport Memory
**Remember last sport:**
```javascript
localStorage.setItem('lastSport', 'basketball');
// On sport selection, highlight last used
```

### 3. Sport Tabs Instead of Cards
**For power users:**
```
[Basketball] [Football] [Volleyball]
     ↓
My Basketball Teams:
- Friday League
- Sunday Pickup
```

### 4. Combined View (Optional)
**Only for admins managing multiple sports:**
```
/admin/all-teams
- Shows all teams across all sports
- Clearly labeled by sport
- Admin-only view
```

---

## Summary

### Golden Rules
1. ✅ **ALWAYS** show sport selection after login
2. ✅ **NEVER** mix sports in team list
3. ✅ **ALWAYS** filter teams by sport
4. ✅ Roles are per-team, not global
5. ✅ Users can belong to multiple teams across sports

### Navigation Path
```
Login
  ↓
Sport Selection (Basketball / Football)
  ↓
My Teams (filtered)
  ↓
Team Session Setup
```

### Key Files
- `sport-selection.html` - Sport picker
- `my-teams.html` - Filtered team list
- `create-team.html` - Team creation form
- `api/groups/my-teams.js` - Get user's teams by sport

### User Benefits
- Clear mental model (one sport at a time)
- Faster team selection (filtered list)
- Easier team creation (sport prefilled)
- Better organization (separated by sport)
- Scalable (easy to add more sports)
