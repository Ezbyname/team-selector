# Phase 1 Integration Execution - Checklist

**For User:** Run these steps locally and share results  
**For Claude:** Analyze results and fix issues  

---

## Your Environment Setup (One-Time)

### 1. Create `.env.local`

Create file: `C:\Codes\team selector\.env.local`

```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret_at_least_32_characters_long

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Environment
NODE_ENV=development
```

**Note:** Service key stays local only, never share in chat.

### 2. Verify Environment

```bash
cd "C:\Codes\team selector"
npm run validate:env
```

**Expected:** `✓ VALIDATION PASSED`

---

## Execution Steps

### Step 1: Deploy Database Schema

**In Supabase Dashboard:**

1. Go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open local file: `supabase/migrations/001_initial_schema.sql`
4. Copy all 600+ lines
5. Paste into SQL Editor
6. Click **Run** (or Ctrl+Enter)

**Expected:** `Success. No rows returned.`

**Verify:**
- Go to **Table Editor**
- Should see 11 tables: `auth_users`, `otp_codes`, `auth_sessions`, `players`, etc.

**Your Status:** ✅ / ❌ (If ❌, share error message)

---

### Step 2: Start Development Server

**Terminal 1:**

```bash
cd "C:\Codes\team selector"
npm run dev
```

**Expected Output:**
```
Vercel CLI 28.x.x
> Ready! Available at http://localhost:3000
```

**Keep this terminal running.**

**Your Status:** ✅ / ❌

---

### Step 3: Run Postman Collection

**In Postman:**

1. Import collection: `postman/Team-Selector-Auth.postman_collection.json`
2. Import environment: `postman/Team-Selector.postman_environment.json`
3. Select environment: **"Team Selector - Local Development"** (dropdown, top right)
4. Verify `BASE_URL` = `http://localhost:3000` in environment
5. Click collection → **Run** button
6. Collection Runner window opens
7. Click **Run Team Selector - Authentication API**
8. Watch execution (takes ~10 seconds)

**Screenshot or note:**
- Total Runs: ?
- Passed: ?
- Failed: ?

---

### Step 4: Share Results

**Please provide in conversation:**

#### A. Summary
```
Total Runs: ?
Passed: ?
Failed: ?
```

#### B. For Each Failed Request (if any)
```
Request Name: [e.g., "3. Register"]
Status Code: [e.g., 500]
Expected Status: [e.g., 201]

Failed Assertions:
- [e.g., "Response has success field"]

Response Body:
{
  "error": "..."
}
```

#### C. Console Output
- Any errors in Postman Console tab
- Any errors in Terminal 1 (server logs)

#### D. Database State

**In Supabase → Table Editor:**

**auth_users table:**
- Row count: ?
- If >0, share: `phone_normalized`, `role`, first 10 chars of `password_hash`

**otp_codes table:**
- Row count: ?
- If >0, share: `code` length, `verified_at` (null or timestamp?)

**auth_sessions table:**
- Row count: ?

---

### Step 5: Manual Verification (After Tests Pass)

**Only if all 13 tests pass, check:**

**In `auth_users` table:**
- [ ] `password_hash` starts with `$2b$12$`
- [ ] `phone_normalized` = `+972509998888`
- [ ] `role` = `user`
- [ ] `phone_verified_at` is set (not null)

**Share:** ✅ all verified / ❌ describe mismatch

---

## What I'll Do With Your Results

### Scenario 1: All Tests Pass (13/13) ✅

**I will:**
1. Update `TEST_RESULTS.md` with integration results
2. Mark Phase 1 as **VALIDATED AND COMPLETE**
3. Create final validation report
4. Proceed to Auth UI development

### Scenario 2: Some Tests Fail ❌

**I will:**
1. Analyze each failure
2. Identify root cause (code bug, collection assumption, etc.)
3. Fix the issues
4. Update Postman collection if API behavior differs
5. Commit fixes
6. Ask you to:
   - Pull latest changes
   - Re-run specific requests (or full collection)
   - Share new results
7. Iterate until all pass

---

## Common Issues & Quick Fixes

### "ECONNREFUSED" in Postman
- Server not running
- Check Terminal 1 - should show "Ready!"
- Try browser: http://localhost:3000

### All tests fail with 500 errors
- Schema not deployed
- Check Supabase SQL Editor for errors
- Verify tables exist in Table Editor

### Port 3000 already in use
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill it or use different port
vercel dev --listen 3001
# (Update Postman BASE_URL to :3001)
```

### JWT_SECRET error
- Not in `.env.local`
- Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Add to `.env.local`

---

## Important Reminders

✅ **DO share:** Test results, error messages, status codes, response bodies  
❌ **DO NOT share:** Service role key, JWT secret, or any sensitive credentials  

---

**I'm ready. Please execute Steps 1-4 and share your results.**
