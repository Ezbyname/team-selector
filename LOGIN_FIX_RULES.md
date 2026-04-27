# Login System - Rules & Fixes

## ✅ Current Status
- **FIXED**: Phone number recognition now works with correct `service_role` key
- **FIXED**: Existing users see login screen (not registration)
- **WORKING**: Error messages display correctly in UI

## 🐛 Issues Found

### 1. Wrong redirect after login
**Problem**: After successful login, redirects to `/dashboard.html` which may not exist or is broken
**Current behavior**: Screen is "jumpy", nothing visible

**Fix needed**:
```javascript
// Line 645 in login.html - change redirect
window.location.href = '/my-teams.html';  // instead of /dashboard.html
```

### 2. Error message visibility
**Problem**: Error message shows in console but user reported not seeing it on screen
**Status**: Code looks correct, but test again after fixing redirect issue

## 📋 Authentication Flow Rules

### Rule 1: Phone Number Check (send-otp endpoint)
**When**: User enters phone and clicks "Send Code"
**Backend checks**: 
1. Normalize phone: `+972525502281`
2. Query `auth_users` with `service_role` key (bypasses RLS)
3. Return `userExists: true/false`

**Frontend behavior**:
- If `userExists: true` → Show **login screen** (password field)
- If `userExists: false` → Show **registration screen**
- If `passwordResetRequired: true` → Show **admin reset screen**

### Rule 2: Login (login endpoint)
**When**: Existing user enters password and clicks "Login"
**Backend checks**:
1. Find user by `phone_normalized`
2. Compare password with `bcrypt`
3. If match → Generate JWT tokens, return success
4. If no match → Return 401 `{"error": "Invalid phone or password"}`

**Frontend behavior**:
- On success: Save token, redirect to `/my-teams.html`
- On error: Show error message in red box above form
- On network error: Show "Cannot connect to server"

### Rule 3: Registration (register endpoint)  
**When**: New user fills form and clicks "Create Account"
**Backend checks**:
1. Check user doesn't exist (should never happen if send-otp worked)
2. Validate password ≥ 6 characters
3. Hash password with bcrypt (12 rounds)
4. Insert into `auth_users`
5. Generate JWT tokens

**Frontend behavior**:
- On success: Save token, redirect to `/my-teams.html`
- On 409 conflict: Show "Phone number already registered"
- On other error: Show actual error message

### Rule 4: Error Display
**Requirements**:
- ✅ Parse response body separately from status check
- ✅ Show actual server error messages (not generic "Network error")
- ✅ Red error box visible above form
- ✅ Error persists until next form action
- ✅ Only show "Network error" for actual fetch failures

**Implementation**:
```javascript
try {
  data = await response.json();
} catch (parseError) {
  showError('Server error. Please try again.');
  return;
}

if (!response.ok) {
  showError(data.error || 'Operation failed');
  return;
}
```

## 🔧 Required Fixes

### Fix 1: Update login redirect
```javascript
// File: frontend/login.html
// Line 645 (in loginForm handler)
// Change from:
window.location.href = '/dashboard.html';
// To:
window.location.href = '/my-teams.html';

// Line 597 (in registerForm handler)  
// Change from:
window.location.href = '/dashboard.html';
// To:
window.location.href = '/my-teams.html';
```

### Fix 2: Verify my-teams.html exists and works
**Check**:
```bash
ls frontend/my-teams.html
```
**If exists**: Test that it loads without errors
**If not exists**: Create redirect or use existing home page

### Fix 3: Version bump
After fixes:
- Update version to `v2.2.2 - Login Fixes`
- Deploy to production

## 🔐 Security Checklist
- ✅ Using `service_role` key in backend (bypasses RLS)
- ✅ Password hashed with bcrypt (12 rounds)
- ✅ JWT tokens with refresh mechanism
- ✅ HttpOnly cookies for refresh tokens
- ✅ No sensitive data in error messages
- ✅ Rate limiting on auth endpoints (via Upstash Redis)

## 🎯 Testing Checklist

### Test 1: Existing User Login
1. Go to `/login.html`
2. Enter existing phone: `0525502281`
3. Click "Send Code"
4. **Expected**: Shows "Welcome Back" with password field
5. Enter correct password
6. Click "Login"
7. **Expected**: Redirects to `/my-teams.html` with user logged in

### Test 2: Wrong Password
1. Follow steps 1-4 above
2. Enter wrong password: `wrongpass`
3. Click "Login"
4. **Expected**: Red error box shows "Invalid phone or password"
5. Password field cleared
6. Button re-enabled

### Test 3: New User Registration
1. Go to `/login.html`
2. Enter new phone: `0501234567`
3. Click "Send Code"
4. **Expected**: Shows "Create Account" form
5. Fill in name and password (6+ chars)
6. Click "Create Account"
7. **Expected**: Account created, redirects to `/my-teams.html`

### Test 4: Service Role Key Working
1. Enable RLS on `auth_users` table
2. Try Test 1 again
3. **Expected**: Should still work (service_role bypasses RLS)
4. If fails: Wrong key in Vercel (using anon instead of service_role)

## 📝 Deployment Checklist
Before deploying login fixes:
- [ ] Update redirect URLs (dashboard → my-teams)
- [ ] Test locally with `vercel dev`
- [ ] Update version badge
- [ ] Commit changes
- [ ] Push to GitHub
- [ ] Deploy: `vercel --prod`
- [ ] Test all 4 scenarios above on production
- [ ] Monitor logs for errors

## 🚨 Rollback Plan
If login breaks after deployment:
```bash
vercel rollback
```
Then investigate locally before redeploying.

---

**Last Updated**: 2026-04-28
**Status**: Login recognition working, redirect fix pending
