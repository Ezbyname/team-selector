# 🔴 BLOCKER RESOLUTION CHECKLIST

**Date:** 2026-04-25  
**Goal:** Fix 2 critical blockers, verify production safety

---

## ✅ STATUS: Code Ready, Configuration Required

All code changes are complete. You only need to:
1. Set up infrastructure (Upstash Redis)
2. Apply database migration
3. Verify with tests

**NO CODE CHANGES NEEDED.**

---

## 🔴 BLOCKER #1: Upstash Redis (Rate Limiting)

### Current Code Status: ✅ READY

**File:** `lib/rate-limit.js`

**Implementation:**
- ✅ Redis client configured
- ✅ Uses `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- ✅ Async rate limiting
- ⚠️  Has fallback to in-memory (will warn in logs)

**Fallback Behavior:**
- If Redis credentials missing: Falls back to in-memory Map
- Logs warning: "Redis not configured, falling back to in-memory (NOT production-safe)"
- This is intentional to prevent app from crashing, but rate limiting won't work

---

### YOUR ACTION REQUIRED

#### Step 1: Create Upstash Redis (15 minutes)

1. **Sign up:**
   - Go to: https://upstash.com
   - Create free account

2. **Create Database:**
   - Click "Create Database"
   - Name: `team-selector-prod`
   - Type: Regional
   - Region: `us-east-1` (or closest to your Vercel region)
   - Click "Create"

3. **Get Credentials:**
   - After creation, you'll see database dashboard
   - Look for "REST API" section
   - Copy these TWO values:
     ```
     UPSTASH_REDIS_REST_URL=https://...upstash.io
     UPSTASH_REDIS_REST_TOKEN=AX...
     ```

#### Step 2: Add to Local Environment

Edit `.env.local`:

```bash
# Add these two lines:
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXyour_token_here
```

#### Step 3: Add to Vercel (Production)

**Option A: Using Vercel CLI (Recommended)**

```bash
vercel env add UPSTASH_REDIS_REST_URL production
# Paste the URL when prompted

vercel env add UPSTASH_REDIS_REST_TOKEN production
# Paste the token when prompted
```

**Option B: Using Vercel Dashboard**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: Settings → Environment Variables
4. Add both variables:
   - `UPSTASH_REDIS_REST_URL` → (paste URL)
   - `UPSTASH_REDIS_REST_TOKEN` → (paste token)
5. Select environment: **Production** ✓

#### Step 4: Verify Locally

```bash
npm run validate:beta
```

**Expected output:**
```
✅ ENV: UPSTASH_REDIS_REST_URL configured
✅ ENV: UPSTASH_REDIS_REST_TOKEN configured
✅ REDIS: Connection successful, read/write works
```

**If you see:**
```
❌ REDIS: Redis credentials not configured
```
→ Environment variables not loaded. Check `.env.local` file.

---

### VERIFICATION TEST (MANDATORY)

After deploying to Vercel, test on your LIVE deployed app:

#### Test Script

Open DevTools Console on your deployed app, run:

```javascript
// Get your auth token
const token = localStorage.getItem('token');

// Rapid-fire 10 join attempts with invalid code
for (let i = 0; i < 10; i++) {
  fetch('/api/groups/join-by-code', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code: 'TESTLIMIT-' + i })
  })
  .then(r => r.json())
  .then(d => console.log(`Attempt ${i+1}: ${d.success ? 'OK' : d.error}`));
}
```

**Expected Results:**

```
Attempt 1: This invite code is invalid
Attempt 2: This invite code is invalid
Attempt 3: This invite code is invalid
Attempt 4: This invite code is invalid
Attempt 5: This invite code is invalid
Attempt 6: Too many attempts. Please try again later. ✅
Attempt 7: Too many attempts. Please try again later. ✅
Attempt 8: Too many attempts. Please try again later. ✅
Attempt 9: Too many attempts. Please try again later. ✅
Attempt 10: Too many attempts. Please try again later. ✅
```

**If all 10 attempts show "invalid code":**
❌ Redis is NOT working
❌ Check Vercel logs for "Redis not configured" warning
❌ Verify environment variables are set in Vercel dashboard

**This test is PROOF that Redis is working. Do not skip it.**

---

## 🔴 BLOCKER #2: Migration 004 (Concurrency Safety)

### Current Migration Status: ✅ FILE READY

**File:** `supabase/migrations/004_unique_active_membership.sql`

The migration file exists and is correct. You just need to apply it.

---

### YOUR ACTION REQUIRED

#### Step 1: Check Current State

Go to Supabase Dashboard → SQL Editor

Run this query:

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'group_members'
AND indexname = 'unique_active_membership_per_user_group';
```

**If result is empty:** Migration NOT applied → proceed to Step 2  
**If result shows 1 row:** Migration already applied → skip to verification

---

#### Step 2: Apply Migration

In Supabase SQL Editor, run:

```sql
-- Drop old constraint that prevents rejoining
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_group_id_user_id_key;

-- Add partial unique index (only for active memberships)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_membership_per_user_group
ON group_members(group_id, user_id) 
WHERE status = 'active';

-- Add documentation
COMMENT ON INDEX unique_active_membership_per_user_group IS
  'Ensures a user can only have ONE active membership per group. ' ||
  'Allows multiple historical memberships (resigned, removed) for audit trail. ' ||
  'Critical for preventing race conditions in concurrent join operations.';
```

**Expected result:**
```
SUCCESS
No rows returned
```

---

#### Step 3: Verify Index Exists

Re-run the check query:

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'group_members'
AND indexname = 'unique_active_membership_per_user_group';
```

**Must return 1 row:**
```
indexname
unique_active_membership_per_user_group
```

---

#### Step 4: Verify Locally

```bash
npm run validate:beta
```

**Expected output:**
```
✅ DB: Migration 004 applied - unique active membership index exists
```

---

### VERIFICATION TEST (MANDATORY)

Test race condition protection:

#### Manual Concurrency Test

1. **Login as user A**
2. **Get an invite link for a team**
3. **Open TWO browser tabs** with the invite link
4. **Click "Join Team" rapidly in both tabs**

**Expected behavior:**
- ✅ One tab: "Joined successfully"
- ✅ Other tab: "You are already a member of this team"
- ✅ NO crashes
- ✅ NO 500 errors
- ✅ NO duplicate memberships in database

**Check database:**

```sql
SELECT user_id, group_id, status, COUNT(*)
FROM group_members
GROUP BY user_id, group_id, status
HAVING COUNT(*) > 1 AND status = 'active';
```

**Must return 0 rows.** If any rows returned → duplicate memberships exist (FAILURE).

---

## 🧪 FINAL SYSTEM VALIDATION

After completing both blockers:

```bash
npm run validate:beta
```

**Required output:**

```
╔════════════════════════════════════════╗
║  VALIDATION SUMMARY                    ║
╚════════════════════════════════════════╝

✅ Passed: 30
❌ Failed: 0
⚠️  Warnings: 0

╔════════════════════════════════════════╗
║  BETA READINESS DECISION               ║
╚════════════════════════════════════════╝

✅ READY FOR BETA TESTING

All critical validations passed.
```

**If NOT "READY FOR BETA TESTING":**
- Read the failed checks
- Fix each one
- Re-run validation

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Deploying

- [ ] Upstash Redis credentials added to Vercel
- [ ] Migration 004 applied in Supabase
- [ ] `npm run validate:beta` passes locally
- [ ] All environment variables set in Vercel dashboard

### Deploy

```bash
# Ensure dependencies are installed
npm install

# Deploy to production
vercel --prod
```

### After Deploying

Wait 2-3 minutes for deployment to complete.

---

## 🔍 SMOKE TESTS (MANDATORY)

Test on your **DEPLOYED APP** (not localhost):

### Test 1: Rate Limiting ⚠️ CRITICAL

**Run the rate limit test script above.**

**MUST see 429 on 6th+ attempt.**

If all attempts return 404:
- ❌ Redis NOT working
- Check Vercel logs: `vercel logs --follow`
- Look for: "Redis not configured" warning

---

### Test 2: Console Errors

Open DevTools → Console on these pages:
- `/login.html`
- `/my-teams.html`
- `/join/{some-code}`
- `/session-setup.html`

**MUST show ZERO errors.**

Any `Uncaught` errors → FIX IMMEDIATELY

---

### Test 3: Invite Flow End-to-End

1. **As admin:** Create team → Generate invite link
2. **Copy link**
3. **Open incognito window**
4. **Paste link** (logged out)
5. **Login**

**Expected:**
- ✅ After login, auto-redirects back to join flow
- ✅ No manual re-entry of invite code
- ✅ Join succeeds

---

### Test 4: Already Member (Idempotent)

1. **Join a team** (logged in)
2. **Open same invite link again**
3. **Click join**

**Expected:**
- ✅ Shows: "You are already a member of this team"
- ✅ NOT an error state
- ✅ "Open Team" button works

---

### Test 5: Mobile Layout

**Open on real mobile device:**

**Check:**
- ✅ No horizontal scroll
- ✅ All buttons are clickable (not too small)
- ✅ Text is readable
- ✅ No elements outside containers

---

### Test 6: Concurrency Safety

**Follow manual concurrency test above** (2 tabs, rapid join).

**MUST NOT create duplicate memberships.**

---

## ✅ DEFINITION OF DONE

You are READY FOR BETA when ALL of these are TRUE:

### Infrastructure
- [ ] Upstash Redis configured (credentials in Vercel)
- [ ] Migration 004 applied (verified in Supabase)
- [ ] Deployed to production (`vercel --prod`)

### Validation
- [ ] `npm run validate:beta` → "✅ READY FOR BETA TESTING"
- [ ] Rate limit test → 429 on 6th attempt ⚠️ CRITICAL
- [ ] Console errors → ZERO on all pages
- [ ] Concurrency test → no duplicates created

### Functionality
- [ ] Login works
- [ ] Create team works
- [ ] Invite link generated
- [ ] Join flow (logged out) works
- [ ] Already member handled correctly
- [ ] Mobile layout not broken

---

## 🚨 BLOCKERS SUMMARY

| Blocker | Status | Your Action | Time |
|---------|--------|-------------|------|
| Redis | ⏳ Pending | Create Upstash account + add env vars | 15 min |
| Migration 004 | ⏳ Pending | Run SQL in Supabase | 5 min |
| **Total** | **Blocked** | **2 actions** | **20 min** |

**After these 20 minutes + deployment + smoke tests:**

→ ✅ READY FOR BETA

---

## 🔄 IF ISSUES FOUND

### Redis Test Fails (No 429)

**Check Vercel logs:**
```bash
vercel logs --follow
```

**Look for:**
```
Redis not configured, falling back to in-memory
```

**If you see this:**
- Environment variables NOT loaded in Vercel
- Go to Vercel Dashboard → Settings → Environment Variables
- Verify both Redis variables exist for Production
- Redeploy: `vercel --prod`

---

### Migration Check Fails

**If index doesn't exist:**
- SQL may not have run successfully
- Check Supabase logs for errors
- Try running migration again
- Check for typos in SQL

---

### Duplicate Memberships Created

**If concurrency test creates duplicates:**
- Migration not properly applied
- Re-run the check query
- If index missing, re-apply migration
- Clear duplicate data:
  ```sql
  -- CAREFUL: This deletes duplicate memberships
  DELETE FROM group_members
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM group_members
    WHERE status = 'active'
    GROUP BY group_id, user_id
  );
  ```

---

## 📞 QUICK REFERENCE

```bash
# Validate everything
npm run validate:beta

# Deploy
vercel --prod

# Watch logs (during rate limit test)
vercel logs --follow

# Rollback if critical issue
vercel rollback
```

---

## ✅ AFTER BLOCKERS RESOLVED

Only AFTER all above verifications pass:

→ Proceed to: Multi-Team Balancing implementation  
→ Documentation: `MULTI_TEAM_BALANCING_PLAN.md`

**DO NOT start that until:**
- [ ] Redis returns 429 correctly
- [ ] Migration verified
- [ ] All smoke tests pass
- [ ] `validate:beta` shows READY

---

**Current Status:** Code ready, infrastructure setup required  
**Time to Beta Ready:** ~45 minutes (setup + deploy + tests)  
**Next Step:** Create Upstash Redis account
