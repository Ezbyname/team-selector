-- FIX DATABASE CONSTRAINT
-- Run this in Supabase SQL Editor to fix the constraint issue

-- Step 1: Drop the incorrect constraint
ALTER TABLE group_invites DROP CONSTRAINT IF EXISTS unique_active_code_per_group;

-- Step 2: Create the correct partial unique index
-- This allows multiple inactive codes per group, but only ONE active code
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_code_per_group
ON group_invites(group_id)
WHERE is_active = true;

-- Verify the fix
SELECT
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'group_invites'::regclass;

-- Should show the index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'group_invites'
AND indexname = 'unique_active_code_per_group';
