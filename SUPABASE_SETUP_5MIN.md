# Supabase Setup - 5 Minute Guide

**Purpose:** Create Supabase project and provide credentials for integration testing

---

## Step 1: Create Project (2 minutes)

1. Go to: https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name:** `team-selector`
   - **Database Password:** [Generate strong password - you won't need this again]
   - **Region:** Choose closest (e.g., Frankfurt, Singapore)
   - **Pricing Plan:** Free
4. Click **"Create new project"**
5. Wait ~2 minutes (status bar shows progress)

---

## Step 2: Get Credentials (1 minute)

1. Once provisioned, go to **Settings** (left sidebar) → **API**
2. Copy these 3 values:

**Project URL:**
```
https://your-project-id.supabase.co
```

**anon key (public):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**service_role key (secret):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 3: Provide to Me

Share these in the conversation:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

**Note:** Service role key is sensitive but I need it to:
- Deploy schema
- Run integration tests with RLS bypass
- Create test users

---

## Security Notes

- ✅ Service role key is for backend only (never in frontend)
- ✅ I will use it only for test execution
- ✅ You can rotate keys after testing if desired
- ✅ Free tier is sufficient (500MB DB, 50K users)

---

**Total Time:** 3-4 minutes

**Next:** Once you provide credentials, I will:
1. Deploy database schema
2. Configure environment
3. Run Postman collection
4. Return with actual test results
