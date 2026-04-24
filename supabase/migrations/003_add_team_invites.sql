-- Add team invite codes feature
-- Allows team admins to generate invite codes for users to join teams

-- Create group_invites table
CREATE TABLE IF NOT EXISTS group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- NULL = no expiration

  -- Indexes for fast lookups
  CONSTRAINT unique_active_code_per_group UNIQUE (group_id, is_active)
);

-- Index for code lookups (most common query)
CREATE INDEX idx_group_invites_code ON group_invites(code) WHERE is_active = true;

-- Index for group lookups
CREATE INDEX idx_group_invites_group_id ON group_invites(group_id);

-- Ensure group_members table has proper structure
-- (Should already exist, but add if missing)
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',  -- active, pending, removed
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- User can only be in team once
  UNIQUE(group_id, user_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Index for group lookups
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- Comments for documentation
COMMENT ON TABLE group_invites IS 'Team invite codes for joining teams';
COMMENT ON COLUMN group_invites.code IS 'Unique invite code (e.g., BASKETBALL-A4B2)';
COMMENT ON COLUMN group_invites.is_active IS 'Whether the code is currently valid';
COMMENT ON COLUMN group_invites.expires_at IS 'When the code expires (NULL = never)';

COMMENT ON TABLE group_members IS 'Team membership and roles';
COMMENT ON COLUMN group_members.role IS 'User role in this team: admin, sub_admin, or user (member)';
COMMENT ON COLUMN group_members.status IS 'Membership status: active, pending, or removed';
