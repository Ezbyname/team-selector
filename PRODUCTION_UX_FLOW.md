# Production-Grade UX Flow

## Overview

Smart post-login experience that adapts to user context:
- Resumes last team for returning users
- Skips unnecessary steps for simple cases
- Shows empty state for new users
- Always gives user control

---

## Complete Flow Logic

```
Login
  ↓
Dashboard (Smart Landing)
  ├─ No teams? → Empty State
  ├─ Single team? → Go directly to that team
  ├─ Multiple teams + recent team? → Show resume card
  ├─ Multiple teams + single sport? → Go to that sport's teams
  └─ Multiple teams + multiple sports? → Sport Selection
  ↓
My Teams (filtered by sport)
  ↓
Team Session Setup
```

---

## 1. Smart Dashboard (`/dashboard.html`)

### Purpose
Intelligent landing page that decides best path based on user's context

### Logic Flow

**Case 1: No Teams (Empty State)**
```
IF totalTeams === 0
THEN show:
  "Welcome!
   You are not part of any team yet
   [Create Your First Team]
   [Join a Team]"
```

**Case 2: Single Team (Auto-Navigate)**
```
IF totalTeams === 1
THEN:
  Show loading spinner
  Redirect to /session-setup.html?groupId={teamId}
  (Skip all intermediate steps)
```

**Case 3: Multiple Teams + Recent Team (Resume)**
```
IF totalTeams > 1 AND lastTeamId exists
THEN show:
  "Welcome back!
   Continue where you left off?
   [🏀 Friday Basketball]  ← clickable resume card
   [Change Team]"
```

**Case 4: Multiple Teams + Single Sport (Skip Selection)**
```
IF totalTeams > 1 AND only one sport has teams
THEN:
  Redirect to /my-teams.html?sport={sport}
  (Skip sport selection - user only has one sport)
```

**Case 5: Multiple Teams + Multiple Sports (Full Flow)**
```
IF totalTeams > 1 AND both sports have teams
THEN:
  Redirect to /sport-selection.html
  (User needs to choose sport)
```

### Key Features

**Resume Card:**
- Shows last accessed team
- One-click to continue
- "Change Team" option for flexibility

**Empty State:**
- Clear welcome message
- Two CTAs: Create or Join
- No intimidating empty screens

**Auto-Navigation:**
- Single team? Go there immediately
- Single sport? Skip sport selection
- Minimize clicks for simple cases

---

## 2. API: Get All Teams

### Endpoint
```
GET /api/groups/my-teams-all
Authorization: Bearer {token}
```

### Response
```json
{
  "success": true,
  "totalTeams": 5,
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
  ],
  "teamsBySport": {
    "basketball": [...],
    "soccer": [...]
  },
  "stats": {
    "basketball": 3,
    "soccer": 2
  }
}
```

### Usage
- Dashboard decision logic
- Empty state detection
- Resume feature (find last team)
- Future: Global dashboard/analytics

---

## 3. Last Team Storage

### How It Works

**Storage:**
```javascript
// When user visits team session setup
localStorage.setItem('lastTeamId', teamId);
```

**Retrieval:**
```javascript
// On dashboard load
const lastTeamId = localStorage.getItem('lastTeamId');
const lastTeam = teams.find(t => t.id === lastTeamId);

if (lastTeam) {
  showResumeCard(lastTeam);
}
```

### Why localStorage?
- Fast (no API call needed)
- Works offline
- Simple implementation
- Can migrate to backend later if needed

### Alternative: Backend Storage
```sql
-- Future: Store in database
ALTER TABLE auth_users ADD COLUMN last_team_id UUID;

UPDATE auth_users
SET last_team_id = :teamId
WHERE id = :userId;
```

**Benefits:**
- Works across devices
- Survives cache clear
- Can add "last_accessed_at" timestamp

**Trade-off:**
- Extra API call on dashboard
- More complex implementation

**Decision:** Start with localStorage, migrate to backend if multi-device sync needed

---

## 4. Improved My Teams Page

### Header Changes

**Before:**
```
← Back to Sports | Basketball | + Create Team
```

**After:**
```
Home → Sports → Basketball        (breadcrumb)
← Back | 🏀 Your Basketball Teams | + Create Team  | Join Team
```

### Improvements

1. **Breadcrumb Navigation**
   - Shows full path: Home → Sports → Basketball
   - Clickable links at each level
   - Helps user understand location

2. **Better Title**
   - Before: "Basketball"
   - After: "Your Basketball Teams"
   - More descriptive, user-centric

3. **Join Team Button**
   - Placed next to Create Team
   - Same prominence
   - Enables future invite flow

4. **Back Button Destination**
   - Before: Sport Selection
   - After: Smart (dashboard if came from resume, sport selection otherwise)

---

## 5. Join Team Flow (Coming Soon)

### User Flow
```
My Teams → Click "Join Team"
  ↓
Modal Opens:
  "Join Team
   Enter team code or invite link
   [________]
   [Join Team]"
  ↓
Validation:
  - Check if code exists
  - Check if user already in team
  - Add user to group_members
  ↓
Success:
  - Close modal
  - Redirect to team session setup
  OR
  - Refresh team list
```

### Implementation Plan

**Phase 1: Team Codes**
```javascript
// Generate unique code when team created
const teamCode = generateShortCode(6); // e.g., "BKT-A3F"

// Store in groups table
UPDATE groups
SET invite_code = :code
WHERE id = :teamId;
```

**Phase 2: Join API**
```
POST /api/groups/join
{
  "code": "BKT-A3F"
}

→ Adds user to group_members
→ Returns team details
```

**Phase 3: Invite Links**
```
https://teamsel.app/join?code=BKT-A3F

→ Auto-populate code
→ One-click join
```

---

## 6. UX Rules

### Rule 1: Never Auto-Navigate Without Context
❌ **Don't:** Auto-redirect to random team on login
✅ **Do:** Show resume card, let user confirm

### Rule 2: Skip Steps Only When Safe
✅ **Safe to skip:**
- Single team → Go directly to it
- Single sport with multiple teams → Show that sport's teams

❌ **Don't skip:**
- Sport selection when user has both sports
- Team selection when multiple options

### Rule 3: Always Provide Escape Hatches
Every auto-navigation should have:
- Clear indicator of what's happening
- Way to go back
- Alternative path

**Example:**
```
Resume Card:
  [🏀 Friday Basketball]  ← Main action
  [Change Team]            ← Escape hatch
```

### Rule 4: Progressive Disclosure
Show complexity only when needed:
- New user? Simple: Create or Join
- Single team user? Just show that team
- Power user? Full navigation options

### Rule 5: Consistent Navigation
Every page should answer:
- Where am I? (breadcrumb)
- Where can I go? (back button, home link)
- What can I do? (action buttons)

---

## 7. Performance Optimizations

### Fast Dashboard Load
```javascript
// Single API call gets everything needed
const response = await fetch('/api/groups/my-teams-all');

// All decisions made client-side from this data
// No additional API calls for logic
```

### Resume Without API Call
```javascript
// Team info already in localStorage
const lastTeamId = localStorage.getItem('lastTeamId');

// Only need team list to find team name/sport
// Already have from initial call
```

### Preload Next Step
```javascript
// While showing resume card, prefetch team data
if (lastTeam) {
  fetch(`/api/groups/${lastTeam.id}`);  // Cache for next page
}
```

---

## 8. Mobile Optimizations

### Dashboard Mobile Layout
```css
@media (max-width: 640px) {
  .dashboard-card {
    padding: 40px 30px;
  }

  .resume-card {
    padding: 20px;
  }

  .action-buttons {
    flex-direction: column;
  }
}
```

### Touch Targets
- All buttons minimum 44px height
- Resume card large, easy to tap
- Good spacing between actions

### Loading States
- Show spinner immediately
- Never blank screen
- Provide feedback within 100ms

---

## 9. Edge Cases

### Edge Case 1: Team Deleted While User Away
```javascript
const lastTeam = teams.find(t => t.id === lastTeamId);

if (!lastTeam) {
  // Team no longer exists or user removed
  // Fall through to normal flow (don't show resume)
  decideFallbackFlow(teams);
}
```

### Edge Case 2: User Removed From Team
```javascript
// API only returns teams user has access to
// If removed, team won't be in list
// Resume will automatically not show
```

### Edge Case 3: Multiple Tabs/Sessions
```javascript
// localStorage shared across tabs
// Last accessed team updates in real-time
// All tabs see same resume suggestion
```

### Edge Case 4: localStorage Cleared
```javascript
const lastTeamId = localStorage.getItem('lastTeamId');

if (!lastTeamId) {
  // No stored team - proceed with normal flow
  // No error, just skip resume feature
}
```

### Edge Case 5: Slow Network
```javascript
// Show loading state immediately
setTimeout(() => {
  if (still_loading) {
    showMessage('Taking longer than usual...');
  }
}, 3000);
```

---

## 10. Analytics & Metrics

### Track User Paths
```javascript
// Log which flow user took
analytics.track('Dashboard Decision', {
  flow: 'resume' | 'empty' | 'single_team' | 'single_sport' | 'multi_sport',
  totalTeams: number,
  hasBothSports: boolean
});
```

### Success Metrics
- **Resume CTR:** % who click resume vs change team
- **Auto-nav Success:** % who stay in auto-navigated team
- **Empty State Conversion:** % who create/join from empty state
- **Flow Efficiency:** Average clicks to reach team

---

## 11. Future Enhancements

### Smart Suggestions
```
"Welcome back!

Last played:
[🏀 Friday Basketball]

Upcoming sessions:
[⚽ Monday Soccer - Tomorrow 7 PM]
[🏀 Wednesday Hoops - In 3 days]"
```

### Multi-Device Sync
```javascript
// Backend stores last team
PUT /api/users/me/last-team
{
  "teamId": "uuid",
  "lastAccessedAt": "2026-04-24T12:00:00Z"
}

// Sync across devices
// Mobile and desktop show same resume
```

### Team Recommendations
```
"Based on your activity:
- Friday Basketball has a session tonight
- Sunday Pickup needs 2 more players"
```

### Quick Actions
```
Resume Card:
[🏀 Friday Basketball]

Quick actions:
[Create Session] [View Players] [Team Settings]
```

---

## 12. Testing Scenarios

### Test 1: New User (Empty State)
1. Create new account
2. Login
3. ✅ Should see: "Welcome! You are not part of any team yet"
4. ✅ Should see: Create and Join buttons

### Test 2: Single Team User
1. User has 1 team
2. Login
3. ✅ Should see: Loading spinner
4. ✅ Should auto-navigate to team within 500ms

### Test 3: Returning User (Resume)
1. User accessed "Friday Basketball" yesterday
2. Login today
3. ✅ Should see: "Welcome back!" + resume card
4. ✅ Resume card shows: 🏀 Friday Basketball
5. ✅ Change Team button visible

### Test 4: Single Sport User
1. User has 3 basketball teams, 0 football teams
2. Login
3. ✅ Should skip sport selection
4. ✅ Should go directly to basketball teams list

### Test 5: Multi-Sport User
1. User has 2 basketball + 2 football teams
2. Login (no recent team stored)
3. ✅ Should show sport selection
4. ✅ Should see both sport cards

### Test 6: Resume Team Deleted
1. User's last team was deleted
2. Login
3. ✅ Should not show resume
4. ✅ Should fall through to appropriate flow

---

## 13. API Updates Summary

### New Endpoints
```
GET /api/groups/my-teams-all
- Returns ALL user's teams (no sport filter)
- Used for dashboard logic

POST /api/groups/join (TODO)
- Join team via invite code
- Returns joined team details
```

### Existing Endpoints (No Changes)
```
GET /api/groups/my-teams?sport=basketball
- Still used by my-teams.html
- No breaking changes

POST /api/groups/create
- Still used by create-team.html
- No changes needed
```

---

## 14. File Changes Summary

### New Files
- `frontend/dashboard.html` - Smart landing page
- `api/groups/my-teams-all.js` - Get all teams endpoint

### Modified Files
- `frontend/auth.js` - Redirect to dashboard
- `frontend/login.html` - Redirect to dashboard
- `frontend/my-teams.html` - Better header, join button, breadcrumb
- `frontend/session-setup.html` - Store lastTeamId

### Unchanged Files
- `frontend/sport-selection.html` - Still works as fallback
- `frontend/create-team.html` - No changes needed
- `api/groups/my-teams.js` - Still used by my-teams page

---

## 15. Migration from Old Flow

### Before
```
Login → Sport Selection → My Teams → Session
(Always 3 clicks minimum)
```

### After
```
Login → Dashboard →
  ├─ Empty State → Create/Join
  ├─ Single Team → Session (1 click)
  ├─ Resume → Session (1 click)
  ├─ Single Sport → My Teams → Session (2 clicks)
  └─ Multi Sport → Sport Selection → My Teams → Session (3 clicks)

(1-3 clicks depending on context)
```

### Benefits
- Returning users: 66% fewer clicks
- Single team users: 66% fewer clicks
- New users: Clear onboarding
- Power users: Full control maintained

---

## Summary

### What Changed
1. ✅ Smart dashboard with context-aware navigation
2. ✅ Resume last team feature
3. ✅ Auto-skip for simple cases (single team/sport)
4. ✅ Empty state for new users
5. ✅ Join Team button (UI only, API pending)
6. ✅ Better headers and breadcrumbs
7. ✅ New API for all teams

### User Experience Improvements
- **Faster:** Fewer clicks for common cases
- **Smarter:** Adapts to user context
- **Clearer:** Better navigation and labels
- **Production-ready:** Handles all edge cases

### Key Principles
1. Give user control (resume vs change)
2. Skip steps only when safe
3. Handle empty states gracefully
4. Provide escape hatches
5. Fast and responsive

**This is production-grade UX, not a prototype.**
