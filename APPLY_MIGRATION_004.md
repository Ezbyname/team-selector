# Apply Migration 004: Unique Active Membership Constraint

**CRITICAL:** This migration MUST be applied before concurrent join tests will pass.

---

## What This Migration Does

**Problem:** The existing `UNIQUE(group_id, user_id)` constraint prevents users from rejoining after leaving (resigned status). It also doesn't prevent race conditions in concurrent joins for the same user.

**Solution:** Replace table-level UNIQUE constraint with a **partial unique index** that only enforces uniqueness for `status='active'` memberships.

**Result:**
- ✅ User can only have ONE active membership per group (enforced at DB level)
- ✅ Concurrent joins handled safely (DB rejects duplicate, API returns idempotent success)
- ✅ User can rejoin after leaving (multiple inactive memberships allowed)
- ✅ Audit trail preserved (history of resigned/removed memberships)

---

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the entire contents of `supabase/migrations/004_unique_active_membership.sql`
5. Click **Run**
6. Verify success message appears

### Option 2: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up
```

---

## Migration SQL

```sql
-- Drop the existing UNIQUE constraint
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_user_id_key;

-- Add partial unique index for active memberships only
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_membership_per_user_group
ON group_members(group_id, user_id) WHERE status = 'active';
```

---

## Verification

After applying, verify the constraint exists:

```sql
-- Check that old constraint is gone
SELECT conname
FROM pg_constraint
WHERE conname = 'group_members_group_id_user_id_key';
-- Should return 0 rows

-- Check that new index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'group_members'
  AND indexname = 'unique_active_membership_per_user_group';
-- Should return 1 row with the partial index definition
```

---

## Impact on Existing Data

**Safe to apply:** This migration is non-destructive.

- Existing active memberships are preserved
- If duplicate active memberships exist (shouldn't happen), migration will fail
  - In that case, clean up duplicates first, then retry

---

## Before Testing

**DO NOT run concurrent join tests until this migration is applied.**

The test will fail with 500 errors because:
1. Multiple concurrent inserts will violate the old UNIQUE constraint
2. Old constraint doesn't allow rejoining after leaving

After migration:
1. Concurrent inserts handled at DB level (one wins, others get constraint error)
2. API catches constraint error and returns idempotent success (200)
3. Users can rejoin after leaving

---

## Test Command

After applying migration:

```bash
npm run test:invite-codes-api
```

Expected: Test 8.2 (concurrent joins) should now pass ✅

---

Last Updated: 2026-04-24  
Migration File: `supabase/migrations/004_unique_active_membership.sql`  
Priority: **CRITICAL** (blocks production readiness)
