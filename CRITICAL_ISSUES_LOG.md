# Critical Issues Log & Future Rules

This document tracks all critical issues found in the codebase and establishes rules to prevent similar issues in the future.

---

## Issue #1: Authentication Flow Blocking on Existing Users

**Date**: 2026-04-23  
**Severity**: CRITICAL - Blocks all existing users from logging in  
**Status**: ✅ FIXED

### Problem Description

When a user enters a phone number that is already registered:
1. API returned 409 status with error "Phone number already registered"
2. UI showed this as a blocking error message
3. App entered infinite loading state
4. User could not proceed to login - completely stuck

### Root Causes

1. **API Design Flaw**: `send-otp` endpoint treated existing users as an error case (409 Conflict)
2. **Frontend Logic Flaw**: UI did not handle "user already exists" as a valid flow transition
3. **Missing Loading State Management**: Loading states were not reset on all error paths
4. **Poor UX**: No clear path for returning users to login

### Fix Applied

**Backend** (`api/auth/send-otp.js`):
```javascript
// BEFORE (WRONG):
if (existingUser) {
  return res.status(409).json({ error: 'Phone number already registered' });
}

// AFTER (CORRECT):
if (existingUser) {
  return res.status(200).json({
    success: true,
    userExists: true,
    message: 'Welcome back! Please login with your password.',
  });
}
```

**Frontend** (`login.html`):
```javascript
// Added userExists check
if (data.userExists) {
  // Skip OTP, go directly to login
  document.getElementById('loginPhoneDisplay').textContent = currentPhone;
  showScreen('loginScreen');
  document.getElementById('loginPasswordInput').focus();
} else {
  // New user - proceed to OTP
  showScreen('otpScreen');
}
```

**Loading States**:
- Added `disabled` state management for all submit buttons
- Always reset `disabled = false` and button text in ALL error paths
- Added "Sending...", "Verifying...", "Logging in..." feedback

### Impact

- **Before**: 100% of returning users completely blocked
- **After**: Seamless flow for both new and returning users

---

## Issue #2: Ungraded Player Rating Logic

**Date**: 2026-04-22  
**Severity**: HIGH - Incorrect team balancing for ungraded players  
**Status**: ✅ FIXED

### Problem Description

Ungraded players were all assigned `finalRating = 5` instead of using their individual `default_rating` values from the database.

### Root Cause

Incorrect use of JavaScript `||` operator in rating assignment:
```javascript
// WRONG:
finalRating: p.final_rating || p.default_rating || 5
// When final_rating is 5, the || treats it as falsy for some edge cases
```

### Fix Applied

```javascript
// CORRECT:
finalRating: (p.grader_count > 0) ? p.final_rating : p.default_rating
```

Explicit check ensures:
- Graded players (grader_count > 0) use calculated final_rating
- Ungraded players (grader_count = 0) use their individual default_rating

---

## Issue #3: Vercel Hobby Plan Function Limit

**Date**: 2026-04-23  
**Severity**: MEDIUM - Blocks free deployment  
**Status**: ⚠️ WORKAROUND APPLIED

### Problem Description

Vercel Hobby plan allows maximum 12 serverless functions. App had 22+ individual endpoint files.

### Fix Applied

Consolidated endpoints into 6 route handlers:
- `api/auth/index.js` - handles all /api/auth/* routes
- `api/admin/index.js` - handles all /api/admin/* routes
- `api/ratings/index.js` - handles all /api/ratings/* routes
- `api/groups/index.js` - handles all /api/groups/* routes
- `api/players/index.js` - handles all /api/players/* routes
- `api/sessions/index.js` - handles all /api/sessions/* routes

**Note**: Still exceeds limit due to other files. Requires Pro plan or alternative hosting.

---

## RULES FOR FUTURE DEVELOPMENT

### 🔴 RULE #1: Never Treat Valid User States as Errors

**Context**: Authentication, user flows, state management

**Rule**: A user already being registered is NOT an error - it's a valid state that should trigger a different flow.

**Examples**:
- ✅ User exists → redirect to login (200 OK with `userExists: true`)
- ❌ User exists → return 409 error

**Apply to**:
- Registration flows
- Account state checks
- Resource existence checks that have valid alternate paths

---

### 🔴 RULE #2: Always Reset Loading States in ALL Code Paths

**Context**: Async operations, form submissions, API calls

**Rule**: Every async operation MUST reset loading state in:
1. Success path
2. Error path
3. Exception/catch path
4. Finally block (preferred)

**Template**:
```javascript
const submitBtn = form.querySelector('button[type="submit"]');
const originalText = submitBtn.textContent;

// Set loading state
submitBtn.disabled = true;
submitBtn.textContent = 'Loading...';

try {
  const response = await fetch(...);
  const data = await response.json();
  
  if (!response.ok) {
    showError(data.error);
    // CRITICAL: Reset loading state
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }
  
  // Success logic...
  submitBtn.disabled = false;
  submitBtn.textContent = originalText;
  
} catch (error) {
  showError('Network error');
  // CRITICAL: Reset loading state
  submitBtn.disabled = false;
  submitBtn.textContent = originalText;
}
```

---

### 🔴 RULE #3: Explicit Type Checks Over Falsy Operators

**Context**: Rating systems, nullable values, zero/false as valid values

**Rule**: When 0, false, or empty string are valid values, use explicit checks instead of `||` operator.

**Examples**:
```javascript
// ❌ WRONG: Treats 0 as falsy
const rating = player.rating || 5;  // If rating is 0, returns 5!

// ✅ CORRECT: Explicit null check
const rating = player.rating != null ? player.rating : 5;

// ✅ CORRECT: Condition-based
const rating = player.graded ? player.calculatedRating : player.defaultRating;
```

---

### 🔴 RULE #4: UX Should Guide Users, Not Block Them

**Context**: Error messages, user flows

**Rule**: Distinguish between:
1. **Blocking errors**: Technical failures, validation errors
2. **State transitions**: User exists, already completed action, etc.

**Examples**:
- ✅ "Welcome back! Please enter your password" (state transition)
- ❌ "Error: Phone already registered" (blocking error for valid state)

**Apply to**:
- Authentication flows
- Form submissions
- Resource state checks

---

### 🔴 RULE #5: Test Both Happy Path AND Error Paths

**Context**: All features with user interaction

**Rule**: Every user flow must be tested for:
1. **Happy path**: Everything works
2. **Error path**: Network failure, validation error
3. **Edge cases**: User exists, duplicate action, empty state
4. **Loading states**: Verify UI can't get stuck

**Checklist**:
- [ ] Happy path works
- [ ] Network error handled
- [ ] Validation errors displayed
- [ ] Loading states reset
- [ ] Edge cases covered
- [ ] No infinite loading possible

---

### 🔴 RULE #6: API Responses Should Be Predictable

**Context**: API design, status codes

**Rule**: Use consistent response structure:

```javascript
// Success response
{
  success: true,
  data: { ... },
  message: "Optional user-facing message"
}

// Error response (4xx/5xx status)
{
  success: false,
  error: "User-facing error message",
  code: "MACHINE_READABLE_CODE" // optional
}

// Success with state info (still 200 OK)
{
  success: true,
  userExists: true,  // State flag
  message: "Welcome back!"
}
```

**Never**:
- Mix error messages in success responses
- Return 2xx for actual failures
- Return 4xx/5xx for valid state transitions

---

### 🔴 RULE #7: Function Consolidation for Serverless Limits

**Context**: Vercel/serverless deployment

**Rule**: Design for 12-function limit from the start:
1. Group related endpoints under single handler
2. Use path-based routing within handlers
3. Plan for free tier constraints

**Structure**:
```
api/
  auth/
    index.js  → handles /api/auth/*
  admin/
    index.js  → handles /api/admin/*
  ...
```

---

### 🔴 RULE #8: Focus State on User First

**Context**: Form UX, accessibility

**Rule**: After state transitions, set focus to next expected input:

```javascript
if (userExists) {
  showScreen('loginScreen');
  document.getElementById('loginPasswordInput').focus();  // ← Focus
}
```

**Benefits**:
- Keyboard users don't get lost
- Faster form completion
- Clear visual indication of next step

---

### 🔴 RULE #9: Log Issues Immediately

**Context**: Bug tracking, documentation

**Rule**: When a critical bug is found and fixed:
1. Document the issue in CRITICAL_ISSUES_LOG.md
2. Extract general rule to prevent recurrence
3. Add to checklist for similar features

**Format**:
```markdown
## Issue #N: [Brief Title]
**Date**: YYYY-MM-DD
**Severity**: CRITICAL/HIGH/MEDIUM/LOW
**Status**: ✅ FIXED / ⚠️ WORKAROUND / ❌ OPEN

### Problem Description
[What went wrong]

### Root Cause
[Why it happened]

### Fix Applied
[How it was fixed]

### Rule Extracted
[General principle to prevent recurrence]
```

---

### 🔴 RULE #10: Integration Tests for Critical Flows

**Context**: Authentication, payment, data integrity

**Rule**: Critical user flows MUST have integration tests covering:
1. New user registration
2. Existing user login
3. Error scenarios (wrong password, expired OTP)
4. Edge cases (duplicate registration attempt)

**Example test**:
```javascript
// Test: Existing user can login
1. Register user with phone X
2. Try to "register" again with phone X
3. ASSERT: Redirects to login (not error)
4. Enter password
5. ASSERT: Successfully logged in
```

---

## CHECKLIST: New Authentication Flow

Use this checklist when implementing or modifying auth flows:

- [ ] Happy path: new user can register
- [ ] Happy path: existing user can login
- [ ] Existing user entering phone goes to login (not error)
- [ ] Wrong password shows error and resets loading state
- [ ] Network error shows message and resets loading state
- [ ] Expired OTP handled gracefully
- [ ] Loading states reset in ALL error paths
- [ ] Focus moves to next input after state transition
- [ ] No infinite loading possible
- [ ] Button text provides feedback ("Sending...", "Verifying...")
- [ ] Error messages are user-friendly, not technical
- [ ] Integration test covers new + existing user flow

---

## CHECKLIST: New API Endpoint

Use this checklist when creating new API endpoints:

- [ ] Consistent response structure (success/error format)
- [ ] Valid state transitions return 2xx (not 4xx)
- [ ] Error states return 4xx/5xx with user-friendly message
- [ ] Loading/pending states considered
- [ ] Input validation with clear error messages
- [ ] Explicit type checks (not || for nullable/zero values)
- [ ] Grouped with related endpoints (for function count limit)
- [ ] Environment variables validated
- [ ] Error logging for debugging
- [ ] Integration test covers happy + error paths

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-23 | Initial creation with Issues #1-3, Rules #1-10 |

---

## MAINTAINERS

Update this document whenever:
1. A critical bug is found and fixed
2. A new rule is identified
3. An existing rule needs clarification
4. A checklist needs expansion

**Never delete historical issues** - they serve as learning examples.
