# 🚨 Deployment Rules - MUST FOLLOW

**These rules prevent production failures and 500 errors.**

---

## ✅ Rule 1: Environment Variables MUST Be Set Before Deploy

**NEVER deploy without these environment variables configured in Vercel:**

### **Required Variables:**

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
JWT_SECRET=your-secret-key-minimum-32-chars
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxx...
```

### **How to Set (BEFORE FIRST DEPLOY):**

**Option A: Vercel CLI**
```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add JWT_SECRET production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

**Option B: Vercel Dashboard**
1. Go to: https://vercel.com/dashboard
2. Select project: `team-selector`
3. Settings → Environment Variables
4. Add each variable for **Production**

### **Verification (BEFORE DEPLOY):**

```bash
# Check what's set
vercel env ls

# Pull to local (verify they exist)
vercel env pull .env.production
cat .env.production
```

**MUST see all 5 variables.**

**If ANY are missing → DO NOT DEPLOY → Set them first!**

---

## ✅ Rule 2: Database Migrations MUST Be Applied Before Deploy

**NEVER deploy without running migrations first.**

### **Required Migrations:**

1. **Migration 001** - Initial schema (auth_users, groups, etc.)
2. **Migration 010** - Password reset tables
3. **Migration 011** - Support requests table

### **How to Apply:**

1. Open Supabase Dashboard → SQL Editor
2. Run each migration file in order
3. Verify with:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**MUST see:**
- `auth_users`
- `auth_sessions`
- `groups`
- `group_members`
- `password_reset_tokens`
- `password_reset_attempts`
- `support_requests`

### **Verification Script:**

```bash
npm run validate:beta
```

**MUST show:** ✅ READY FOR BETA TESTING

---

## ✅ Rule 3: Test Locally Before Production Deploy

**NEVER deploy directly to production without local testing.**

### **Local Test Checklist:**

```bash
# 1. Start local server
vercel dev

# 2. Test auth flow
# - Visit: http://localhost:3000/login.html
# - Enter phone + password
# - MUST login successfully

# 3. Test API endpoints
# - Create team
# - Join team
# - Generate teams
# - All MUST work

# 4. Check console
# - MUST have zero errors
```

**If ANY test fails → FIX BEFORE DEPLOY**

---

## ✅ Rule 4: Always Check Vercel Logs After Deploy

**NEVER assume deploy succeeded just because Vercel says "Ready".**

### **After Every Deploy:**

```bash
vercel logs --follow
```

**Watch for:**
- ❌ "Missing environment variable"
- ❌ "Cannot connect to database"
- ❌ "Internal server error"
- ✅ Successful API requests

### **If Errors Appear:**

1. **DO NOT** let users access the app
2. **FIX** the error immediately
3. **REDEPLOY** with fix
4. **VERIFY** logs are clean

---

## ✅ Rule 5: Environment Variables Are Secrets - Never Commit

**NEVER commit `.env` files to git.**

### **Protected Files (MUST be in .gitignore):**

```
.env
.env.local
.env.production
.env.development
.vercel/.env.*.local
```

### **Verification:**

```bash
# Check gitignore
cat .gitignore | grep .env

# MUST see:
.env*
.vercel
```

**If .env is tracked → REMOVE IT IMMEDIATELY:**

```bash
git rm --cached .env
git commit -m "Remove .env from git"
git push
```

---

## ✅ Rule 6: Validate Configuration Before Deploy

**Run validation script BEFORE every production deploy.**

### **Pre-Deploy Checklist:**

```bash
# 1. Check environment variables
vercel env ls

# 2. Run validation
npm run validate:beta

# 3. Run tests
npm run test:password-reset-complete
npm run test:super-admin-inbox

# 4. Check git status
git status

# All tests MUST pass
# No uncommitted changes
```

**If ANY check fails → FIX BEFORE DEPLOY**

---

## ✅ Rule 7: Use Staging Before Production

**NEVER deploy breaking changes directly to production.**

### **Deployment Flow:**

```bash
# 1. Deploy to preview (staging)
vercel

# 2. Test on preview URL
# - Open: https://team-selector-xxx-preview.vercel.app
# - Test all flows
# - Verify no errors

# 3. ONLY if preview works → production
vercel --prod
```

---

## ✅ Rule 8: Monitor Production After Deploy

**NEVER deploy and walk away.**

### **Post-Deploy Monitoring (15 minutes):**

```bash
# Watch logs in real-time
vercel logs --follow
```

**Test on production:**
1. Login flow
2. Create team
3. Invite member
4. Generate teams
5. Check super admin inbox

**Watch logs for:**
- ❌ 500 errors
- ❌ Database connection errors
- ❌ Missing environment variables
- ❌ Rate limiting failures

**If errors appear → ROLLBACK:**

```bash
vercel rollback
```

---

## ✅ Rule 9: Document Configuration Changes

**NEVER change environment variables without documentation.**

### **When Adding New Environment Variable:**

1. **Add to this file** under Rule 1
2. **Add to `.env.example`**
3. **Update `APPLY_MIGRATIONS_*.md`** if needed
4. **Add to validation script**

### **Example:**

```bash
# In .env.example:
NEW_VARIABLE=example_value

# In DEPLOYMENT_RULES.md:
NEW_VARIABLE=actual_value_description
```

---

## ✅ Rule 10: Supabase Service Key Must Be Service Role (Not Anon)

**NEVER use `SUPABASE_ANON_KEY` for backend APIs.**

### **Correct Setup:**

```bash
# CORRECT (full access)
SUPABASE_SERVICE_KEY=eyJhbGc...service_role...

# WRONG (limited access)
SUPABASE_ANON_KEY=eyJhbGc...anon...
```

### **Where to Find:**

1. Supabase Dashboard
2. Settings → API
3. **Copy:** `service_role` key (NOT `anon` key)

---

## 🚨 Emergency Rollback Procedure

**If production is broken:**

```bash
# 1. Rollback to previous deployment
vercel rollback

# 2. Check logs
vercel logs --follow

# 3. Fix locally
# - Identify issue
# - Fix code
# - Test locally

# 4. Redeploy
vercel --prod

# 5. Monitor
vercel logs --follow
```

---

## 📋 Pre-Deploy Checklist (Print This!)

**RUN THIS CHECKLIST BEFORE EVERY `vercel --prod`:**

- [ ] All environment variables set in Vercel
- [ ] Database migrations applied
- [ ] Tested locally with `vercel dev`
- [ ] All tests passing (`npm run test:*`)
- [ ] Validation script passes (`npm run validate:beta`)
- [ ] No uncommitted changes (`git status`)
- [ ] `.env` files NOT committed
- [ ] Preview deploy tested (optional but recommended)

**If ALL checked → Safe to deploy:**

```bash
vercel --prod
```

**After deploy:**

- [ ] Check logs (`vercel logs --follow`)
- [ ] Test login flow on production
- [ ] Test critical features
- [ ] Monitor for 15 minutes
- [ ] No errors in logs

---

## 🎯 Common Mistakes & Fixes

### **Mistake 1: "Missing environment variable" in logs**

**Fix:**
```bash
vercel env add MISSING_VARIABLE production
vercel --prod  # Redeploy
```

### **Mistake 2: "Cannot connect to database"**

**Fix:**
- Verify `SUPABASE_URL` is correct
- Verify `SUPABASE_SERVICE_KEY` is service role (not anon)
- Check Supabase dashboard → project is active

### **Mistake 3: "Table does not exist"**

**Fix:**
- Apply missing migration in Supabase SQL Editor
- Verify with: `SELECT * FROM information_schema.tables`

### **Mistake 4: "Invalid JWT secret"**

**Fix:**
```bash
# Generate new secret (32+ chars)
openssl rand -base64 32

# Set in Vercel
vercel env add JWT_SECRET production
```

### **Mistake 5: Rate limiting not working**

**Fix:**
- Verify Redis credentials set
- Test: `npm run test:rate-limit-safety`

---

## ✅ Validation Commands Reference

```bash
# Check environment
vercel env ls

# Pull environment locally
vercel env pull

# Validate beta readiness
npm run validate:beta

# Test password reset
npm run test:password-reset-complete

# Test super admin
npm run test:super-admin-inbox

# Test rate limiting
npm run test:rate-limit-safety

# Check git status
git status

# View recent deployments
vercel ls

# View logs
vercel logs

# Rollback if needed
vercel rollback
```

---

## 🔒 Security Rules

1. **NEVER** commit `.env` files
2. **NEVER** use `SUPABASE_ANON_KEY` in backend
3. **NEVER** expose `JWT_SECRET`
4. **NEVER** deploy without HTTPS
5. **ALWAYS** use `service_role` key for server-side
6. **ALWAYS** validate input on server
7. **ALWAYS** use rate limiting

---

## 📞 When Things Go Wrong

**Production is down? Follow this:**

1. **Rollback immediately:** `vercel rollback`
2. **Check logs:** `vercel logs`
3. **Identify issue:** Read error messages
4. **Fix locally:** Test with `vercel dev`
5. **Redeploy:** `vercel --prod`
6. **Monitor:** `vercel logs --follow`

**If stuck:**
- Check this file
- Review `APPLY_MIGRATIONS_010_011.md`
- Check Supabase logs
- Review Vercel dashboard

---

## ✅ Summary: The Golden Rules

1. ✅ **Set environment variables FIRST**
2. ✅ **Apply migrations BEFORE deploy**
3. ✅ **Test locally ALWAYS**
4. ✅ **Check logs AFTER deploy**
5. ✅ **Monitor production for 15 minutes**
6. ✅ **Rollback if errors appear**
7. ✅ **Never commit secrets**
8. ✅ **Use service role key for backend**
9. ✅ **Validate before every deploy**
10. ✅ **Document all changes**

**Follow these rules = Zero production failures.** 🎯

---

**Last updated:** After implementing comprehensive error handling and validation checks.
