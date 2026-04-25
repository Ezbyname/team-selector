-- Migration 004: Enforce unique active membership per user/group
-- Date: 2026-04-24
-- Purpose: Prevent race conditions in concurrent joins

-- Drop the existing UNIQUE constraint that prevents multiple memberships entirely
-- (This constraint prevents users from rejoining after leaving)
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_user_id_key;

-- Add partial unique index: only ONE active membership per user/group
-- This allows multiple historical memberships (resigned, removed) but only one active
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_membership_per_user_group
ON group_members(group_id, user_id) WHERE status = 'active';

-- Comments for documentation
COMMENT ON INDEX unique_active_membership_per_user_group IS
  'Ensures a user can only have ONE active membership per group. ' ||
  'Allows multiple historical memberships (resigned, removed) for audit trail. ' ||
  'Critical for preventing race conditions in concurrent join operations.';

-- This index provides:
-- 1. Concurrency safety: Concurrent joins will conflict at DB level, one wins
-- 2. Data integrity: No duplicate active memberships possible
-- 3. Audit trail: Multiple inactive memberships allowed (history preserved)
-- 4. Performance: Efficient lookups for active memberships
