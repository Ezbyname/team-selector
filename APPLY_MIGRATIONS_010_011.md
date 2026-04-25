# Apply Migrations 010 and 011 - Password Reset System

**Required before deploying password reset feature**

---

## Migration 010: Password Reset Tables

**What it does:**
- Adds password reset fields to `auth_users` table
- Creates `password_reset_tokens` table for identity question flow
- Creates `password_reset_attempts` table for rate limiting
- Adds cleanup function for expired tokens

---

## Migration 011: Support Requests Table

**What it does:**
- Creates `support_requests` table for in-app support contact
- Stores user context automatically (phone, groups, roles)
- Tracks support request status and resolution

---

## ✅ Step 1: Go to Supabase SQL Editor

1. Open Supabase Dashboard
2. Go to: **SQL Editor** (left sidebar)
3. Click: **New query**

---

## ✅ Step 2: Run Migration 010

**Copy and paste this SQL:**

```sql
-- Migration 010: Password Reset System (Zero-cost)
-- Adds support for password reset via identity question or admin reset

-- Add password reset fields to auth_users
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_reset_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_by UUID REFERENCES auth_users(id);

-- Password reset tokens table (short-lived, for identity question flow)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset attempts (rate limiting)
CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized TEXT NOT NULL,
  attempt_type TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup and rate limiting
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_reset_attempts_phone_time ON password_reset_attempts(phone_normalized, created_at);

-- Cleanup function for expired reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE password_reset_tokens IS 'Short-lived tokens for password reset via identity question';
COMMENT ON TABLE password_reset_attempts IS 'Rate limiting and audit trail for password reset attempts';
COMMENT ON COLUMN auth_users.password_reset_required IS 'Set to true when admin resets user password';
COMMENT ON COLUMN auth_users.password_reset_by IS 'Which admin triggered the password reset';
```

**Click: RUN**

**Expected result:**
```
Success. No rows returned.
```

---

## ✅ Step 3: Verify Migration 010

**Run this verification query:**

```sql
-- Verify auth_users columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auth_users' 
AND column_name IN ('password_reset_required', 'password_reset_requested_at', 'password_reset_by');

-- Verify tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('password_reset_tokens', 'password_reset_attempts');

-- Verify indexes created
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('password_reset_tokens', 'password_reset_attempts');
```

**Expected result:**
- 3 columns in auth_users
- 2 tables created
- 2 indexes created

---

## ✅ Step 4: Run Migration 011

**Copy and paste this SQL:**

```sql
-- Migration 011: Support Requests Table
-- In-app support contact system (zero-cost)

CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  user_info JSONB,
  context TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin support dashboard
CREATE INDEX IF NOT EXISTS idx_support_status_created ON support_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_user ON support_requests(user_id);

COMMENT ON TABLE support_requests IS 'In-app support contact form submissions';
COMMENT ON COLUMN support_requests.user_info IS 'Auto-attached user context: phone, groups, roles';
COMMENT ON COLUMN support_requests.context IS 'Context from which support was requested (e.g., password_reset_failed)';
```

**Click: RUN**

**Expected result:**
```
Success. No rows returned.
```

---

## ✅ Step 5: Verify Migration 011

**Run this verification query:**

```sql
-- Verify table created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'support_requests';

-- Verify indexes created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'support_requests';

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'support_requests'
ORDER BY ordinal_position;
```

**Expected result:**
- 1 table created (`support_requests`)
- 2 indexes created
- 12 columns total

---

## ✅ Final Verification

**Run this query to confirm everything:**

```sql
-- Check all password reset components
SELECT 
  'auth_users columns' as component,
  COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'auth_users' 
AND column_name IN ('password_reset_required', 'password_reset_requested_at', 'password_reset_by')

UNION ALL

SELECT 
  'password_reset_tokens table' as component,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name = 'password_reset_tokens'

UNION ALL

SELECT 
  'password_reset_attempts table' as component,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name = 'password_reset_attempts'

UNION ALL

SELECT 
  'support_requests table' as component,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name = 'support_requests';
```

**Expected result:**
```
component                          | count
-----------------------------------+-------
auth_users columns                 |     3
password_reset_tokens table        |     1
password_reset_attempts table      |     1
support_requests table             |     1
```

**All counts should be 3, 1, 1, 1** ✅

---

## 🚨 If Migrations Fail

### Error: "column already exists"
**Solution:** Column was added in a previous attempt. Safe to ignore.

### Error: "relation already exists"
**Solution:** Table was created in a previous attempt. Safe to ignore.

### Error: "foreign key constraint"
**Solution:** Verify `auth_users` table exists. Check table name matches exactly.

---

## ✅ After Both Migrations Applied

You should now have:

**New columns in `auth_users`:**
- `password_reset_required` (boolean)
- `password_reset_requested_at` (timestamptz)
- `password_reset_by` (uuid)

**New tables:**
- `password_reset_tokens` - For identity question flow
- `password_reset_attempts` - For rate limiting
- `support_requests` - For in-app support

**Ready for deployment!**

---

## Next Steps

1. ✅ Migrations applied
2. → Implement Admin UI
3. → Deploy to Vercel
4. → Test complete password reset flow
