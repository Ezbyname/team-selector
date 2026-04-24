# Admin Levels & Database Structure

## User Roles Hierarchy

### Role Enum Definition
```sql
CREATE TYPE user_role AS ENUM ('admin', 'sub_admin', 'user');
```

---

## 1. Admin (Top Level)

**Database Value:** `'admin'`

### Capabilities:
- ✅ Create new teams/groups
- ✅ Delete any team/group they created
- ✅ Assign sub-admins to their teams
- ✅ Manage all players in their teams
- ✅ Generate teams for any session
- ✅ View all sessions they created
- ✅ Edit team configurations
- ✅ Remove sub-admins
- ✅ Can be player in OTHER teams

### Use Cases:
- **Team organizers** - People who regularly organize games
- **League managers** - Manage recurring leagues
- **Club administrators** - Run sports clubs

### Multi-Team Behavior:
- **Admin in Team A** - Full control (create, edit, delete, assign sub-admins)
- **Sub-Admin in Team B** - Limited control (manage players, create sessions)
- **Player in Team C** - Regular user (just plays)

**Example:** Sarah is admin of "Friday Basketball" but plays as a regular player in "Sunday Soccer"

---

## 2. Sub-Admin (Team Level)

**Database Value:** `'sub_admin'`

### Capabilities:
- ✅ Manage players within assigned team
- ✅ Create sessions for assigned team
- ✅ Generate teams for sessions
- ✅ View team statistics
- ✅ Manage player ratings
- ✅ Set player connections
- ❌ Cannot create new teams
- ❌ Cannot assign other sub-admins
- ❌ Cannot delete the team
- ❌ Cannot remove the admin

### Use Cases:
- **Assistant organizers** - Help main admin manage large teams
- **Session coordinators** - Handle specific game sessions
- **Co-captains** - Share team management duties

### Assignment:
- Assigned by **admin** of the team
- Permissions are **team-specific**
- Same user can be sub-admin in multiple teams

**Example:** Mike is sub-admin in "Basketball League" (manages players) and also sub-admin in "Volleyball Club" (creates sessions)

---

## 3. User (Player Level)

**Database Value:** `'user'`

### Capabilities:
- ✅ Join teams (if invited/accepted)
- ✅ View their own stats
- ✅ See session details they're in
- ✅ Mark availability for sessions
- ❌ Cannot create teams
- ❌ Cannot manage other players
- ❌ Cannot create sessions
- ❌ Cannot generate teams

### Use Cases:
- **Regular players** - Just want to play
- **Casual participants** - Occasional games
- **New members** - Recently joined

---

## Database Schema

### auth_users Table

```sql
CREATE TABLE auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,                          -- Actually stores displayName
  phone_normalized TEXT UNIQUE NOT NULL,        -- E.164 format: +972525502281
  password_hash TEXT NOT NULL,                  -- bcrypt cost 12
  role user_role NOT NULL DEFAULT 'user',       -- 'admin', 'sub_admin', or 'user'
  phone_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**⚠️ IMPORTANT:** The `phone` column actually stores the user's **display name**, not their phone number. The actual phone goes in `phone_normalized`.

This is a hack in the current implementation (see `api/auth/register.js:82`).

---

### groups Table (Teams)

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sport TEXT NOT NULL,              -- 'basketball' or 'soccer'
  created_by UUID NOT NULL,         -- References auth_users.id (must be admin)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (created_by) REFERENCES auth_users(id) ON DELETE CASCADE
);
```

**Owner Logic:**
- `created_by` = User who created the group
- Must have role `'admin'` to create
- Can only manage groups they created

---

### group_members Table (Team Membership & Sub-Admins)

```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'user',  -- Can be 'sub_admin' or 'user' here
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,

  UNIQUE(group_id, user_id)  -- User can only be in group once
);
```

**Role in group_members:**
- Defines **team-specific role**
- User's `auth_users.role` = Global role
- User's `group_members.role` = Role in THIS team
- **Logic:** If user has global `'admin'` role → full control over their own teams

---

## Role Assignment Logic

### Creating a Team (Group)
```javascript
// Only admins can create teams
if (user.role !== 'admin') {
  return res.status(403).json({ error: 'Only admins can create teams' });
}

await supabase.from('groups').insert({
  name: 'Friday Basketball',
  sport: 'basketball',
  created_by: user.id
});
```

### Assigning Sub-Admin
```javascript
// Check if requester is the team admin
const group = await supabase
  .from('groups')
  .select('created_by')
  .eq('id', groupId)
  .single();

if (group.created_by !== user.id) {
  return res.status(403).json({ error: 'Only team creator can assign sub-admins' });
}

// Assign sub-admin role
await supabase.from('group_members').upsert({
  group_id: groupId,
  user_id: targetUserId,
  role: 'sub_admin'
});
```

### Checking Permissions
```javascript
// Check if user can manage team
async function canManageTeam(userId, groupId) {
  const group = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single();

  // Creator (admin) has full control
  if (group.created_by === userId) {
    return { canManage: true, role: 'admin' };
  }

  // Check if user is sub-admin
  const membership = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (membership?.role === 'sub_admin') {
    return { canManage: true, role: 'sub_admin' };
  }

  return { canManage: false, role: 'user' };
}
```

---

## Permission Matrix

| Action | Admin (Creator) | Sub-Admin | User |
|--------|----------------|-----------|------|
| Create Team | ✅ | ❌ | ❌ |
| Delete Team | ✅ (own only) | ❌ | ❌ |
| Rename Team | ✅ (own only) | ❌ | ❌ |
| Add Players | ✅ | ✅ | ❌ |
| Remove Players | ✅ | ✅ | ❌ |
| Assign Sub-Admin | ✅ (own team only) | ❌ | ❌ |
| Remove Sub-Admin | ✅ (own team only) | ❌ | ❌ |
| Create Session | ✅ | ✅ | ❌ |
| Generate Teams | ✅ | ✅ | ❌ |
| Edit Player Ratings | ✅ | ✅ | ❌ |
| Set Connections | ✅ | ✅ | ❌ |
| View Team Stats | ✅ | ✅ | ✅ |
| Join Team | ✅ | ✅ | ✅ |

---

## Real-World Scenarios

### Scenario 1: Basketball League Organizer
**User:** Erez  
**Phone:** +972525502281  
**Global Role:** `admin`

**Teams Created:**
1. **"Friday Basketball League"**
   - Erez = Creator (admin)
   - Mike = Sub-Admin (handles RSVPs)
   - Sarah = Sub-Admin (manages ratings)
   - 15 other players = Users

2. **"Maccabi Youth Team"**
   - Erez = Creator (admin)
   - No sub-admins yet
   - 20 players = Users

**Teams Joined:**
3. **"Sunday Soccer Club"** (Created by David)
   - Erez = User (just plays)
   - David = Creator (admin)

**Result:** Erez has full control over his 2 basketball teams, but is a regular player in David's soccer team.

---

### Scenario 2: Sub-Admin Responsibilities
**User:** Mike  
**Global Role:** `user` (not admin)

**Teams:**
1. **"Friday Basketball League"** (Created by Erez)
   - Mike = Sub-Admin
   - Can: add/remove players, create sessions, generate teams
   - Cannot: delete team, assign other sub-admins

2. **"Wednesday Pickup Games"** (Created by Erez)
   - Mike = Sub-Admin
   - Same permissions in this team

**Result:** Mike helps manage 2 teams but can't create his own team or assign other sub-admins.

---

### Scenario 3: Upgrading User to Admin
**User:** Sarah  
**Current Global Role:** `user`  
**Wants to:** Create her own team

**Process:**
1. Sarah registers as `user` (default role)
2. Plays in several teams as regular player
3. Wants to start organizing her own league
4. **Super admin** (database admin) manually upgrades her:

```sql
UPDATE auth_users 
SET role = 'admin' 
WHERE phone_normalized = '+972501234567';
```

5. Sarah can now create teams and assign sub-admins

---

## Current Super Admin

**Name:** Erez (Admin)  
**Phone:** +972525502281  
**User ID:** `9ce3e60d-c196-4f3a-9609-a70c4e14fb9a`  
**Role:** `admin`

---

## Promoting Users to Admin

### Via Script (Recommended)
```bash
node check-and-promote-admin.js
```

### Via SQL (Direct)
```sql
-- Find user by phone
SELECT id, phone, phone_normalized, role 
FROM auth_users 
WHERE phone_normalized = '+972501234567';

-- Promote to admin
UPDATE auth_users 
SET role = 'admin' 
WHERE id = 'user-uuid-here';
```

### Via API Endpoint (Future)
**TODO:** Create `/api/admin/promote-user` endpoint  
**Auth:** Only callable by existing admins  
**Use Case:** Allow admins to promote trusted users

---

## Best Practices

### For Admins:
- ✅ Assign sub-admins for large teams (>20 players)
- ✅ Clearly communicate sub-admin responsibilities
- ✅ Remove sub-admin access when no longer needed
- ✅ Keep team names descriptive ("Friday 7PM Basketball" not "Team A")

### For Sub-Admins:
- ✅ Focus on assigned responsibilities (RSVPs, ratings, etc.)
- ✅ Communicate with admin about team changes
- ✅ Don't exceed your permissions
- ⚠️ Remember you can't assign other sub-admins

### For Users:
- ✅ Join teams via invitation
- ✅ Update availability for sessions
- ✅ View your stats and improvement
- 💡 To create your own team, request admin promotion

---

## API Endpoints by Role

### Admin Only
- `POST /api/groups/create` - Create new team
- `DELETE /api/groups/:id` - Delete team (own only)
- `POST /api/groups/:id/assign-subadmin` - Assign sub-admin
- `DELETE /api/groups/:id/subadmin/:userId` - Remove sub-admin

### Admin + Sub-Admin
- `POST /api/groups/:id/players` - Add players
- `DELETE /api/groups/:id/players/:playerId` - Remove players
- `POST /api/sessions/create` - Create session
- `POST /api/sessions/:id/generate-teams` - Generate teams
- `PUT /api/ratings/:playerId` - Update player ratings
- `POST /api/players/:id/connections` - Set player connections

### All Roles
- `GET /api/groups` - List teams user is in
- `GET /api/groups/:id` - View team details
- `GET /api/sessions/:id` - View session
- `PUT /api/players/:id/availability` - Mark availability
- `GET /api/players/me/stats` - View own stats

---

## Database Maintenance

### Check User Role
```sql
SELECT id, phone, phone_normalized, role, created_at
FROM auth_users
WHERE phone_normalized = '+972525502281';
```

### List All Admins
```sql
SELECT id, phone, phone_normalized, role, created_at
FROM auth_users
WHERE role = 'admin'
ORDER BY created_at;
```

### Find Teams Created by Admin
```sql
SELECT g.id, g.name, g.sport, g.created_at,
       u.phone as creator_name
FROM groups g
JOIN auth_users u ON g.created_by = u.id
WHERE u.phone_normalized = '+972525502281';
```

### List Sub-Admins in a Team
```sql
SELECT u.phone as name, 
       u.phone_normalized as phone,
       gm.role,
       gm.joined_at
FROM group_members gm
JOIN auth_users u ON gm.user_id = u.id
WHERE gm.group_id = 'team-uuid-here'
  AND gm.role = 'sub_admin';
```

---

## Future Enhancements

### Possible Additional Roles:
1. **`super_admin`** - Can manage ALL teams, not just their own
2. **`moderator`** - Can resolve disputes, ban users
3. **`viewer`** - Read-only access to team stats

### Enhanced Permissions:
- **Role-based UI** - Show/hide features based on role
- **Team-specific permissions** - Custom per-team permission sets
- **Delegation** - Sub-admins can delegate specific tasks
- **Audit logs** - Track who changed what

---

## Troubleshooting

### User can't create team
✅ Check their global role: `SELECT role FROM auth_users WHERE id = 'user-id'`  
✅ If role is `'user'`, promote to `'admin'`

### Sub-admin can't add players
✅ Check group membership: `SELECT * FROM group_members WHERE group_id = 'team-id' AND user_id = 'user-id'`  
✅ Verify role is `'sub_admin'` in group_members

### User appears as admin in one team but not another
✅ This is correct! Check `groups.created_by` and `group_members.role`  
✅ User is admin only for teams they created

### Can't find user by phone
✅ Remember: `phone` column has display name!  
✅ Search by: `phone_normalized` field  
✅ Format must be E.164: `+972525502281`

---

## Summary

- **3 Roles:** `admin`, `sub_admin`, `user`
- **Admin** = Can create teams and assign sub-admins
- **Sub-Admin** = Can manage players within assigned teams
- **User** = Regular player
- **Multi-Team:** Same person can have different roles in different teams
- **Database:** Role stored in `auth_users.role` (global) and `group_members.role` (per-team)
- **Current Admin:** Erez (+972525502281)

**Remember:** `auth_users.phone` stores display name, not phone number. Use `phone_normalized` for actual phone.
