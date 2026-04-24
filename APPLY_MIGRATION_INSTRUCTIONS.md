# Apply Invite Codes Migration

The `group_invites` table migration needs to be applied to your Supabase database before the tests can run.

## Steps to Apply Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/_/sql/new
   - Or navigate to your project → SQL Editor → New query

2. **Copy Migration SQL:**
   - Open: `supabase/migrations/003_add_team_invites.sql`
   - Copy the entire contents

3. **Run Migration:**
   - Paste the SQL into the editor
   - Click "Run" or press Ctrl+Enter
   - Verify: "Success. No rows returned"

4. **Verify Tables Created:**
   ```sql
   SELECT * FROM group_invites LIMIT 1;
   ```
   Should return: "Success. 0 rows" (table exists, no data yet)

### Option 2: Command Line (if psql configured)

```bash
psql $SUPABASE_DB_URL < supabase/migrations/003_add_team_invites.sql
```

## What the Migration Creates

### Table: `group_invites`
- Stores invite codes for teams
- Fields: id, group_id, code, created_by, is_active, expires_at
- Unique constraint: code must be unique
- One active code per group at a time

### Indexes:
- Fast lookup by code (most common query)
- Fast lookup by group_id

### Constraints:
- Cascading delete: if group deleted, invites deleted
- Unique active code per group

## After Migration Applied

Run the test suite:

```bash
npm run test:invite-codes
```

Expected output:
- ✅ All 35+ tests pass
- ✅ Test summary shows 0 failures
- ✅ Pass rate: 100%

## Troubleshooting

### Error: "Table already exists"
- Skip to verification step
- Migration may have been partially applied

### Error: "Permission denied"
- Ensure using SUPABASE_SERVICE_KEY (not anon key)
- Check `.env.local` has correct service role key

### Error: "Foreign key violation"
- Ensure `groups` table exists
- Check previous migrations applied successfully

### Verify Migration Status

Run this check:

```bash
node --env-file=.env.local check-table.js
```

Expected output:
```
group_invites table exists: true
groups table exists: true
```

If false, migration not applied yet.
