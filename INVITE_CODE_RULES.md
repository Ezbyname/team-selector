# Invite Code Feature Rules

## Purpose
This document defines mandatory rules for the Join Team by Invite Code feature to ensure security, consistency, and correct error handling.

---

## Rule 1: HTTP Status Code Distinction

### CRITICAL: 403 vs 404 for Invite Codes

**Invalid Code (doesn't exist):**
- Status: `404 Not Found`
- Error: `"This invite code is invalid."`
- Meaning: Code was never created or doesn't exist in database

**Revoked/Inactive Code (exists but disabled):**
- Status: `403 Forbidden`
- Error: `"This invite code is no longer active."`
- Meaning: Code exists in database but `is_active = false`

**Expired Code (exists but past expiration):**
- Status: `403 Forbidden`
- Error: `"This invite code has expired."`
- Meaning: Code exists but `expires_at` is in the past

### Implementation Pattern

```javascript
// CORRECT: Query without is_active filter first
const invite = await supabase
  .from('group_invites')
  .select('*')
  .eq('code', normalizedCode)
  .single();

// Then check in order:
if (!invite) {
  return res.status(404).json({
    success: false,
    error: "This invite code is invalid."
  });
}

if (!invite.is_active) {
  return res.status(403).json({
    success: false,
    error: "This invite code is no longer active."
  });
}

if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
  // Auto-deactivate
  await supabase
    .from('group_invites')
    .update({ is_active: false })
    .eq('id', invite.id);

  return res.status(403).json({
    success: false,
    error: "This invite code has expired."
  });
}
```

**WHY:** Users need to distinguish between "wrong code" (404) and "code was revoked" (403).

**NEVER:**
- ❌ Filter by `.eq('is_active', true)` in the initial query
- ❌ Return 404 for revoked codes
- ❌ Return same error message for different failure reasons

---

## Rule 2: Error Response Format

### All Error Responses MUST Include `success: false`

```json
{
  "success": false,
  "error": "Clear error message here"
}
```

### Success Responses MUST Include `success: true`

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}
```

### All Responses MUST Be JSON

- ✅ Always return `Content-Type: application/json`
- ❌ NEVER return HTML error pages
- ❌ NEVER expose stack traces in production
- ❌ NEVER return `text/plain` errors

**WHY:** Consistent response format allows frontend to handle errors uniformly.

---

## Rule 3: Database Constraints

### Only ONE Active Code Per Group

**Implementation:**
```sql
-- CORRECT: Partial unique index
CREATE UNIQUE INDEX unique_active_code_per_group
ON group_invites(group_id) WHERE is_active = true;
```

**NEVER:**
```sql
-- WRONG: Table-level constraint
CONSTRAINT unique_active_code_per_group UNIQUE (group_id, is_active)
-- This only allows ONE inactive code per group!
```

**WHY:** Groups need multiple historical codes (revoked), but only ONE active code at a time.

### Code Format

- Pattern: `TEAMNAME-XXXX`
- Example: `ATLIT-4829`, `BASKET-A1B2`
- Prefix: First 6 letters of team name (uppercase, letters only)
- Suffix: 4 random alphanumeric characters (uppercase)
- Total: 7-11 characters including hyphen

---

## Rule 4: Security Requirements

### Defense in Depth

Even if SQL filters by `is_active`, ALWAYS check in code:

```javascript
// SQL level (but NOT on initial query for 403/404 distinction)
// Only filter after determining code exists

// Code level (always check)
if (!invite.is_active) {
  return res.status(403).json(...);
}
```

### Input Validation

**Code Normalization:**
```javascript
const normalizedCode = code.toUpperCase().trim();
```

**Prevent Injection:**
- ✅ Use parameterized queries (Supabase client)
- ✅ Validate UUID format for groupId
- ✅ Never concatenate user input into SQL
- ✅ Escape special characters if needed

### Authentication

**All invite endpoints require JWT:**
```javascript
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({
    success: false,
    error: "Unauthorized"
  });
}
```

**Admin-only operations:**
- Creating invite codes: Only team admin (created_by)
- Revoking invite codes: Only team admin
- Joining via code: Any authenticated user

---

## Rule 5: Role Safety

### Joining via Invite ALWAYS Creates role="user"

```javascript
// CORRECT: Hardcoded role
.insert({
  group_id: groupId,
  user_id: userId,
  role: 'user',  // ALWAYS user, never admin
  status: 'active'
})
```

**NEVER:**
- ❌ Allow role parameter in request body
- ❌ Copy role from existing membership
- ❌ Inherit role from invite creator
- ❌ Allow privilege escalation via invite

**WHY:** Only team admins can assign admin/sub-admin roles manually through team management UI.

---

## Rule 6: Duplicate Membership Prevention

### Check Before Creating

```javascript
const existingMembership = await supabase
  .from('group_members')
  .select('id, role, status')
  .eq('group_id', groupId)
  .eq('user_id', userId)
  .single();

if (existingMembership) {
  if (existingMembership.status === 'active') {
    return res.status(409).json({
      success: false,
      error: "You are already a member of this team.",
      group: { ... }  // Include group details for UX
    });
  } else {
    // Reactivate removed membership
    // Reset role to 'user'
  }
}
```

**Status Code:** `409 Conflict` for duplicate membership

**WHY:** Prevents duplicate rows, maintains data integrity.

---

## Rule 7: Revoke Implementation

### Deactivate ALL Active Codes

```javascript
const { data: updatedRows } = await supabase
  .from('group_invites')
  .update({ is_active: false })
  .eq('group_id', groupId)
  .eq('is_active', true)
  .select();

return res.status(200).json({
  success: true,
  message: "All invite codes revoked successfully",
  revokedCount: updatedRows?.length || 0
});
```

**Idempotent:** Success even if no codes to revoke.

**NEVER:**
- ❌ Return error if no active codes found
- ❌ Delete codes (keep history)
- ❌ Only deactivate latest code

**WHY:** Revoke should disable ALL active codes for security.

---

## Rule 8: Expiration Handling

### Optional Feature

Expiration is **optional**. If `expires_at` is NULL, code never expires.

```javascript
if (invite.expires_at) {
  const expiresAt = new Date(invite.expires_at);
  const now = new Date();

  if (expiresAt <= now) {
    // Auto-deactivate
    await supabase
      .from('group_invites')
      .update({ is_active: false })
      .eq('id', invite.id);

    return res.status(403).json({
      success: false,
      error: "This invite code has expired."
    });
  }
}
```

**Auto-Deactivate:** When expired code is used, set `is_active = false`.

**WHY:** Prevents reusing expired codes, maintains audit trail.

---

## Rule 9: Testing Requirements

### Feature is NOT Complete Without Tests

**Minimum Test Coverage:**
- ✅ 35+ business logic tests
- ✅ 60+ API protocol tests
- ✅ 100% pass rate required
- ✅ All error scenarios tested
- ✅ Security vulnerabilities tested

**Required Test Scenarios:**
1. Admin can create codes
2. Non-admin cannot create codes (403)
3. Valid code allows join
4. Invalid code returns 404
5. Revoked code returns 403
6. Expired code returns 403
7. Duplicate membership returns 409
8. Role always "user"
9. Per-team role isolation
10. Authentication required (401)
11. SQL injection prevented
12. XSS prevented

**Test Command:**
```bash
npm run test:invite-codes
```

**Acceptance Criteria:**
```
Total Tests: 99
Passed: 99
Failed: 0
Pass Rate: 100.0%
```

**WHY:** Tests prevent regressions and verify security requirements.

---

## Rule 10: Code Normalization

### Always Uppercase and Trim

```javascript
const normalizedCode = code.toUpperCase().trim();
```

**Case-Insensitive Matching:**
- User enters: `atlit-4829`
- Normalized: `ATLIT-4829`
- Database lookup: Matches `ATLIT-4829`

**Whitespace Handling:**
- User enters: `  ATLIT-4829  `
- Normalized: `ATLIT-4829`
- Works correctly

**WHY:** User-friendly input handling, prevents "code doesn't work" support issues.

---

## Rule 11: Error Messages

### User-Friendly and Specific

**CORRECT:**
- ✅ "This invite code is invalid."
- ✅ "This invite code is no longer active."
- ✅ "This invite code has expired."
- ✅ "You are already a member of this team."
- ✅ "Only team admin can create invite codes."

**NEVER:**
- ❌ "Error"
- ❌ "Invalid request"
- ❌ "Database error"
- ❌ "Something went wrong"
- ❌ Technical error messages
- ❌ Stack traces

**WHY:** Users need actionable feedback, not technical jargon.

---

## Rule 12: Creating New Codes

### Deactivate Old Codes First

```javascript
// Step 1: Deactivate existing active codes
await supabase
  .from('group_invites')
  .update({ is_active: false })
  .eq('group_id', groupId)
  .eq('is_active', true);

// Step 2: Create new code
await supabase
  .from('group_invites')
  .insert({
    group_id: groupId,
    code: newCode,
    created_by: userId,
    is_active: true
  });
```

**WHY:** Ensures only ONE active code per group (enforced by unique index).

---

## Rule 13: Response Consistency

### All Endpoints Use Same Pattern

**Success:**
```json
{
  "success": true,
  "message": "Action completed",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Clear message"
}
```

**CORS Headers:** All endpoints must include:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
```

**WHY:** Frontend can handle responses uniformly.

---

## Rule 14: Database Schema Integrity

### Required Columns

**group_invites table:**
- `id` (UUID, primary key)
- `group_id` (UUID, foreign key to groups)
- `code` (TEXT, unique)
- `created_by` (UUID, foreign key to auth_users)
- `is_active` (BOOLEAN, default true)
- `created_at` (TIMESTAMPTZ, default NOW())
- `expires_at` (TIMESTAMPTZ, nullable)

### Indexes

**Performance:**
```sql
CREATE INDEX idx_group_invites_code 
ON group_invites(code) 
WHERE is_active = true;
```

**Integrity:**
```sql
CREATE UNIQUE INDEX unique_active_code_per_group
ON group_invites(group_id) 
WHERE is_active = true;
```

---

## Rule 15: Audit and History

### Never Delete Invite Codes

**CORRECT:**
- ✅ Set `is_active = false` when revoking
- ✅ Keep historical codes in database
- ✅ Allow querying old codes for audit

**NEVER:**
- ❌ DELETE from group_invites
- ❌ Permanently remove codes
- ❌ Lose audit trail

**WHY:** Need history for debugging, auditing, and analytics.

---

## Enforcement

### Pre-Commit Checks

Before merging invite code changes:

1. ✅ All 99 tests pass
2. ✅ 403/404 distinction correct
3. ✅ All responses return JSON with success field
4. ✅ Security checks pass (no SQL injection, XSS)
5. ✅ Error messages are user-friendly
6. ✅ Role safety enforced (always "user")
7. ✅ Database constraints correct

### CI/CD Pipeline

```bash
npm run test:invite-codes
npm run test:invite-codes-api
```

Must pass before deploy.

---

## Summary

| Rule | Status | Critical |
|------|--------|----------|
| 403 vs 404 distinction | ✅ | 🔴 YES |
| Error response format | ✅ | 🔴 YES |
| Database constraints | ✅ | 🔴 YES |
| Security validation | ✅ | 🔴 YES |
| Role safety | ✅ | 🔴 YES |
| Duplicate prevention | ✅ | 🔴 YES |
| Revoke implementation | ✅ | 🟡 Important |
| Expiration handling | ✅ | 🟢 Optional |
| Testing requirements | ✅ | 🔴 YES |
| Code normalization | ✅ | 🟡 Important |
| Error messages | ✅ | 🟡 Important |
| Create flow | ✅ | 🔴 YES |
| Response consistency | ✅ | 🟡 Important |
| Schema integrity | ✅ | 🔴 YES |
| Audit trail | ✅ | 🟡 Important |

---

## Violations

**If you violate these rules:**

❌ Tests will fail  
❌ Security vulnerabilities introduced  
❌ Poor user experience  
❌ Data integrity issues  
❌ Support burden increases  

**Follow these rules strictly for production-ready code.**

---

Last Updated: 2026-04-24  
Feature Status: **Production Ready** ✅  
Test Pass Rate: **100%** ✅
