# User Requests - Implementation Plan

**Date:** 2026-04-22  
**Status:** Pending Implementation

---

## Request 1: Set Admin Phone Number ✅

**Request:** "add to the DB that my phone number is the Admin: 0525502281"

### Implementation

**SQL to Execute in Supabase:**

```sql
-- Set phone 0525502281 as admin
UPDATE auth_users
SET role = 'admin'
WHERE phone_normalized = '+972525502281';

-- Verify the change
SELECT id, phone, phone_normalized, display_name, role
FROM auth_users
WHERE phone_normalized = '+972525502281';
```

**Steps:**
1. User must first register/login with phone 052-550-2281
2. Run SQL in Supabase SQL Editor
3. Verify role is now 'admin'

**Note:** The phone will be normalized to E.164 format: `+972525502281`

---

## Request 2: Sub-Admin Role with Player Grading ⏳

**Request:** "from the app - i could create or revoke a sub-admin that can grade the players with the grades if he got it"

### Feature Scope

**Roles:**
- `admin` - Full access (user 052-550-2281)
- `sub-admin` - Can grade players
- `user` - Regular user

**Admin Capabilities:**
1. Create sub-admin (promote user to sub-admin)
2. Revoke sub-admin (demote to user)
3. Grade players
4. Manage system

**Sub-Admin Capabilities:**
1. View players
2. Grade players (assign skill ratings)
3. Cannot manage other admins
4. Cannot create/revoke sub-admins

**Regular User Capabilities:**
1. Use team selector
2. Cannot grade players

### Database Schema Changes Needed

```sql
-- Add roles table
CREATE TABLE IF NOT EXISTS roles (
  role_name TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (role_name, description) VALUES
  ('admin', 'Full system access'),
  ('sub_admin', 'Can grade players'),
  ('user', 'Regular user');

-- Add player ratings table
CREATE TABLE IF NOT EXISTS player_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_name TEXT NOT NULL,
  sport TEXT NOT NULL, -- 'basketball' or 'soccer'
  position TEXT, -- Position in that sport
  skill_rating INTEGER CHECK (skill_rating >= 1 AND skill_rating <= 10),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 10),
  teamwork_rating INTEGER CHECK (teamwork_rating >= 1 AND teamwork_rating <= 10),
  overall_rating DECIMAL(3,1) GENERATED ALWAYS AS (
    (skill_rating + speed_rating + teamwork_rating) / 3.0
  ) STORED,
  rated_by UUID REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_name, sport)
);

-- Add admin actions log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth_users(id),
  action_type TEXT NOT NULL, -- 'create_sub_admin', 'revoke_sub_admin', 'rate_player'
  target_user_id UUID REFERENCES auth_users(id),
  target_player_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

-- Admins and sub-admins can view all ratings
CREATE POLICY "admin_view_ratings" ON player_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'sub_admin')
    )
  );

-- Admins and sub-admins can insert/update ratings
CREATE POLICY "admin_manage_ratings" ON player_ratings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'sub_admin')
    )
  );
```

### API Endpoints Needed

```javascript
// Admin Management
POST /api/admin/create-sub-admin
  Body: { userId: string }
  Auth: Admin only
  Action: Set user role to 'sub_admin'

POST /api/admin/revoke-sub-admin
  Body: { userId: string }
  Auth: Admin only
  Action: Set user role to 'user'

GET /api/admin/users
  Query: ?role=sub_admin
  Auth: Admin only
  Response: List of users

// Player Ratings
POST /api/ratings/grade-player
  Body: {
    playerName: string,
    sport: 'basketball' | 'soccer',
    position?: string,
    skillRating: 1-10,
    speedRating: 1-10,
    teamworkRating: 1-10
  }
  Auth: Admin or Sub-Admin
  Action: Create/update player rating

GET /api/ratings/players
  Query: ?sport=basketball
  Auth: Admin or Sub-Admin
  Response: List of rated players

GET /api/ratings/player/:name
  Param: name=John+Doe
  Query: ?sport=basketball
  Auth: Admin or Sub-Admin
  Response: Player rating details
```

### UI Components Needed

**Admin Panel:**
- User management screen
- List of users with roles
- Promote to sub-admin button
- Revoke sub-admin button

**Player Grading Screen:**
- Player search/select
- Sport selection
- Position selection
- Rating sliders (Skill, Speed, Teamwork)
- Overall rating display (calculated)
- Save rating button

**Integration:**
- Add "Admin" menu item in header (admin only)
- Add "Grade Players" menu item (admin + sub-admin)
- Check role on app load
- Show/hide features based on role

### Implementation Priority

**Phase 1 (Essential):**
1. Database schema migration
2. Admin role verification for existing user
3. Create-sub-admin endpoint
4. Revoke-sub-admin endpoint
5. Grade-player endpoint

**Phase 2 (UI):**
6. Admin panel UI
7. Player grading UI
8. User list UI
9. Role-based menu items

**Phase 3 (Polish):**
10. Admin action logging
11. Rating history
12. Analytics/reports

---

## Implementation Status

| Task | Status |
|------|--------|
| Set admin phone (SQL) | ⏳ Awaiting user execution |
| Database schema for ratings | 📝 Designed, not deployed |
| API endpoints for admin | 📝 Designed, not implemented |
| API endpoints for ratings | 📝 Designed, not implemented |
| Admin panel UI | 📝 Designed, not implemented |
| Player grading UI | 📝 Designed, not implemented |

---

## Next Steps

### Immediate (User Action Required)
1. Register/login with phone 052-550-2281
2. Run SQL in Supabase to set role='admin'
3. Verify admin role in database

### For Implementation
1. Create database migration script
2. Deploy schema to Supabase
3. Implement API endpoints
4. Add role checking middleware
5. Create admin UI components
6. Test end-to-end

---

## Notes

- Admin features should be separate from main team selector flow
- Rating system can be used to auto-balance teams (future feature)
- Consider adding rating decay over time (players improve/decline)
- Consider adding rating confidence (based on number of games played)
