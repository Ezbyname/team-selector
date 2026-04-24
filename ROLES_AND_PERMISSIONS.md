# Roles & Permissions System

## Role Hierarchy (Correct Definition)

```
Super Admin (System Level)
    ↓
Admin (Team Creator)
    ↓
Sub Admin (Rater)
    ↓
Player (Team Member)
```

---

## Role Definitions

### 1. Super Admin (System Level)
**Database Value:** `'super_admin'` ⚠️ **NEEDS TO BE ADDED TO ENUM**

**Capabilities:**
- ✅ Full system access
- ✅ Create and manage any team (even others' teams)
- ✅ View ALL player ratings across all teams
- ✅ Promote users to admin
- ✅ Remove any admin/sub-admin
- ✅ Delete any team
- ✅ Access system-wide analytics
- ✅ Manage platform settings
- ✅ Can do everything admins can do

**Use Cases:**
- Platform owner/operator
- System administrators
- Support team with elevated access

**Visibility:**
- 👁️ **CAN see all player ratings**
- 👁️ Can see who rated whom and when
- 👁️ Can see rating history across all teams

**Example:** Platform owner managing the entire Team Selector system

---

### 2. Admin (Team Creator)
**Database Value:** `'admin'`

**Capabilities:**
- ✅ Create new teams
- ✅ Delete own teams (not others' teams)
- ✅ Manage players in own teams (add/remove)
- ✅ Assign sub-admins in own teams
- ✅ Remove sub-admins in own teams
- ✅ View ALL player ratings in own teams
- ✅ Edit team settings
- ✅ Use all player features (shuffle, add positions, etc.)
- ❌ Cannot see/manage other admins' teams
- ❌ Cannot promote users to admin (only super admin can)

**Use Cases:**
- Team organizers
- League managers
- People who regularly run games

**Visibility:**
- 👁️ **CAN see all player ratings in their own teams**
- 👁️ Can see who rated whom in their teams
- 👁️ Can view rating trends and statistics
- ❌ Cannot see ratings in other teams

**Example:** Sarah creates "Friday Basketball League" and can see all player ratings for her league

---

### 3. Sub Admin (Rater)
**Database Value:** `'sub_admin'`

**Capabilities:**
- ✅ **Rate/grade other players** in assigned teams
- ✅ Use all player features (shuffle, add positions, links)
- ✅ Help organize sessions
- ✅ Manage player availability
- ❌ **CANNOT see other players' ratings**
- ❌ Cannot see overall ratings or rating history
- ❌ Cannot create teams
- ❌ Cannot assign other sub-admins
- ❌ Cannot remove players

**Use Cases:**
- Trusted players who can assess skill levels
- Assistant organizers who rate newcomers
- Experienced players helping with team balance

**Visibility:**
- 👁️ Can see their OWN ratings they gave
- ❌ **CANNOT see ratings given by others**
- ❌ Cannot see aggregated ratings
- ❌ Cannot see rating statistics

**Important:** Sub-admins are "blind raters" - they rate players but don't see the overall ratings to avoid bias.

**Example:** Mike is sub-admin in "Basketball League" - he can rate new players but doesn't see what others rated or the final scores

---

### 4. Player (Team Member)
**Database Value:** `'user'`

**Capabilities:**
- ✅ Join teams (when invited)
- ✅ Use team selector
- ✅ Add player links (connections - prefer together/separate)
- ✅ Set player positions (guard, forward, etc.)
- ✅ Shuffle teams
- ✅ Mark own availability for sessions
- ✅ View generated teams
- ✅ See session details
- ❌ **CANNOT see any player ratings**
- ❌ Cannot rate other players
- ❌ Cannot create teams
- ❌ Cannot invite other players

**Use Cases:**
- Regular team members
- People who just want to play
- New members

**Visibility:**
- ❌ **CANNOT see any ratings**
- 👁️ Can see own stats (games played, wins, etc.)
- 👁️ Can see team rosters
- 👁️ Can see session schedules

**Example:** John joins "Soccer Club" as a player - he can shuffle teams and set positions but never sees ratings

---

## Rating Visibility Matrix

| Role | Can Rate Others | Can See Own Ratings | Can See Others' Ratings | Can See Team Ratings |
|------|----------------|---------------------|------------------------|---------------------|
| **Super Admin** | ✅ | ✅ | ✅ All teams | ✅ All teams |
| **Admin** | ✅ | ✅ | ✅ Own teams only | ✅ Own teams only |
| **Sub Admin** | ✅ | ✅ | ❌ | ❌ |
| **Player** | ❌ | ❌ | ❌ | ❌ |

**Key Rule:** 🔒 **ONLY Admin and Super Admin can see player ratings**

---

## Permission Matrix

| Action | Super Admin | Admin | Sub Admin | Player |
|--------|-------------|-------|-----------|--------|
| **System Management** |
| Promote to Admin | ✅ | ❌ | ❌ | ❌ |
| Manage Any Team | ✅ | ❌ | ❌ | ❌ |
| View All Ratings | ✅ | ❌ | ❌ | ❌ |
| System Analytics | ✅ | ❌ | ❌ | ❌ |
| **Team Management** |
| Create Team | ✅ | ✅ | ❌ | ❌ |
| Delete Own Team | ✅ | ✅ | ❌ | ❌ |
| Delete Any Team | ✅ | ❌ | ❌ | ❌ |
| Edit Team Settings | ✅ | ✅ (own) | ❌ | ❌ |
| Add Players | ✅ | ✅ (own) | ❌ | ❌ |
| Remove Players | ✅ | ✅ (own) | ❌ | ❌ |
| Assign Sub-Admins | ✅ | ✅ (own) | ❌ | ❌ |
| Remove Sub-Admins | ✅ | ✅ (own) | ❌ | ❌ |
| **Rating & Assessment** |
| Rate Players | ✅ | ✅ | ✅ | ❌ |
| View Own Ratings Given | ✅ | ✅ | ✅ | ❌ |
| View Team Ratings | ✅ | ✅ (own teams) | ❌ | ❌ |
| View Rating History | ✅ | ✅ (own teams) | ❌ | ❌ |
| Edit Ratings | ✅ | ✅ (own teams) | ✅ (own only) | ❌ |
| **Team Selector Features** |
| Shuffle Teams | ✅ | ✅ | ✅ | ✅ |
| Set Player Positions | ✅ | ✅ | ✅ | ✅ |
| Add Player Links | ✅ | ✅ | ✅ | ✅ |
| Generate Teams | ✅ | ✅ | ✅ | ❌ |
| **Session Management** |
| Create Session | ✅ | ✅ | ✅ | ❌ |
| Mark Availability | ✅ | ✅ | ✅ | ✅ |
| View Sessions | ✅ | ✅ | ✅ | ✅ |

---

## Database Schema Updates Required

### Current Enum (WRONG)
```sql
CREATE TYPE user_role AS ENUM ('admin', 'sub_admin', 'user');
```

### Required Enum (CORRECT)
```sql
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'sub_admin', 'user');
```

### Migration Required
```sql
-- Migration: Add super_admin role to user_role enum
ALTER TYPE user_role ADD VALUE 'super_admin' BEFORE 'admin';

-- Update existing admins to super_admin if needed
-- (Manually promote specific users)
UPDATE auth_users 
SET role = 'super_admin' 
WHERE id = '9ce3e60d-c196-4f3a-9609-a70c4e14fb9a';  -- Erez
```

---

## Feature-Specific Rules

### Player Ratings

**Who Can Rate:**
- ✅ Super Admin (anyone, any team)
- ✅ Admin (anyone in their teams)
- ✅ Sub Admin (anyone in assigned teams)
- ❌ Player (cannot rate)

**Who Can See Ratings:**
- ✅ Super Admin (all ratings, all teams)
- ✅ Admin (all ratings in their teams)
- ❌ Sub Admin (CANNOT see, only give)
- ❌ Player (CANNOT see)

**Why Sub-Admins Are Blind:**
- Prevents bias when rating
- Ensures independent assessments
- Multiple sub-admins can rate without influencing each other
- Admin sees aggregated ratings from all sub-admins

**Rating UI Rules:**
```javascript
// API: Get player ratings
function canViewRatings(user, teamId) {
  if (user.role === 'super_admin') return true;
  
  if (user.role === 'admin') {
    const team = getTeam(teamId);
    return team.created_by === user.id;
  }
  
  return false;  // sub_admin and user cannot view
}

// API: Submit rating
function canRatePlayer(user, teamId) {
  if (user.role === 'super_admin') return true;
  
  if (user.role === 'admin') {
    const team = getTeam(teamId);
    return team.created_by === user.id;
  }
  
  if (user.role === 'sub_admin') {
    const membership = getTeamMembership(user.id, teamId);
    return membership.role === 'sub_admin';
  }
  
  return false;  // regular user cannot rate
}
```

---

### Team Selector Features

**Available to:** All roles (Super Admin, Admin, Sub Admin, Player)

**Features:**
1. **Shuffle Teams** - Randomize team assignments
2. **Set Player Positions** - Assign positions (guard, forward, striker, etc.)
3. **Add Player Links** - Set connections:
   - Prefer Together (e.g., friends, good chemistry)
   - Prefer Separate (e.g., reduce skill clustering)

**Who Can Generate Teams:**
- ✅ Super Admin
- ✅ Admin
- ✅ Sub Admin
- ❌ Player (can shuffle existing teams but not generate new ones)

**Rating Awareness:**
- When Admin/Super Admin generates teams → Uses ratings for balance
- When Player/Sub Admin shuffles → Random shuffle (no rating info)

---

### Player Links (Connections)

**Who Can Add Links:**
- ✅ All roles (even regular players)

**Link Types:**
1. **Prefer Together**
   - Players who work well together
   - Friends who want to play on same team
   - Good chemistry pairs

2. **Prefer Separate**
   - Balance skill levels (don't put best players together)
   - Personality conflicts
   - Competitive balance

**Use in Team Generation:**
- Algorithm considers links when generating teams
- Links are suggestions, not hard rules
- Rating balance takes priority over links

**Example:**
```javascript
// Player sets link
addPlayerLink({
  player1: 'john-id',
  player2: 'mike-id',
  type: 'prefer_together',
  reason: 'Good passing chemistry'
});

// Algorithm considers this when generating teams
generateTeams({
  players: [...],
  ratings: {...},      // Only visible to admin/super_admin
  links: [...],        // Used by all
  positions: {...}     // Used by all
});
```

---

## UI/UX Rules by Role

### Super Admin Dashboard
**Shows:**
- All teams across platform
- System analytics
- User management
- Team ratings tab (all teams)
- Promote user button
- Platform settings

**Hides:**
- Nothing (full access)

---

### Admin Dashboard
**Shows:**
- Own teams list
- Create team button
- Team ratings tab (own teams only)
- Assign sub-admin button
- Team settings
- Player management

**Hides:**
- Other admins' teams
- Promote to admin button
- Platform settings
- System-wide analytics

---

### Sub Admin Dashboard
**Shows:**
- Teams they're sub-admin in
- Rate player button/form
- Team selector features
- Session management
- "My Ratings" history (what they rated)

**Hides:**
- Team ratings tab (cannot see ratings)
- Overall player scores
- Other people's ratings
- Admin controls

**Key UX:** When rating, show simple form:
```
Rate Player: Mike Johnson
Skill Level: [1-10 slider]
Notes: [text area]
[Submit Rating]
```

Do NOT show:
- Current average rating
- Other people's ratings
- Rating history

---

### Player Dashboard
**Shows:**
- Teams they're in
- Session schedule
- Team selector (shuffle, positions, links)
- Own statistics (games played, attendance)
- Mark availability

**Hides:**
- Any ratings (own or others)
- Rate player button
- Admin controls
- Team management
- Session creation

---

## API Endpoints by Role

### Super Admin Only
```
GET  /api/admin/users              - List all users
PUT  /api/admin/users/:id/promote  - Promote user to admin
GET  /api/admin/teams              - List all teams
GET  /api/admin/ratings/all        - View all ratings across platform
GET  /api/admin/analytics          - System-wide analytics
DELETE /api/admin/teams/:id        - Delete any team
```

### Admin + Super Admin
```
POST /api/teams                    - Create team
DELETE /api/teams/:id              - Delete own team
GET  /api/teams/:id/ratings        - View team ratings
POST /api/teams/:id/subadmins      - Assign sub-admin
DELETE /api/teams/:id/subadmins/:userId - Remove sub-admin
POST /api/teams/:id/players        - Add player
DELETE /api/teams/:id/players/:id  - Remove player
```

### Sub Admin + Admin + Super Admin
```
POST /api/ratings                  - Submit player rating
GET  /api/ratings/my-ratings       - View own ratings given
POST /api/sessions                 - Create session
POST /api/sessions/:id/generate    - Generate teams
```

### All Roles (Including Player)
```
POST /api/sessions/:id/shuffle     - Shuffle existing teams
POST /api/players/:id/position     - Set player position
POST /api/players/links            - Add player connection
GET  /api/teams/:id                - View team details
GET  /api/sessions/:id             - View session
PUT  /api/sessions/:id/availability - Mark availability
GET  /api/players/me               - View own profile
```

---

## Real-World Scenarios

### Scenario 1: Basketball League with Blind Rating

**Setup:**
- Admin: Sarah (created "Friday Basketball")
- Sub-Admins: Mike, Tom, Lisa (experienced players)
- Players: 20 regular members

**Workflow:**

1. **New Player Joins:** Kevin joins the league

2. **Sub-Admins Rate Independently:**
   - Mike rates Kevin: 7/10 (good shooter)
   - Tom rates Kevin: 6/10 (needs defensive work)
   - Lisa rates Kevin: 8/10 (great court vision)

3. **Sub-Admins See:** Only their own rating
   - Mike only sees his 7/10
   - Tom only sees his 6/10
   - Lisa only sees her 8/10

4. **Admin Sees:** All ratings and average
   - Sarah sees: Mike=7, Tom=6, Lisa=8
   - Average: 7/10
   - Uses this for team generation

5. **Players See:** Nothing
   - Kevin doesn't see his 7/10 rating
   - Other players don't see ratings either

**Result:** Fair, unbiased assessment with multiple opinions

---

### Scenario 2: Multi-Team Organization

**Setup:**
- Super Admin: Platform Owner
- Admin 1: Erez (Basketball leagues)
- Admin 2: David (Soccer leagues)

**Teams:**
- "Friday Basketball" (Erez's team)
- "Sunday Basketball" (Erez's team)
- "Monday Soccer" (David's team)

**Permissions:**

**Super Admin:**
- Can see ratings in ALL teams
- Can manage Erez's AND David's teams
- Can promote users to admin

**Erez (Admin):**
- Can see ratings in Friday + Sunday Basketball ONLY
- Cannot see David's soccer ratings
- Cannot delete David's teams
- Can assign sub-admins in his teams only

**David (Admin):**
- Can see ratings in Monday Soccer ONLY
- Cannot see Erez's basketball ratings
- Cannot delete Erez's teams
- Can assign sub-admins in his team only

---

### Scenario 3: Player Engagement Features

**Player:** John (regular user, not sub-admin)

**What John Can Do:**

1. **Set Positions:**
   ```
   John → I play Guard
   Mike → Power Forward
   Sarah → Point Guard
   ```

2. **Add Links:**
   ```
   John + Mike → Prefer Together (good passing chemistry)
   John + Tom → Prefer Separate (both ball-dominant)
   ```

3. **Shuffle Teams:**
   - Click "Shuffle" button
   - Teams randomize
   - No rating information used (John doesn't have access)

**What John CANNOT Do:**
- See player ratings
- Rate other players
- Generate balanced teams (needs ratings)
- Create sessions
- Invite new players

---

## Implementation Checklist

### Database Changes
- [ ] Add `'super_admin'` to `user_role` enum
- [ ] Update existing admin to super_admin role
- [ ] Add indexes for role-based queries

### Backend Changes
- [ ] Update role validation in all API endpoints
- [ ] Add `canViewRatings()` middleware
- [ ] Add `canRatePlayer()` middleware
- [ ] Hide ratings from sub-admins in API responses
- [ ] Add super admin endpoints

### Frontend Changes
- [ ] Conditional rendering based on role
- [ ] Hide ratings UI for sub-admins and players
- [ ] Show "Rate Player" for sub-admins only
- [ ] Show "View Ratings" for admins only
- [ ] Add super admin dashboard
- [ ] Player features (positions, links, shuffle) visible to all

### UI Components
```javascript
// Example: Conditional rating display
function RatingsTab({ user, team }) {
  const canViewRatings = ['super_admin', 'admin'].includes(user.role);
  
  if (!canViewRatings) {
    return null;  // Hide completely for sub_admin and user
  }
  
  return <RatingsPanel teamId={team.id} />;
}

// Example: Rating form for sub-admins
function RatePlayerForm({ user }) {
  const canRate = ['super_admin', 'admin', 'sub_admin'].includes(user.role);
  
  if (!canRate) return null;
  
  return (
    <form>
      <input type="range" min="1" max="10" />
      {/* Don't show current average! */}
      <button>Submit Rating</button>
    </form>
  );
}
```

---

## Testing Requirements

### Rating Visibility Tests
- [ ] Super admin can see all team ratings
- [ ] Admin can see own team ratings only
- [ ] Sub admin CANNOT see any ratings (returns 403)
- [ ] Player CANNOT see any ratings (returns 403)

### Rating Submission Tests
- [ ] Super admin can rate anyone
- [ ] Admin can rate players in own teams
- [ ] Sub admin can rate in assigned teams
- [ ] Player CANNOT rate (returns 403)

### Team Selector Tests
- [ ] All roles can shuffle teams
- [ ] All roles can set positions
- [ ] All roles can add player links
- [ ] Admin/Super admin generation uses ratings
- [ ] Player/Sub admin shuffle is random only

### UI Tests
- [ ] Ratings tab hidden for sub-admin
- [ ] Ratings tab hidden for player
- [ ] "Rate Player" button visible for sub-admin
- [ ] "Rate Player" button hidden for player
- [ ] Player features visible for all roles

---

## Security Rules

### Critical Security Requirements

1. **Rating Visibility is Role-Based Permission, Not UI**
   ```javascript
   // ❌ WRONG - Frontend only
   if (user.role === 'admin') {
     showRatings();
   }
   
   // ✅ CORRECT - Backend enforcement
   app.get('/api/teams/:id/ratings', requireAuth, (req, res) => {
     if (!['super_admin', 'admin'].includes(req.user.role)) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     // ... return ratings
   });
   ```

2. **Never Send Rating Data to Unauthorized Roles**
   ```javascript
   // ❌ WRONG - Sends data then relies on UI to hide
   const playerData = {
     name: 'John',
     rating: 7.5,  // Sent to sub-admin!
     stats: {...}
   };
   
   // ✅ CORRECT - Omit rating field for unauthorized users
   function getPlayerData(player, requestingUser) {
     const data = {
       name: player.name,
       stats: player.stats
     };
     
     if (['super_admin', 'admin'].includes(requestingUser.role)) {
       data.rating = player.rating;
     }
     
     return data;
   }
   ```

3. **Validate Role on Every Request**
   - Don't trust frontend role claims
   - Always fetch user role from database
   - Check both global role AND team-specific role

---

## Migration Script

Create file: `supabase/migrations/002_add_super_admin_role.sql`

```sql
-- Add super_admin to user_role enum
-- Note: PostgreSQL doesn't allow adding before existing values easily
-- So we'll recreate the enum

-- Step 1: Add temporary column
ALTER TABLE auth_users ADD COLUMN role_new TEXT;

-- Step 2: Copy existing roles
UPDATE auth_users SET role_new = role::TEXT;

-- Step 3: Drop old role column (drops constraint)
ALTER TABLE auth_users DROP COLUMN role;

-- Step 4: Recreate enum with super_admin
DROP TYPE user_role;
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'sub_admin', 'user');

-- Step 5: Add role column back with new enum
ALTER TABLE auth_users ADD COLUMN role user_role NOT NULL DEFAULT 'user';

-- Step 6: Copy roles back (casting from text)
UPDATE auth_users SET role = role_new::user_role;

-- Step 7: Drop temporary column
ALTER TABLE auth_users DROP COLUMN role_new;

-- Step 8: Promote specific user to super_admin
UPDATE auth_users 
SET role = 'super_admin' 
WHERE phone_normalized = '+972525502281';  -- Erez

-- Verify
SELECT id, phone, phone_normalized, role 
FROM auth_users 
WHERE role = 'super_admin';
```

---

## Current System State

**Erez's Account:**
- User ID: `9ce3e60d-c196-4f3a-9609-a70c4e14fb9a`
- Phone: +972525502281
- Current Role: `admin` ⚠️ **NEEDS UPGRADE TO super_admin**
- Password: Trzdk1408!
- Login: http://localhost:3006/login.html

**Action Required:**
```bash
# Run migration to add super_admin role
# Then update Erez's account
node update-admin-password.js  # Already has this
# Need new script: promote-to-super-admin.js
```

---

## Summary

### Key Rules
1. 🔒 **ONLY Super Admin and Admin can see player ratings**
2. ✅ Sub Admin can RATE but CANNOT SEE ratings (blind rating)
3. ✅ Player can use team selector features (shuffle, positions, links)
4. ✅ Admin creates teams, Sub Admin helps rate, Player participates
5. 🎯 Super Admin sees and manages everything

### Role Capabilities
- **Super Admin:** Everything
- **Admin:** Create teams + See own team ratings
- **Sub Admin:** Rate players (blind) + Team selector features
- **Player:** Team selector features only (no rating access)

### Database Change Required
Add `'super_admin'` to `user_role` enum via migration script

### Implementation Priority
1. Database migration (add super_admin)
2. Backend role checks (hide ratings from sub-admin)
3. Frontend conditional rendering
4. Player features (positions, links, shuffle)
5. Testing all permission combinations
