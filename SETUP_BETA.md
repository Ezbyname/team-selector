# 🚀 Beta Release Setup Guide

**CRITICAL:** Complete ALL steps before inviting beta testers.

---

## ✅ Validation Status

Run this command to check your setup:

```bash
npm run validate:beta
```

**Required result:** All critical checks must pass.

---

## 🚨 STEP 1: Set Up Upstash Redis (15 minutes)

### Why Required
Rate limiting currently uses in-memory storage which resets on every serverless function restart. **Without Redis, invite code brute-forcing is possible.**

### Instructions

1. **Create Upstash Account**
   - Go to: https://upstash.com
   - Sign up (free tier is sufficient)

2. **Create Redis Database**
   - Click "Create Database"
   - Name: `team-selector-prod`
   - Region: Choose closest to your Vercel region (e.g., `us-east-1`)
   - Type: Regional (cheaper, sufficient for rate limiting)
   - Click "Create"

3. **Get Credentials**
   - After creation, you'll see database details
   - Copy **UPSTASH_REDIS_REST_URL** (looks like: `https://xxx.upstash.io`)
   - Copy **UPSTASH_REDIS_REST_TOKEN** (long string starting with `AX...`)

4. **Add to Local Environment**
   
   Edit `.env.local` and add:
   ```
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AX...your-token-here
   ```

5. **Add to Vercel**
   
   ```bash
   # Using Vercel CLI
   vercel env add UPSTASH_REDIS_REST_URL
   # Paste the URL when prompted
   # Select: Production, Preview, Development

   vercel env add UPSTASH_REDIS_REST_TOKEN
   # Paste the token when prompted
   # Select: Production, Preview, Development
   ```

   **OR** via Vercel Dashboard:
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables
   - Add both variables for all environments

6. **Verify**
   
   ```bash
   npm run validate:beta
   ```
   
   Should show:
   ```
   ✅ ENV: UPSTASH_REDIS_REST_URL configured
   ✅ ENV: UPSTASH_REDIS_REST_TOKEN configured
   ✅ REDIS: Connection successful, read/write works
   ```

---

## 🚨 STEP 2: Apply Database Migration 004 (5 minutes)

### Why Required
Without this migration, concurrent team joins can create duplicate memberships (race condition).

### Check Current State

1. Go to Supabase Dashboard → SQL Editor

2. Run this query:
   ```sql
   SELECT indexname
   FROM pg_indexes
   WHERE tablename = 'group_members'
   AND indexname = 'unique_active_membership_per_user_group';
   ```

3. **If result is empty** → Migration NOT applied (proceed to next step)
4. **If result shows 1 row** → Migration already applied (skip to Step 3)

### Apply Migration

1. Open `supabase/migrations/004_unique_active_membership.sql`

2. Copy the entire contents

3. Go to Supabase Dashboard → SQL Editor

4. Paste and run:
   ```sql
   -- Drop old constraint if exists
   ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_user_id_key;

   -- Add partial unique index
   CREATE UNIQUE INDEX IF NOT EXISTS unique_active_membership_per_user_group
   ON group_members(group_id, user_id) WHERE status = 'active';

   -- Add documentation
   COMMENT ON INDEX unique_active_membership_per_user_group IS
     'Ensures a user can only have ONE active membership per group. ' ||
     'Allows multiple historical memberships (resigned, removed) for audit trail. ' ||
     'Critical for preventing race conditions in concurrent join operations.';
   ```

5. **Verify** by re-running the check query (should return 1 row)

6. **Test locally:**
   ```bash
   npm run validate:beta
   ```
   
   Should show:
   ```
   ✅ DB: Migration 004 applied - unique active membership index exists
   ```

---

## ✅ STEP 3: Deploy to Production (10 minutes)

### Pre-Deployment Checklist

```bash
# 1. Install dependencies
npm install

# 2. Run validation
npm run validate:beta
# Must show: ✅ READY FOR BETA TESTING

# 3. Run tests
npm run test:balancing
# Must show: 100% pass rate
```

### Deploy

```bash
# Deploy to production
vercel --prod

# OR if not using CLI
# Push to main branch (if GitHub integration enabled)
git push origin main
```

### Post-Deployment

Wait 2-3 minutes for deployment to complete, then verify:

```bash
# Check deployment status
vercel ls

# View logs
vercel logs --follow
```

---

## 🧪 STEP 4: Smoke Tests (20 minutes)

**CRITICAL:** Test on your DEPLOYED app (not localhost).

### Test 1: Login Flow

1. Open your deployed app URL
2. Click "Login" or navigate to `/login.html`
3. Enter phone number
4. Complete OTP verification
5. Should reach dashboard without errors

**Expected:** ✅ Successful login, no console errors

---

### Test 2: Create Team

1. From dashboard, click "Create Team"
2. Enter team name: "Beta Test Team"
3. Select sport: Basketball
4. Click "Create"

**Expected:** 
- ✅ Team created successfully
- ✅ Appears in "My Teams"
- ✅ Shows "Manage Invites" button (you're admin)

---

### Test 3: Generate Invite Link

1. Click "Manage Invites" on your test team
2. Modal opens showing invite code
3. Click "Copy Link" or "Share"

**Expected:**
- ✅ Invite link copied (e.g., `https://your-app.vercel.app/join/BETA-XY23`)
- ✅ No errors in console

---

### Test 4: Join Team (Logged Out User)

1. **Open incognito/private window**
2. Paste the invite link from Test 3
3. Should redirect to `/login.html?redirect=join`
4. Complete login (use different phone number)
5. After login, should auto-redirect back to join flow
6. Click "Join Team"

**Expected:**
- ✅ Seamless login → auto-return to join
- ✅ "Welcome to Beta Test Team!" success message
- ✅ No manual re-entry of invite code

---

### Test 5: Already Member (Idempotent)

1. **In same incognito window** (still logged in from Test 4)
2. Paste the invite link again
3. Click join

**Expected:**
- ✅ Shows: "You are already a member of this team"
- ✅ NOT an error state
- ✅ "Open Team" button works

---

### Test 6: Rate Limiting (CRITICAL)

1. Open DevTools → Console
2. Open `/join/INVALID-CODE` (use fake code)
3. In console, run this script:

```javascript
const token = localStorage.getItem('token');
for (let i = 0; i < 10; i++) {
  fetch('/api/groups/join-by-code', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code: 'INVALID-' + i })
  }).then(r => r.json()).then(d => console.log(`Attempt ${i+1}:`, d));
}
```

**Expected:**
- ✅ First 5 attempts: 404 "invalid code"
- ✅ 6th+ attempts: **429 "Too many attempts"**
- ✅ If ALL attempts return 404 → **REDIS NOT WORKING** (do not proceed)

---

### Test 7: Generate Teams

1. As admin, add 6+ players to your test team
2. Create a session
3. Select all players
4. Click "Generate Teams"

**Expected:**
- ✅ Teams generated (e.g., 3v3)
- ✅ Teams are balanced
- ✅ No crashes or errors

---

### Test 8: Console Errors Check

**Open DevTools → Console on every page:**

- `/` (home)
- `/login.html`
- `/my-teams.html`
- `/join/{code}`
- `/session-setup.html`

**Expected:**
- ✅ **ZERO errors**
- ⚠️  Warnings are okay
- ❌ Any `Uncaught` errors → FIX IMMEDIATELY

---

### Test 9: Mobile Check

**Use real mobile device or Chrome DevTools mobile emulation:**

1. Open deployed app on phone
2. Navigate through:
   - Login
   - My Teams
   - Join via invite link

**Expected:**
- ✅ No horizontal scroll
- ✅ All buttons clickable (not too small)
- ✅ Text readable
- ✅ Layout stable (no jumping)

---

## 📋 Final Checklist

Before inviting ANY beta testers:

### Environment
- [ ] Upstash Redis configured (local + Vercel)
- [ ] Migration 004 applied
- [ ] All environment variables set in Vercel
- [ ] `npm install` completed
- [ ] `npm run validate:beta` shows ✅ READY

### Deployment
- [ ] Deployed to production (`vercel --prod`)
- [ ] Deployment successful (no errors in logs)
- [ ] App accessible via public URL

### Smoke Tests
- [ ] Test 1: Login works ✅
- [ ] Test 2: Create team works ✅
- [ ] Test 3: Invite link generated ✅
- [ ] Test 4: Join flow (logged out) works ✅
- [ ] Test 5: Already member (idempotent) works ✅
- [ ] Test 6: Rate limiting works ✅ (429 on 6th attempt)
- [ ] Test 7: Generate teams works ✅
- [ ] Test 8: Zero console errors ✅
- [ ] Test 9: Mobile layout works ✅

### Documentation
- [ ] Beta tester instructions ready
- [ ] Bug report channel created (WhatsApp/Telegram)
- [ ] Known issues documented

---

## 🎯 Beta Testing Plan

### Week 1: Micro Beta (3-5 people)
- Invite close friends/patient testers
- Daily check-ins
- Fix critical bugs within 24 hours

### Success Criteria
- [ ] All 5 testers can login
- [ ] All 5 testers can join a team
- [ ] Zero crashes
- [ ] Zero console errors reported
- [ ] Core flow (invite → join → generate teams) works for 100%

### Failure Criteria (Pause Beta)
- ❌ >50% cannot complete login
- ❌ >30% cannot join via invite link
- ❌ Any data loss or corruption
- ❌ Rate limiting not working (429 never appears)
- ❌ Duplicate memberships created

---

## 🚨 Emergency Rollback

If critical issues found:

```bash
# Revert to previous deployment
vercel rollback

# OR redeploy specific version
vercel deploy --prod --force
```

---

## 📞 Support During Beta

**Monitor:**
- Vercel logs: `vercel logs --follow`
- Supabase logs: Dashboard → Logs
- Redis usage: Upstash dashboard

**Communication:**
- Respond to bug reports within 2 hours (weekdays)
- Critical bugs fixed within 24 hours
- Non-critical bugs batched for weekly release

---

## ✅ Definition of Success

Beta is successful if:
- [ ] 80%+ testers complete their first session within 7 days
- [ ] Zero data corruption issues
- [ ] Zero "app is broken" complaints
- [ ] Average rating ≥3.5/5 on usability
- [ ] At least 1 team creates 3+ sessions

---

**Last Updated:** 2026-04-25  
**Status:** Ready for Steps 1-2, then deployment  
**Estimated Time to Beta Ready:** 30-40 minutes
