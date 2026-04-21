# Backend Setup Guide

## Phase 1: Auth Foundation Setup

### Prerequisites
- Node.js 18+ installed
- Vercel CLI installed (`npm i -g vercel`)
- Supabase account
- Twilio account (for SMS OTP)

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in details:
   - Name: `team-selector`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Wait for project to provision (~2 minutes)

---

## Step 2: Deploy Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy content from `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Verify tables created:
   - Go to **Table Editor**
   - Should see: `auth_users`, `otp_codes`, `auth_sessions`, `players`, etc.

---

## Step 3: Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **service_role key** (NOT anon key - we need bypass RLS)
3. Save these for environment variables

---

## Step 4: Setup Twilio (SMS OTP)

### Option A: Production (Real SMS)
1. Go to https://www.twilio.com/console
2. Sign up / Login
3. Get your credentials:
   - **Account SID**
   - **Auth Token**
   - **Phone Number** (buy one in console)

### Option B: Development (Console Logging)
- Skip Twilio setup
- OTP codes will be logged to console
- Works without Twilio credentials

---

## Step 5: Install Dependencies

```bash
cd "C:\Codes\team selector"
npm install
```

This will install:
- `@supabase/supabase-js` - Database client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens
- `twilio` - SMS sending

---

## Step 6: Configure Environment Variables

### Local Development (.env.local)

Create `.env.local` file in project root:

```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY_HERE

# JWT Secret (generate random 32+ character string)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars

# Twilio (optional for development)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Environment
NODE_ENV=development
```

### Vercel Production

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add JWT_SECRET
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_PHONE_NUMBER
```

---

## Step 7: Test Locally

```bash
# Start Vercel dev server
vercel dev
```

### Test Auth Endpoints

#### 1. Send OTP
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "050-123-4567"}'
```

Expected response:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresAt": "2026-04-21T...",
  "otpCode": "123456"
}
```

#### 2. Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "050-123-4567", "code": "123456"}'
```

#### 3. Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "050-123-4567",
    "password": "testpass123",
    "displayName": "Test User"
  }'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "phone": "050-123-4567",
    "phoneNormalized": "+972501234567",
    "displayName": "Test User",
    "role": "user"
  },
  "accessToken": "eyJhbGci..."
}
```

#### 4. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "050-123-4567", "password": "testpass123"}'
```

#### 5. Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Cookie: refresh_token=YOUR_TOKEN_HERE"
```

#### 6. Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: refresh_token=YOUR_TOKEN_HERE"
```

---

## Step 8: Update Admin Credentials

In Supabase SQL Editor, update the placeholder admin:

```sql
-- Replace with YOUR phone number and password
UPDATE auth_users
SET 
  phone = 'Your Name',
  phone_normalized = '+972501234567',  -- Your actual phone
  password_hash = '$2b$12$...'  -- Generate with bcrypt
WHERE role = 'admin';
```

To generate password hash:
```javascript
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('your_password', 12);
console.log(hash);
```

---

## Step 9: Deploy to Vercel

```bash
# Link project (first time)
vercel link

# Deploy to production
vercel --prod
```

---

## Verification Checklist

- [ ] Supabase project created
- [ ] Database schema deployed (12 tables)
- [ ] Supabase credentials obtained
- [ ] Twilio configured (or skipped for dev)
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables set (`.env.local`)
- [ ] Local dev server running (`vercel dev`)
- [ ] Send OTP endpoint working
- [ ] Verify OTP endpoint working
- [ ] Register endpoint working
- [ ] Login endpoint working
- [ ] Refresh token endpoint working
- [ ] Logout endpoint working
- [ ] Admin credentials updated
- [ ] Deployed to Vercel production

---

## Common Issues

### Issue: "JWT_SECRET is not defined"
**Fix:** Add `JWT_SECRET` to `.env.local` (at least 32 characters)

### Issue: "SUPABASE_URL is not defined"
**Fix:** Add Supabase credentials to `.env.local`

### Issue: "Twilio error" in console
**Solution:** This is OK for development. OTP will be logged to console instead.

### Issue: "Phone already registered"
**Fix:** Use a different phone number or delete the user from Supabase

### Issue: RLS policy error
**Fix:** Make sure you're using `SUPABASE_SERVICE_KEY` (not anon key)

### Issue: "Invalid or expired refresh token"
**Fix:** Login again to get a new refresh token

---

## Next Steps

Once Phase 1 is complete:
- [ ] Build auth frontend screens (login, signup, OTP)
- [ ] Add player management endpoints
- [ ] Implement temporary game flow
- [ ] Build team generation algorithm integration

---

## Security Notes

- **NEVER commit `.env.local` to git** (already in `.gitignore`)
- Use `SUPABASE_SERVICE_KEY` only in backend (bypasses RLS)
- Refresh tokens are httpOnly cookies (cannot be accessed by JavaScript)
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- OTP codes expire in 5 minutes
- Passwords are hashed with bcrypt (cost 12)
- Phone numbers are normalized to E.164 format
- All endpoints validate input before processing
