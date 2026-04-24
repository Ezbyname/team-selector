# Authentication Flow Rules & Troubleshooting

## Authentication Paths

### Path 1: New User Registration (OTP Flow)
**URL:** `http://localhost:3006/index.html`

**Flow:**
1. Enter phone number → Send OTP
2. Enter OTP code → Verify
3. System checks: User exists?
   - **No** → Show Registration screen (name + password)
   - **Yes** → Show Login screen (password only)
4. Complete registration/login → Access dashboard

**When to use:**
- ✅ First-time users (no account)
- ✅ Users who forgot they have an account
- ⚠️ Can have issues detecting existing users

---

### Path 2: Direct Login (Skip OTP)
**URL:** `http://localhost:3006/login.html`

**Flow:**
1. Enter phone number
2. Enter password
3. Login → Access dashboard

**When to use:**
- ✅ **Existing users** (recommended for admins)
- ✅ When OTP flow has issues
- ✅ Faster login (no OTP wait)
- ✅ **ALWAYS use this for admin accounts**

---

## Critical Rules

### Rule 1: Existing Users MUST Use Direct Login
**Problem:** OTP verification flow may incorrectly show registration screen for existing users

**Solution:** 
- ❌ **DON'T** use `http://localhost:3006/index.html` if you already have an account
- ✅ **DO** use `http://localhost:3006/login.html` (direct login)

**Why:** The OTP verification logic in `api/auth/verify-otp.js` has a bug where it checks user existence by trying to login with a fake password. This can fail and incorrectly identify existing users as new users.

---

### Rule 2: Phone Number Format is Critical

**Database Format:** E.164 with country code
```
Correct:  +972525502281
Wrong:    0525502281
Wrong:    972525502281
Wrong:    +972-052-550-2281
```

**Login Format:** WITHOUT country code
```
Correct:  0525502281
Correct:  525502281
Wrong:    +972525502281 (don't include +972)
```

**Why:** The backend normalizes phone numbers to E.164 for storage but expects local format for login.

---

### Rule 3: Admin Accounts Should Be Pre-Configured

**Before giving admin access:**

1. **Create account via script** (bypass UI issues):
   ```bash
   node create-super-admin.js
   ```

2. **Set strong password via script**:
   ```bash
   node update-admin-password.js
   ```

3. **Verify admin role**:
   ```bash
   node check-and-promote-admin.js
   ```

4. **Provide direct login link**:
   ```
   http://localhost:3006/login.html
   ```

**Never** tell admins to use the OTP registration flow - it's for regular users only.

---

### Rule 4: OTP Codes Have Strict Expiration

**OTP Lifetime:** 5 minutes from creation

**Common Issues:**
- ❌ Using expired OTP → "Invalid or expired OTP code"
- ❌ Using already-verified OTP → "Invalid or expired OTP code"
- ❌ Auto-filled code `123456` not matching database → Error

**Solutions:**
- ✅ Click "Change phone number ←" and request new OTP
- ✅ Check actual OTP in database: `node check-otp.js`
- ✅ Generate fresh OTP: `node generate-otp.js`

---

### Rule 5: Display Name vs Phone Number (Schema Hack)

**Database Schema:**
```sql
CREATE TABLE auth_users (
  phone TEXT NOT NULL,              -- Actually stores display name!
  phone_normalized TEXT UNIQUE NOT NULL  -- Actual phone in E.164
);
```

**⚠️ WARNING:** The `phone` column stores **display name**, not phone number!

**Why:** No separate `display_name` column exists (schema limitation)

**Implications:**
- When querying users, use `phone_normalized` to find by phone
- The `phone` field contains names like "E-z Gal", "Mike", etc.
- Don't filter by `phone` field expecting phone numbers!

**Correct Query:**
```javascript
// ✅ CORRECT
const { data } = await supabase
  .from('auth_users')
  .select('*')
  .eq('phone_normalized', '+972525502281');

// ❌ WRONG
const { data } = await supabase
  .from('auth_users')
  .select('*')
  .eq('phone', '0525502281');  // This searches display names!
```

---

## Authentication Scripts

### 1. create-super-admin.js
**Purpose:** Create new admin user directly in database (bypasses OTP)

**Usage:**
```bash
node create-super-admin.js
```

**Edit Before Running:**
```javascript
const phone = '+972525502281';         // Target phone number
const displayName = 'Erez (Admin)';    // Display name
const password = 'admin123';           // Initial password
```

**Output:**
- Creates user with `role = 'admin'`
- Sets `phone_verified_at` (skips OTP)
- Returns user ID and credentials

**When to use:**
- Setting up first admin
- Creating admin accounts for team managers
- Bypassing OTP for testing

---

### 2. check-and-promote-admin.js
**Purpose:** Find existing user and check/promote their role

**Usage:**
```bash
node check-and-promote-admin.js
```

**Edit Before Running:**
```javascript
const phone = '+972525502281';  // Phone to check
```

**Output:**
- Shows user details (ID, name, current role)
- Checks if already admin
- Can promote user to admin (currently disabled - enum issue)

**When to use:**
- Verify admin status
- Check if user exists
- Audit user roles

---

### 3. update-admin-password.js
**Purpose:** Reset admin password (when forgotten or needs change)

**Usage:**
```bash
node update-admin-password.js
```

**Edit Before Running:**
```javascript
const phone = '+972525502281';     // Target phone
const newPassword = 'Trzdk1408!';  // New password
```

**Output:**
- Hashes password with bcrypt (cost 12)
- Updates `password_hash` in database
- Returns login credentials

**When to use:**
- Admin forgot password
- Initial password setup
- Security: forcing password change
- **Emergency access recovery**

---

### 4. check-otp.js
**Purpose:** View OTP codes for debugging

**Usage:**
```bash
node check-otp.js
```

**Output:**
- Lists all OTP codes for phone
- Shows expiration status
- Identifies valid vs expired codes

**When to use:**
- OTP not working
- Debugging verification flow
- Checking if OTP was sent

---

### 5. generate-otp.js
**Purpose:** Manually create OTP for testing

**Usage:**
```bash
node generate-otp.js
```

**Output:**
- Generates random 6-digit code
- Inserts into `otp_codes` table
- Valid for 5 minutes

**When to use:**
- OTP SMS not arriving (dev mode)
- Testing verification flow
- Manual verification for admins

---

## Common Issues & Solutions

### Issue 1: "Invalid or expired OTP code"

**Symptoms:**
- Entering OTP shows error
- Auto-filled code doesn't work
- Code was just sent but still fails

**Diagnosis:**
```bash
node check-otp.js
```

**Solutions:**
1. **OTP expired (>5 min old)**
   - Click "Change phone number ←"
   - Request new OTP

2. **OTP already used**
   - Check output of `check-otp.js`
   - Generate new: `node generate-otp.js`

3. **Auto-fill shows wrong code (123456)**
   - Dev mode bug - showing dummy code
   - Use real code from `check-otp.js` output
   - Or request new OTP

---

### Issue 2: Registration Screen for Existing User

**Symptoms:**
- User already exists in database
- OTP verification shows "Create Account" instead of "Login"
- Trying to register shows "User already exists" error

**Root Cause:**
- Bug in `api/auth/verify-otp.js` lines 343-370
- User detection logic fails

**Solutions:**

**Option 1: Direct Login (RECOMMENDED)**
```
http://localhost:3006/login.html
Phone: 0525502281
Password: (your password)
```

**Option 2: Reset Password & Use Direct Login**
```bash
# Edit password in script
node update-admin-password.js

# Then use login.html
```

**Option 3: Fix OTP Verification Logic** (Developer)
- Update `api/auth/verify-otp.js`
- Check user exists properly before showing screen
- Don't use fake password login attempt for detection

---

### Issue 3: "Network error. Please try again."

**Symptoms:**
- Clicking "Send Code" shows network error
- Browser console shows CORS or API errors

**Diagnosis:**
1. Check if Vercel dev is running:
   ```bash
   vercel dev --listen 3006
   ```

2. Check API path in `frontend/auth.js`:
   ```javascript
   const API_BASE_URL = '/api/auth';  // Must be relative
   ```

3. Check browser DevTools → Network tab

**Solutions:**
- Restart Vercel dev server
- Hard refresh browser (Ctrl+Shift+R)
- Check `vercel.json` has correct routes
- Verify `authState.countryCode` is set

---

### Issue 4: Password Not Working

**Symptoms:**
- "Invalid credentials" error
- Password definitely correct
- Used to work before

**Diagnosis:**
1. Check user exists:
   ```bash
   node check-and-promote-admin.js
   ```

2. Verify phone format:
   - Login uses: `0525502281` (no +972)
   - Database has: `+972525502281`

**Solutions:**

**Reset Password:**
```bash
# Edit password in script
node update-admin-password.js
```

**Try Direct Login:**
```
http://localhost:3006/login.html
```

---

### Issue 5: Auto-Fill Code Not Working

**Symptoms:**
- OTP input shows `123456`
- Clicking verify fails
- Dev mode but code doesn't match database

**Root Cause:**
- Dev mode auto-fill feature broken
- Shows hardcoded `123456` instead of actual OTP

**Solutions:**

**Option 1: Use Real OTP**
```bash
node check-otp.js  # Get actual code
# Clear input, enter real code
```

**Option 2: Generate & Use New OTP**
```bash
node generate-otp.js
# Copy code from output
# Clear input, enter code
```

**Option 3: Skip OTP Entirely**
- Use `http://localhost:3006/login.html`

---

## Best Practices

### For Admins
1. ✅ **ALWAYS** use direct login (`/login.html`)
2. ✅ Store password securely (password manager)
3. ✅ Use strong passwords (8+ chars, mixed case, numbers, symbols)
4. ✅ Keep user ID documented (for database queries)
5. ❌ **NEVER** use OTP flow for admin login

### For Regular Users
1. ✅ Use OTP flow (`/index.html`) for first signup
2. ✅ Use direct login (`/login.html`) after registration
3. ✅ Keep phone number in local format (0525502281)
4. ❌ Don't include country code when logging in

### For Developers
1. ✅ Test both authentication paths
2. ✅ Use scripts for admin management (not UI)
3. ✅ Check database directly when UI fails
4. ✅ Document phone number formats clearly
5. ✅ Fix OTP verification user detection logic

---

## Security Notes

### Password Storage
- **Algorithm:** bcrypt
- **Cost:** 12 rounds
- **Never** store plain passwords
- **Never** log passwords

### OTP Security
- **Expiration:** 5 minutes (strict)
- **One-time use:** Mark as verified after use
- **Random generation:** Cryptographically secure
- **Storage:** Plain text in DB (acceptable for OTPs)

### JWT Tokens
- **Access Token:** 15 minutes expiration
- **Refresh Token:** 7 days expiration
- **Storage:** Access in localStorage, Refresh in httpOnly cookie
- **Auto-refresh:** 1 minute before expiration

---

## Current Admin Details

**Name:** Erez (E-z Gal)  
**Phone:** +972525502281 (login as 0525502281)  
**User ID:** `9ce3e60d-c196-4f3a-9609-a70c4e14fb9a`  
**Role:** `admin`  
**Password:** `Trzdk1408!`  
**Login URL:** http://localhost:3006/login.html

---

## Quick Reference

### Login as Admin
```
URL: http://localhost:3006/login.html
Phone: 0525502281
Password: Trzdk1408!
```

### Reset Admin Password
```bash
# Edit password in update-admin-password.js
node update-admin-password.js
```

### Check Admin Status
```bash
node check-and-promote-admin.js
```

### Debug OTP Issues
```bash
node check-otp.js
node generate-otp.js
```

### Create New Admin
```bash
# Edit details in create-super-admin.js
node create-super-admin.js
```

---

## Future Improvements

### Short Term
- [ ] Fix OTP verification user detection bug
- [ ] Add `display_name` column to schema (remove phone hack)
- [ ] Improve error messages (distinguish expired vs invalid)
- [ ] Add "Forgot Password" flow

### Long Term
- [ ] Add email authentication option
- [ ] Implement 2FA for admin accounts
- [ ] Add session management UI
- [ ] OAuth integration (Google, Apple)
- [ ] Passwordless login (magic links)

---

## Testing Checklist

Before deploying authentication changes:

### New User Flow
- [ ] Enter phone → Send OTP works
- [ ] OTP arrives (or shows in dev mode)
- [ ] Verify OTP → Shows registration screen
- [ ] Register with name + password
- [ ] Redirects to dashboard
- [ ] Can logout and login again

### Existing User Flow
- [ ] Direct login (`/login.html`) works
- [ ] OTP flow detects existing user
- [ ] Shows login screen (not registration)
- [ ] Password authentication works
- [ ] Session persists on refresh
- [ ] Can logout successfully

### Admin Flow
- [ ] Admin can create teams
- [ ] Admin can assign sub-admins
- [ ] Admin role persists across sessions
- [ ] Admin can access admin-only features

### Error Handling
- [ ] Invalid phone shows clear error
- [ ] Expired OTP shows clear error
- [ ] Wrong password shows clear error
- [ ] Network errors show properly
- [ ] All errors clear when retrying

---

## Summary

**Golden Rule:** Admins should **ALWAYS** use direct login (`/login.html`), not the OTP flow.

**Why:** OTP verification has a bug detecting existing users and may show registration screen instead of login.

**Setup Process:**
1. Create admin: `node create-super-admin.js`
2. Set password: `node update-admin-password.js`
3. Use direct login: `http://localhost:3006/login.html`
4. Never use OTP flow for admin accounts

**Remember:** `auth_users.phone` stores display name, `phone_normalized` stores actual phone!
