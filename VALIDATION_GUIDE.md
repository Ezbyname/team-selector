# Phase 1 Backend Validation Guide

This guide provides step-by-step instructions to validate the Phase 1 authentication backend.

---

## Prerequisites Checklist

Before running validation tests, ensure you have:

- [ ] Node.js 18+ installed
- [ ] Supabase account created
- [ ] Twilio account (optional for dev - OTP will log to console)
- [ ] Git repository cloned
- [ ] Terminal/command prompt access

---

## Step 1: Install Dependencies

```bash
cd "C:\Codes\team selector"
npm install
```

**Expected Output:**
```
added 23 packages, and audited 24 packages in 3s
found 0 vulnerabilities
```

**Validation:**
- [ ] No errors during installation
- [ ] `node_modules/` directory created
- [ ] `package-lock.json` created

---

## Step 2: Create Supabase Project

### 2.1 Create Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `team-selector`
   - **Database Password:** (generate strong password - save it!)
   - **Region:** Choose closest to your users (e.g., Frankfurt, Singapore)
   - **Pricing Plan:** Free
4. Click **"Create new project"**
5. Wait ~2 minutes for provisioning

### 2.2 Deploy Database Schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open `supabase/migrations/001_initial_schema.sql` locally
4. Copy entire contents (all 600+ lines)
5. Paste into SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)

**Expected Output:**
```
Success. No rows returned.
```

### 2.3 Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. Verify these tables exist:
   - [ ] `auth_users`
   - [ ] `otp_codes`
   - [ ] `auth_sessions`
   - [ ] `players`
   - [ ] `player_connections`
   - [ ] `user_recent_players`
   - [ ] `permanent_groups`
   - [ ] `permanent_group_members`
   - [ ] `game_sessions`
   - [ ] `game_participants`
   - [ ] `generated_teams`

3. Check `auth_users` table has 1 row (placeholder admin)
4. Click on `auth_users` and verify columns:
   - [ ] id (uuid)
   - [ ] phone (text)
   - [ ] phone_normalized (text)
   - [ ] password_hash (text)
   - [ ] role (user_role enum)
   - [ ] phone_verified_at (timestamptz)
   - [ ] created_at (timestamptz)
   - [ ] updated_at (timestamptz)

### 2.4 Get Supabase Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values:
   - **Project URL:** `https://abcdefgh.supabase.co`
   - **Project API keys** → **service_role key** (NOT anon key!)

---

## Step 3: Configure Environment Variables

### 3.1 Create `.env.local`

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### 3.2 Fill in values

Edit `.env.local`:

```bash
# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Configuration (generate random 32+ character string)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long

# Twilio Configuration (OPTIONAL for development)
# Leave empty to log OTP to console
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Environment
NODE_ENV=development
```

**Generate JWT_SECRET:**

Option A (Node.js):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Option B (PowerShell):
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### 3.3 Validate Environment

Create validation script:

```javascript
// validate-env.js
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  process.exit(1);
}

console.log('✓ All required environment variables present');
console.log('✓ SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('✓ JWT_SECRET length:', process.env.JWT_SECRET.length);
console.log('✓ NODE_ENV:', process.env.NODE_ENV || 'production');
```

Run:
```bash
node --env-file=.env.local validate-env.js
```

---

## Step 4: Start Development Server

```bash
vercel dev
```

**Expected Output:**
```
Vercel CLI 28.0.0
> Ready! Available at http://localhost:3000
```

**Validation:**
- [ ] Server starts without errors
- [ ] Port 3000 is open
- [ ] No "module not found" errors

**Common Issues:**

**"Cannot find module '@supabase/supabase-js'"**
→ Run `npm install` again

**"Port 3000 already in use"**
→ Kill process on port 3000 or use different port:
```bash
vercel dev --listen 3001
```

**"JWT_SECRET is not defined"**
→ Check `.env.local` exists and has JWT_SECRET

---

## Step 5: Run Validation Tests

Open a **new terminal** (keep server running) and run:

```bash
node --env-file=.env.local test-backend.js
```

### Test Suite Overview

**Suite 1: Phone Normalization (9 tests)**
- E.164 conversion (050-123-4567 → +972501234567)
- Invalid format rejection
- All Israeli prefixes (050-058)
- Display formatting

**Suite 2: OTP Flow (6 tests)**
- Send OTP to valid phone
- Reject invalid phone
- Verify correct code
- Reject wrong code
- OTP reuse protection
- Expiration handling (manual verification)

**Suite 3: Registration (4 tests)**
- Reject registration without OTP
- Create account with verified phone
- Password strength validation
- Duplicate phone rejection

**Suite 4: Login (3 tests)**
- Login with correct credentials
- Reject wrong password
- Reject non-existent phone

**Suite 5: Token Refresh (3 tests)**
- Refresh with valid cookie
- Reject missing cookie
- Reject invalid token
- Token rotation

**Suite 6: Logout (3 tests)**
- Logout with valid session
- Session invalidation verification
- Idempotent logout

**Suite 7: Database Validation**
- Manual verification steps

### Expected Output

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        PHASE 1 BACKEND VALIDATION TEST SUITE                 ║
║        Team Selector v2.0 - Authentication Tests             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

ℹ Base URL: http://localhost:3000
ℹ Test Phone: 050-999-8888
ℹ Test Display Name: Test User
ℹ Environment: development

======================================================================
TEST SUITE 1: Phone Normalization
Testing E.164 conversion and validation

✓ Normalize 050-123-4567 → +972501234567
✓ Normalize 0501234567 → +972501234567
✓ Already E.164 format preserved
✓ Normalize 972501234567 → +972501234567
✓ Reject invalid phone (too short)
✓ Reject invalid prefix (040)
✓ All valid Israeli prefixes accepted (050-058)
✓ Format E.164 → 050-123-4567
✓ isValidPhone() accepts valid number
✓ isValidPhone() rejects invalid number

======================================================================
TEST SUITE 2: OTP Flow (Send & Verify)
Testing OTP generation, expiration, and reuse protection

ℹ Step 1: Send OTP to test phone...
✓ Send OTP returns 200 (got 200)
✓ Send OTP response has success=true
✓ Send OTP response includes expiresAt
ℹ OTP Code (dev mode): 123456
  Response: {
    "success": true,
    "message": "OTP sent successfully",
    "expiresAt": "2026-04-21T22:05:00.000Z",
    "otpCode": "123456"
  }

...

======================================================================
TEST RESULTS SUMMARY

Total Tests: 28
Passed: 28
Failed: 0
Warnings: 5
Pass Rate: 100.0%

✓ ALL TESTS PASSED! ✓

Phase 1 backend is production-ready.

⚠ 5 warning(s) found. Review recommended but not blocking.

======================================================================
```

---

## Step 6: Manual Database Verification

### 6.1 Verify User Created

1. Go to Supabase → **Table Editor** → `auth_users`
2. Find test user (phone: +972509998888)
3. Verify:
   - [ ] `password_hash` starts with `$2b$12$` (bcrypt)
   - [ ] `phone_normalized` is in E.164 format (+972...)
   - [ ] `role` is `user`
   - [ ] `phone_verified_at` is set (not null)
   - [ ] `created_at` is recent

### 6.2 Verify OTP Stored

1. Go to `otp_codes` table
2. Find OTP for test phone
3. Verify:
   - [ ] `code` is 6 digits
   - [ ] `expires_at` is ~5 minutes after `created_at`
   - [ ] `verified_at` is set after verification
   - [ ] Cannot verify same code twice

### 6.3 Verify Session Created

1. Go to `auth_sessions` table
2. Find session for test user
3. Verify:
   - [ ] `refresh_token` is 64-character hex string
   - [ ] `expires_at` is ~7 days after `created_at`
   - [ ] Session deleted after logout

### 6.4 Test RLS Policies

In Supabase SQL Editor, try:

```sql
-- This should FAIL (no RLS context)
SELECT * FROM auth_users;

-- This should work (service role bypasses RLS)
-- Run from API only
```

In your API, try accessing another user's data:
- Should be blocked by RLS policies
- User can only see their own profile

---

## Step 7: Twilio Integration (Optional)

### Development Mode (No Twilio)
- OTP codes are logged to console
- No SMS sent
- Works for testing

### Production Mode (With Twilio)

1. Sign up at https://www.twilio.com/try-twilio
2. Get credentials:
   - Account SID
   - Auth Token
   - Phone Number (buy one)
3. Add to `.env.local`:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```
4. Restart server
5. Test OTP - should receive SMS

**Verification:**
- [ ] SMS received on real phone
- [ ] OTP code matches database
- [ ] Code expires after 5 minutes

---

## Step 8: Validation Report

Create a validation report with:

### 8.1 Test Results
- Total tests run
- Pass/fail count
- Warning count
- Any failing tests and reasons

### 8.2 Environment Configuration
- Node.js version
- Supabase project ID
- Database tables count
- Twilio status (enabled/disabled)

### 8.3 Manual Verifications
- [ ] Password hashing confirmed (bcrypt $2b$12$)
- [ ] Phone normalization correct (E.164)
- [ ] OTP expiration works (5 minutes)
- [ ] OTP reuse blocked
- [ ] JWT tokens issued correctly
- [ ] Refresh token rotation works
- [ ] httpOnly cookies set
- [ ] Session invalidated on logout
- [ ] RLS policies enforced

### 8.4 Outstanding Issues
- List any warnings
- List any manual steps not completed
- List any assumptions made

---

## Step 9: Production Deployment (After Validation)

Once all tests pass:

1. **Add Vercel Environment Variables**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_KEY
   vercel env add JWT_SECRET
   vercel env add TWILIO_ACCOUNT_SID
   vercel env add TWILIO_AUTH_TOKEN
   vercel env add TWILIO_PHONE_NUMBER
   vercel env add NODE_ENV production
   ```

2. **Deploy to Production**
   ```bash
   vercel --prod
   ```

3. **Run Tests Against Production**
   ```bash
   TEST_BASE_URL=https://your-app.vercel.app node test-backend.js
   ```

4. **Update Admin Credentials**
   ```sql
   UPDATE auth_users
   SET phone = 'Your Name',
       phone_normalized = '+972501234567',
       password_hash = '$2b$12$...'  -- Generate new hash
   WHERE role = 'admin';
   ```

---

## Validation Checklist

### Setup Phase
- [ ] Dependencies installed
- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] All tables exist
- [ ] Environment variables configured
- [ ] Development server starts

### Automated Tests
- [ ] Phone normalization (9/9 pass)
- [ ] OTP flow (6/6 pass)
- [ ] Registration (4/4 pass)
- [ ] Login (3/3 pass)
- [ ] Token refresh (3/3 pass)
- [ ] Logout (3/3 pass)

### Manual Verification
- [ ] User created in database
- [ ] Password is bcrypt hashed
- [ ] Phone is E.164 normalized
- [ ] OTP stored and expires
- [ ] Session created and deleted
- [ ] RLS policies enforced
- [ ] httpOnly cookies working

### Security Validation
- [ ] bcrypt cost is 12
- [ ] JWT secret is 32+ chars
- [ ] Access tokens expire (15 min)
- [ ] Refresh tokens expire (7 days)
- [ ] Refresh tokens rotate
- [ ] OTP expires (5 min)
- [ ] OTP cannot be reused
- [ ] Service key not in frontend

### Production Ready
- [ ] All tests pass (0 failures)
- [ ] Warnings reviewed
- [ ] Manual steps completed
- [ ] Twilio configured (or dev mode ok)
- [ ] Admin credentials updated
- [ ] Production deployment tested

---

## Troubleshooting

### Test Failures

**"Connection refused" / "ECONNREFUSED"**
→ Make sure `vercel dev` is running

**"JWT_SECRET is not defined"**
→ Check `.env.local` exists and is in correct location

**"Invalid phone number"**
→ Use Israeli format: 050-xxx-xxxx

**"Phone already registered"**
→ Delete test user from Supabase or use different phone

**"OTP code not returned"**
→ Check NODE_ENV=development in .env.local

**"Session locked"**
→ Wait a moment and retry (optimistic locking)

### Database Issues

**"relation does not exist"**
→ Re-run schema SQL in Supabase

**"RLS policy error"**
→ Make sure using service_role key, not anon key

**"Function not found"**
→ Check all functions created in schema

### General Issues

**"Module not found"**
→ Run `npm install` again

**"Port 3000 in use"**
→ Use `vercel dev --listen 3001`

**"Twilio error"**
→ OK for development, OTP logged to console

---

## Success Criteria

Phase 1 backend is considered **VALIDATED** when:

✅ All automated tests pass (0 failures)  
✅ Manual database verification complete  
✅ Security checks confirmed  
✅ httpOnly cookies working  
✅ RLS policies enforced  
✅ Production deployment successful  

Once validated, proceed to Phase 1: Auth UI development.

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-21  
**Status:** Ready for Validation
