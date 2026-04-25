# 🚀 Deploy for Users - Critical Steps

**Date:** 2026-04-25  
**Status:** ✅ Code committed and pushed  
**Next:** Infrastructure setup + deployment

---

## 🚨 CRITICAL: Do These Steps BEFORE Users Can Test

**Users CANNOT test until you complete ALL steps below.**

The app will NOT work without:
1. Upstash Redis configured
2. Migration 004 applied
3. Deployed to Vercel

---

## ⚡ STEP 1: Upstash Redis Setup (15 minutes)

### Why Required
Without Redis, rate limiting **will not work**. The app will deny all invite-code join attempts.

### Actions

1. **Go to:** https://upstash.com
2. **Sign up** (free tier is fine)
3. **Create Database:**
   - Click "Create Database"
   - Name: `team-selector-prod`
   - Type: **Regional**
   - Region: `us-east-1` (or closest to you)
   - Click "Create"

4. **Copy Credentials:**
   After creation, you'll see:
   ```
   UPSTASH_REDIS_REST_URL: https://xxx-xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN: AXxxx...
   ```
   **Copy both values.**

5. **Add to Vercel:**
   
   **Option A: Vercel CLI**
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL
   # Paste URL, select: Production
   
   vercel env add UPSTASH_REDIS_REST_TOKEN
   # Paste token, select: Production
   ```

   **Option B: Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables
   - Add both variables for **Production**

---

## ⚡ STEP 2: Apply Migration 004 (5 minutes)

### Why Required
Without this migration, duplicate memberships can be created (data corruption).

### Actions

1. **Go to:** Supabase Dashboard → SQL Editor
2. **Run this SQL:**

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

3. **Verify it worked:**

```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'group_members' 
AND indexname = 'unique_active_membership_per_user_group';
```

**Must return 1 row.** If empty, migration failed.

---

## ⚡ STEP 3: Deploy to Vercel (5 minutes)

### Actions

```bash
# Ensure dependencies installed
npm install

# Deploy to production
vercel --prod
```

**Wait 2-3 minutes** for deployment to complete.

---

## 🧪 STEP 4: CRITICAL VERIFICATION (10 minutes)

**Test on your DEPLOYED APP** (not localhost).

### Test 1: Rate Limiting (MOST CRITICAL)

1. **Open deployed app** in browser
2. **Login** as any user
3. **Open DevTools → Console**
4. **Run this script:**

```javascript
const token = localStorage.getItem('token');
for (let i = 0; i < 10; i++) {
  fetch('/api/groups/join-by-code', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code: 'TEST-' + i })
  }).then(r => r.json()).then(d => console.log(`${i+1}: ${d.error || 'OK'}`));
}
```

**EXPECTED:**
```
1: This invite code is invalid
2: This invite code is invalid
3: This invite code is invalid
4: This invite code is invalid
5: This invite code is invalid
6: Too many attempts. Please try again later. ← MUST SEE THIS
7: Too many attempts. Please try again later.
8: Too many attempts. Please try again later.
9: Too many attempts. Please try again later.
10: Too many attempts. Please try again later.
```

**❌ IF ALL 10 SHOW "invalid code":**
- Redis is NOT working
- Check Vercel logs: `vercel logs --follow`
- Look for: "CRITICAL: REDIS NOT CONFIGURED IN PRODUCTION"
- Verify env vars are set in Vercel dashboard
- Redeploy after fixing

**DO NOT PROCEED if rate limiting test fails.**

---

### Test 2: Console Errors

Check DevTools → Console on:
- `/login.html`
- `/my-teams.html`
- `/join/TEST-CODE`

**MUST have ZERO errors.**

---

### Test 3: Create & Join Team

1. **Login as admin**
2. **Create team**
3. **Click "Manage Invites"**
4. **Copy invite link**
5. **Open incognito window**
6. **Paste link**
7. **Login as different user**
8. **Should auto-join after login**

**Expected:** No crashes, join succeeds.

---

### Test 4: Mobile Check

**Open on real phone:**
- No horizontal scroll
- Buttons are clickable
- Text readable

---

## ✅ Ready for Users When

- [ ] Rate limit test returns 429 ✅ **CRITICAL**
- [ ] Console shows zero errors
- [ ] Create + join flow works
- [ ] Mobile layout not broken
- [ ] Vercel logs show no critical errors

---

## 📋 Final Checklist

```bash
# 1. Verify everything locally first
npm run validate:beta
# Must show: ✅ READY FOR BETA TESTING

# 2. Ensure pushed to GitHub
git log -1
# Should show: "Pre-beta critical fixes and validation"

# 3. Deploy
vercel --prod

# 4. Run rate limit test (see above)
# Must see 429 on 6th attempt

# 5. Monitor logs during first users
vercel logs --follow
```

---

## 🎯 Giving App to Users

### Step 1: Prepare Communication

**Create WhatsApp/Telegram message:**

```
🏀 Team Selector Beta Test 🏀

You're invited to test our new team balancing app!

📱 App: [your-deployed-url]

How to start:
1. Click the link
2. Sign up with your phone number
3. Create a team OR join via invite link

This is a BETA - expect some rough edges.
Please report any bugs or confusion!

Bug reports: [your WhatsApp/Telegram]
```

### Step 2: Start Small

**Week 1: Micro test (3-5 people)**
- Close friends only
- Patient testers
- Daily check-ins

**Week 2: Small beta (10-15 people)**
- One real sports team
- Monitor closely

### Step 3: Monitor

```bash
# Watch logs continuously first 24 hours
vercel logs --follow

# Check for errors
# Look for "CRITICAL" or "ERROR" messages
# Respond to user reports quickly
```

---

## 🚨 If Users Report Issues

### Issue: "Can't join team - too many attempts"

**Cause:** Rate limiting working (good!)

**Fix:** Wait 1 minute, try again

**If persistent:** User may have wrong invite code

---

### Issue: "Something went wrong"

**Check:**
1. Vercel logs for errors
2. Supabase logs (Dashboard → Logs → API)
3. Browser console for JS errors

**Common causes:**
- Invalid invite code
- Expired invite code
- Network timeout

---

### Issue: "App is slow"

**Check:**
- Vercel function logs (cold start times)
- Supabase connection pool

**Typical:** First request is slow (cold start), then fast

---

## 🔄 If Critical Issue Found

### Rollback

```bash
vercel rollback
```

This reverts to previous deployment.

### Fix & Redeploy

```bash
# Fix the issue locally
# Test locally
npm run validate:beta

# Commit
git add -A
git commit -m "Fix: [describe issue]"
git push

# Deploy
vercel --prod
```

---

## 📊 Success Metrics

**Week 1 goals:**
- [ ] All 5 testers can login
- [ ] All 5 can join a team
- [ ] At least 1 team creates a session
- [ ] Zero critical bugs
- [ ] Zero data corruption

**If these pass:** Expand to 10-15 users

---

## 🎯 What Users Can Test

**Working features:**
- ✅ Login with phone + OTP
- ✅ Create team
- ✅ Generate invite link
- ✅ Join via invite link
- ✅ Add players to team
- ✅ Create session
- ✅ Generate balanced teams
- ✅ Reshuffle teams

**Known limitations:**
- Only 2 teams supported (multi-team coming next)
- Hebrew/RTL not fully polished
- Mobile UX needs refinement
- No team management UI yet

---

## 📞 Quick Commands

```bash
# Check deployment status
vercel ls

# Watch logs
vercel logs --follow

# Check recent deployments
vercel ls

# Rollback if needed
vercel rollback

# Redeploy current code
vercel --prod --force
```

---

## ✅ Summary

**Current status:**
- ✅ Code committed and pushed
- ⏳ Needs: Redis setup (15 min)
- ⏳ Needs: Migration 004 (5 min)
- ⏳ Needs: Deploy + verify (15 min)

**Total time:** ~35 minutes

**Then:** Ready for 3-5 beta users

---

**IMPORTANT:** Do NOT skip the rate limiting test. If it fails, the app is NOT production-safe.

---

**Next steps:**
1. Complete steps 1-4 above
2. Verify rate limiting works (429 test)
3. Invite 3-5 close friends
4. Monitor closely for 24 hours
