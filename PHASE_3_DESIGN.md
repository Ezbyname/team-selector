# Phase 3: Admin/Sub-Admin/Player Grading System - Design Document

**Date:** 2026-04-22  
**Status:** 📋 **Design Phase - Awaiting Approval**  
**Prerequisites:** ✅ Phase 2 Auth Validation Complete (36/36 tests passed)

---

## Product Requirements

### User Story
As an **admin**, I want to:
1. Access an admin-only tab in the app
2. Create sub-admins (promote users)
3. Revoke sub-admins (demote to users)
4. Control whether a sub-admin can grade players
5. Grade players with ratings
6. Have all permissions enforced in DB, API, and UI

### Permission Model (Flexible)

```
User Roles:
- admin: Full system access
- sub_admin: Limited admin access (configurable)
- user: Regular user (default)

Permissions (separate from role):
- can_grade_players: boolean (independent of role)
```

**Design Decision:** 
- Role defines user type
- Permissions define capabilities
- A sub_admin can exist WITHOUT grading permission
- Admin controls permissions separately from role assignment

---

## Database Schema

### 1. Extend auth_users Table

```sql
-- Add permissions column
ALTER TABLE auth_users
ADD COLUMN permissions JSONB DEFAULT '{}';

-- Example permission structure:
-- {
--   "can_grade_players": true,
--   "can_view_analytics": false,
--   ...future permissions...
-- }

-- Create index for permission queries
CREATE INDEX idx_auth_users_permissions ON auth_users USING gin(permissions);
```

### 2. Create player_ratings Table

```sql
CREATE TABLE player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('basketball', 'soccer')),
  position TEXT, -- Sport-specific position
  
  -- Rating components (1-10 scale)
  skill_rating INTEGER CHECK (skill_rating >= 1 AND skill_rating <= 10),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 10),
  teamwork_rating INTEGER CHECK (teamwork_rating >= 1 AND teamwork_rating <= 10),
  
  -- Calculated overall rating (average)
  overall_rating DECIMAL(3,1) GENERATED ALWAYS AS (
    (skill_rating + speed_rating + teamwork_rating) / 3.0
  ) STORED,
  
  -- Metadata
  notes TEXT, -- Optional notes from grader
  rated_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one rating per player per sport
  UNIQUE(player_name, sport)
);

-- Indexes
CREATE INDEX idx_player_ratings_sport ON player_ratings(sport);
CREATE INDEX idx_player_ratings_overall ON player_ratings(overall_rating DESC);
CREATE INDEX idx_player_ratings_rated_by ON player_ratings(rated_by);

-- RLS Policies
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

-- Users with can_grade_players permission can view
CREATE POLICY "graders_view_ratings" ON player_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR (permissions->>'can_grade_players')::boolean = true
      )
    )
  );

-- Users with can_grade_players permission can insert/update
CREATE POLICY "graders_manage_ratings" ON player_ratings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR (permissions->>'can_grade_players')::boolean = true
      )
    )
  );
```

### 3. Create admin_actions Table (Audit Log)

```sql
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth_users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_sub_admin',
    'revoke_sub_admin',
    'grant_permission',
    'revoke_permission',
    'rate_player',
    'update_rating'
  )),
  target_user_id UUID REFERENCES auth_users(id), -- For user actions
  target_player_name TEXT, -- For rating actions
  details JSONB, -- Additional action details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);

-- RLS: Only admins can view audit log
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_view_audit_log" ON admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

## API Endpoints

### Admin Management Endpoints

#### 1. Create Sub-Admin

```
POST /api/admin/create-sub-admin
Auth: Admin only
Body: {
  userId: UUID,
  grantGradingPermission: boolean (optional, default: false)
}
Response: {
  success: true,
  user: { id, phone, role, permissions }
}
```

**Logic:**
1. Verify caller is admin
2. Check target user exists
3. Update role to 'sub_admin'
4. If grantGradingPermission: set permissions.can_grade_players = true
5. Log action in admin_actions
6. Return updated user

#### 2. Revoke Sub-Admin

```
POST /api/admin/revoke-sub-admin
Auth: Admin only
Body: {
  userId: UUID
}
Response: {
  success: true,
  user: { id, phone, role, permissions }
}
```

**Logic:**
1. Verify caller is admin
2. Check target user exists and is sub_admin
3. Update role to 'user'
4. Remove all permissions (reset to {})
5. Log action in admin_actions
6. Return updated user

#### 3. Grant Permission

```
POST /api/admin/grant-permission
Auth: Admin only
Body: {
  userId: UUID,
  permission: 'can_grade_players' | string
}
Response: {
  success: true,
  user: { id, phone, role, permissions }
}
```

**Logic:**
1. Verify caller is admin
2. Check target user exists
3. Update permissions[permission] = true
4. Log action in admin_actions
5. Return updated user

#### 4. Revoke Permission

```
POST /api/admin/revoke-permission
Auth: Admin only
Body: {
  userId: UUID,
  permission: 'can_grade_players' | string
}
Response: {
  success: true,
  user: { id, phone, role, permissions }
}
```

**Logic:**
1. Verify caller is admin
2. Check target user exists
3. Update permissions[permission] = false (or remove key)
4. Log action in admin_actions
5. Return updated user

#### 5. List Users

```
GET /api/admin/users
Auth: Admin only
Query: ?role=sub_admin&permission=can_grade_players
Response: {
  users: [{ id, phone, role, permissions, created_at }]
}
```

**Logic:**
1. Verify caller is admin
2. Query auth_users with filters
3. Return user list

### Player Rating Endpoints

#### 6. Grade Player

```
POST /api/ratings/grade-player
Auth: Admin OR can_grade_players permission
Body: {
  playerName: string,
  sport: 'basketball' | 'soccer',
  position?: string,
  skillRating: 1-10,
  speedRating: 1-10,
  teamworkRating: 1-10,
  notes?: string
}
Response: {
  success: true,
  rating: { id, playerName, sport, skillRating, speedRating, teamworkRating, overallRating, ... }
}
```

**Logic:**
1. Verify caller has can_grade_players permission OR is admin
2. Validate ratings (1-10)
3. Upsert rating (insert or update if exists)
4. Set rated_by to caller's user ID
5. Log action in admin_actions
6. Return rating

#### 7. Get Player Ratings

```
GET /api/ratings/players
Auth: Admin OR can_grade_players permission
Query: ?sport=basketball
Response: {
  ratings: [{ playerName, sport, overallRating, skillRating, speedRating, teamworkRating, ... }]
}
```

**Logic:**
1. Verify caller has can_grade_players permission OR is admin
2. Query player_ratings with sport filter
3. Return ratings sorted by overallRating DESC

#### 8. Get Player Rating

```
GET /api/ratings/player/:name
Auth: Admin OR can_grade_players permission
Query: ?sport=basketball
Response: {
  rating: { playerName, sport, position, ratings, notes, ratedBy, ... }
}
```

**Logic:**
1. Verify caller has can_grade_players permission OR is admin
2. Query rating by player name and sport
3. Return rating details

---

## Permission Enforcement

### Database Layer (RLS)
```sql
-- Check in RLS policies
WHERE (
  role = 'admin'
  OR (permissions->>'can_grade_players')::boolean = true
)
```

### API Layer (Middleware)
```javascript
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireGradingPermission(req, res, next) {
  if (
    req.user.role === 'admin' ||
    req.user.permissions?.can_grade_players === true
  ) {
    return next();
  }
  return res.status(403).json({ error: 'Grading permission required' });
}
```

### UI Layer (React/Component)
```javascript
// Hide/show UI elements based on permissions
function canGradePlayers(user) {
  return user.role === 'admin' || user.permissions?.can_grade_players === true;
}

function isAdmin(user) {
  return user.role === 'admin';
}

// Usage
{isAdmin(currentUser) && <AdminTab />}
{canGradePlayers(currentUser) && <GradePlayersButton />}
```

---

## UI Scope

### 1. Admin Tab (Admin Only)

**Location:** Header navigation (new tab, visible to admins only)

**Components:**
- User Management Panel
  - List of all users
  - Filter by role (admin, sub_admin, user)
  - Filter by permission (can_grade_players)
  - Actions per user:
    - Promote to Sub-Admin
    - Revoke Sub-Admin
    - Grant/Revoke Permissions
- Audit Log Viewer
  - Recent admin actions
  - Filter by action type
  - Search by user

**Layout:**
```
┌─────────────────────────────────────┐
│ Admin Panel                         │
├─────────────────────────────────────┤
│ Users                               │
│ ┌─────────────────────────────────┐ │
│ │ Search: [___________] [Filter]  │ │
│ │                                 │ │
│ │ User                 Role  Actions│
│ │ ───────────────────────────────│ │
│ │ 052-123-4567        user   [▼] │ │
│ │ 052-999-8888     sub_admin [▼] │ │
│ │ 052-550-2281        admin  [▼] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Audit Log                           │
│ ┌─────────────────────────────────┐ │
│ │ Recent Actions:                 │ │
│ │ • Admin created sub-admin...    │ │
│ │ • Sub-admin rated player...     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. Grade Players Tab (Admin + Graders)

**Location:** Header navigation (visible to users with permission)

**Components:**
- Player Search/Select
- Sport Selection (Basketball/Soccer)
- Position Selection (sport-specific)
- Rating Sliders:
  - Skill (1-10)
  - Speed (1-10)
  - Teamwork (1-10)
- Overall Rating Display (calculated average)
- Notes (optional text field)
- Save/Update Button
- Rated Players List
  - Search/filter
  - Sort by overall rating
  - Edit existing ratings

**Layout:**
```
┌─────────────────────────────────────┐
│ Grade Players                       │
├─────────────────────────────────────┤
│ Player: [Select...▼]  Sport: [▼]   │
│ Position: [▼]                       │
│                                     │
│ Skill:    ●────────○  (7/10)       │
│ Speed:    ●──○──────  (3/10)       │
│ Teamwork: ●──────○──  (6/10)       │
│                                     │
│ Overall: 5.3/10 ★★★★★☆☆☆☆☆         │
│                                     │
│ Notes: [_______________________]    │
│                                     │
│ [Save Rating]                       │
│                                     │
│ Recent Ratings:                     │
│ • John Doe - Basketball - 8.3      │
│ • Jane Smith - Soccer - 7.5        │
└─────────────────────────────────────┘
```

### 3. User Actions Menu (Dropdown)

**Trigger:** Click on user in admin panel

**Options:**
- If role === 'user':
  - Promote to Sub-Admin
  - Grant Grading Permission
- If role === 'sub_admin':
  - Revoke Sub-Admin (demote to user)
  - Grant/Revoke Grading Permission
- If role === 'admin':
  - (No actions - cannot modify admins)

---

## Validation Plan

### Database Validation
```sql
-- Test 1: Create sub-admin
UPDATE auth_users SET role = 'sub_admin' WHERE id = 'test-user-id';

-- Test 2: Grant permission
UPDATE auth_users 
SET permissions = jsonb_set(permissions, '{can_grade_players}', 'true'::jsonb)
WHERE id = 'test-user-id';

-- Test 3: Verify RLS
-- As non-admin: SELECT * FROM player_ratings; -- Should fail
-- As grader: SELECT * FROM player_ratings; -- Should succeed

-- Test 4: Insert rating
INSERT INTO player_ratings (player_name, sport, skill_rating, speed_rating, teamwork_rating, rated_by)
VALUES ('Test Player', 'basketball', 8, 7, 9, 'grader-user-id');

-- Test 5: Query ratings
SELECT * FROM player_ratings WHERE sport = 'basketball' ORDER BY overall_rating DESC;
```

### API Validation
```javascript
// Test 1: Admin creates sub-admin
POST /api/admin/create-sub-admin
Body: { userId: 'test-user-id', grantGradingPermission: true }
Expected: 200, user.role = 'sub_admin', permissions.can_grade_players = true

// Test 2: Admin grants permission
POST /api/admin/grant-permission
Body: { userId: 'test-user-id', permission: 'can_grade_players' }
Expected: 200, permissions.can_grade_players = true

// Test 3: Sub-admin grades player
POST /api/ratings/grade-player
Body: { playerName: 'John Doe', sport: 'basketball', skillRating: 8, ... }
Expected: 200, rating created

// Test 4: Regular user tries to grade (should fail)
POST /api/ratings/grade-player
Expected: 403, error: 'Grading permission required'

// Test 5: Admin revokes sub-admin
POST /api/admin/revoke-sub-admin
Body: { userId: 'test-user-id' }
Expected: 200, user.role = 'user', permissions = {}
```

### UI Validation
- [ ] Admin tab visible to admin, hidden from others
- [ ] Grade Players tab visible to admin + graders, hidden from others
- [ ] User actions work correctly (promote, revoke, grant, revoke)
- [ ] Rating sliders work (1-10 range)
- [ ] Overall rating calculates correctly (average)
- [ ] Save rating creates/updates in database
- [ ] Permissions enforced (403 on unauthorized actions)

---

## Implementation Phases

### Phase 3.1: Database + Backend (Priority 1)
**Estimated:** 2-3 hours
1. Create database migration script
2. Deploy schema to Supabase
3. Implement API endpoints (admin + rating)
4. Add permission middleware
5. Test with Postman/automated tests

### Phase 3.2: UI Components (Priority 2)
**Estimated:** 3-4 hours
1. Create AdminPanel component
2. Create GradePlayersPanel component
3. Create UserActionsMenu component
4. Add navigation tabs with permission checks
5. Integrate with API endpoints

### Phase 3.3: Polish + Validation (Priority 3)
**Estimated:** 1-2 hours
1. End-to-end testing
2. Error handling
3. Loading states
4. Success notifications
5. Audit log viewer
6. Documentation

**Total Estimated Time:** 6-9 hours

---

## Migration Script

```sql
-- migration_003_admin_grading_system.sql

-- 1. Add permissions column to auth_users
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_auth_users_permissions 
ON auth_users USING gin(permissions);

-- 2. Create player_ratings table
CREATE TABLE IF NOT EXISTS player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('basketball', 'soccer')),
  position TEXT,
  skill_rating INTEGER CHECK (skill_rating >= 1 AND skill_rating <= 10),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 10),
  teamwork_rating INTEGER CHECK (teamwork_rating >= 1 AND teamwork_rating <= 10),
  overall_rating DECIMAL(3,1) GENERATED ALWAYS AS (
    (skill_rating + speed_rating + teamwork_rating) / 3.0
  ) STORED,
  notes TEXT,
  rated_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_name, sport)
);

CREATE INDEX idx_player_ratings_sport ON player_ratings(sport);
CREATE INDEX idx_player_ratings_overall ON player_ratings(overall_rating DESC);
CREATE INDEX idx_player_ratings_rated_by ON player_ratings(rated_by);

-- RLS for player_ratings
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "graders_view_ratings" ON player_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR (permissions->>'can_grade_players')::boolean = true
      )
    )
  );

CREATE POLICY "graders_manage_ratings" ON player_ratings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR (permissions->>'can_grade_players')::boolean = true
      )
    )
  );

-- 3. Create admin_actions audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth_users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_sub_admin',
    'revoke_sub_admin',
    'grant_permission',
    'revoke_permission',
    'rate_player',
    'update_rating'
  )),
  target_user_id UUID REFERENCES auth_users(id),
  target_player_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);

-- RLS for admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_view_audit_log" ON admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

## Security Considerations

### Permission Checks (3 Layers)
1. **Database (RLS):** Enforces at data layer
2. **API (Middleware):** Enforces at endpoint layer
3. **UI (Components):** Hides unauthorized features

### Admin Actions
- All admin actions logged in audit log
- Cannot modify other admins (only sub-admins/users)
- Cannot delete own admin role
- Audit log immutable (insert-only)

### Rating Security
- Ratings linked to grader (rated_by field)
- Rating history tracked (created_at, updated_at)
- Cannot delete ratings (only update)
- RLS prevents unauthorized access

---

## Open Questions for User

1. **Sub-Admin Creation:**
   - Should sub-admin creation automatically grant grading permission?
   - Or should it be a separate step?
   - **Proposed:** Separate (admin controls independently)

2. **Rating History:**
   - Should we keep rating history (versioning)?
   - Or just current rating (overwrite on update)?
   - **Proposed:** Current only for MVP, add history later

3. **Rating Scale:**
   - 1-10 scale acceptable?
   - Or prefer 1-5 stars?
   - **Proposed:** 1-10 for granularity

4. **Permission Names:**
   - `can_grade_players` clear enough?
   - Any other permissions needed now?
   - **Proposed:** Start with this one, add more as needed

---

## Success Criteria

- [ ] Admin can create/revoke sub-admins
- [ ] Admin can grant/revoke grading permission independently
- [ ] Users with permission can grade players
- [ ] Users without permission cannot grade (403)
- [ ] Ratings stored in database
- [ ] Overall rating calculated correctly
- [ ] UI shows/hides features based on permissions
- [ ] All actions logged in audit log
- [ ] RLS enforces permissions at DB level
- [ ] API enforces permissions at endpoint level
- [ ] UI respects permissions (no hidden API calls)

---

## Status

**Design:** ✅ Complete  
**Approval:** ⏳ Awaiting User Approval  
**Implementation:** 🔒 Blocked until design approved

**Next Step:** User reviews and approves design, then implementation begins.
