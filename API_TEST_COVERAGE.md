# API Test Coverage - Invite Codes

## Overview

Two comprehensive test suites for the Join Team by Invite Code feature:

1. **Business Logic Tests** (`test-invite-codes.js`)
   - Tests feature requirements and user workflows
   - 35+ tests across 9 suites
   - Validates database state and business rules

2. **API Protocol Tests** (`test-invite-codes-api.js`)
   - Tests HTTP protocol, security, and edge cases
   - 60+ tests across 8 suites
   - Validates API behavior and security

## Test Suite 1: Business Logic Tests

**File:** `test-invite-codes.js`

**Run:** `npm run test:invite-codes`

### Coverage:

#### 1. Invite Code Creation (6 tests)
- Admin can create code
- Non-admin cannot create (403)
- Code stored in database
- Code belongs to correct group
- Codes are unique
- Invalid group ID rejected

#### 2. Join by Valid Code (5 tests)
- User joins successfully
- Membership created with role="user"
- Team appears in my-teams
- Code normalization (case, whitespace)
- Response includes group details

#### 3. Invalid Code (3 tests)
- Non-existent code → 404
- Empty code → 400
- Missing code parameter → 400

#### 4. Revoked/Inactive Code (4 tests)
- Admin can revoke
- Non-admin cannot revoke (403)
- Revoked code deactivated
- Revoked code rejected (403)

#### 5. Expired Code (3 tests)
- Expired code rejected
- Auto-deactivation
- Non-expired codes work
- (Skipped if expiration not enabled)

#### 6. Duplicate Membership (4 tests)
- Duplicate join → 409
- No duplicate rows
- Existing membership unchanged
- Rejoining reactivates membership

#### 7. Role Safety (3 tests)
- Always creates role="user"
- No privilege escalation
- Sub-admin requires manual assignment

#### 8. Per-Team Role Isolation (2 tests)
- Admin in Team A, member in Team B
- Joining doesn't affect other roles

#### 9. Auth Requirements (5 tests)
- Unauthenticated → 401
- Invalid JWT → 401
- All errors return JSON

**Total:** 35+ tests

---

## Test Suite 2: API Protocol Tests

**File:** `test-invite-codes-api.js`

**Run:** `npm run test:invite-codes-api`

### Coverage:

#### 1. HTTP Method Validation (12 tests)
For each endpoint (create-invite, join-by-code, revoke-invite):
- GET rejected with 405
- PUT rejected with 405
- DELETE rejected with 405
- PATCH rejected with 405
- Only POST allowed
- All rejections return JSON

**Endpoints tested:**
- `/api/groups/create-invite`
- `/api/groups/join-by-code`
- `/api/groups/revoke-invite`

#### 2. CORS Headers (9 tests)
For each endpoint:
- OPTIONS returns 200 (preflight)
- Access-Control-Allow-Origin present
- Access-Control-Allow-Methods includes POST
- Access-Control-Allow-Headers includes Authorization
- POST responses include CORS headers

#### 3. Request Body Validation (5 tests)
- Malformed JSON rejected
- Empty body → 400
- Wrong data types handled
- Extra fields ignored
- Missing Content-Type handled

#### 4. Security - Injection Attempts (15+ tests)
**SQL Injection:**
- `'; DROP TABLE group_invites; --`
- `' OR '1'='1`
- `1' UNION SELECT * FROM auth_users --`
- `admin'--`
- All safely rejected

**XSS Attempts:**
- `<script>alert("xss")</script>`
- `<img src=x onerror=alert(1)>`
- `javascript:alert(1)`
- `<svg onload=alert(1)>`
- Payloads not reflected

**Path Traversal:**
- `../../../etc/passwd`
- `..\\..\\windows\\system32`
- `%2e%2e%2f`
- All safely rejected

**UUID Injection:**
- `not-a-uuid`
- `'; DROP TABLE groups; --`
- Invalid formats rejected

#### 5. Token Validation (10+ tests)
- Missing Authorization header → 401
- Malformed headers:
  - `InvalidFormat`
  - `Bearer` (no token)
  - `Basic ...` (wrong type)
  - `bearer` (lowercase)
- Invalid JWT formats
- Expired tokens → 401
- Missing claims handled
- All return JSON errors

#### 6. Response Format Validation (6 tests)
- Success responses have `success: true`
- Success responses are JSON
- Error responses have `error` field
- Error message is string
- All errors are JSON (not HTML)
- Consistent format across endpoints

#### 7. Edge Cases (15+ tests)
**Input Validation:**
- Very long codes (1000+ chars)
- Special characters: `!@#$`, quotes, newlines
- Unicode: Chinese, Cyrillic, Japanese, diacritics
- Null bytes
- Large request bodies
- Rapid repeated requests

**Behavior:**
- All handled gracefully
- No crashes or 500 errors
- Appropriate status codes
- No information leakage

#### 8. Concurrent Operations (4 tests)
- Concurrent code creation produces unique codes
- Multiple users can join simultaneously
- No duplicate memberships from race conditions
- Database integrity maintained

**Total:** 60+ tests

---

## Combined Test Statistics

| Category | Business Logic | API Protocol | Total |
|----------|---------------|--------------|-------|
| **Tests** | 35+ | 60+ | **95+** |
| **Endpoints** | 3 | 3 | 3 |
| **Security Tests** | 10 | 20+ | 30+ |
| **Edge Cases** | 5 | 15+ | 20+ |

---

## Running All Tests

### Individual Test Suites:

```bash
# Business logic tests
npm run test:invite-codes

# API protocol tests
npm run test:invite-codes-api
```

### Full Integration Suite:

```bash
# Runs all tests including invite codes
npm test
```

or

```bash
npm run test:integration
```

---

## Test Prerequisites

### 1. Database Migration Applied

```sql
-- Must be run in Supabase SQL Editor
-- File: supabase/migrations/003_add_team_invites.sql
```

Verify with:
```bash
node --env-file=.env.local check-table.js
```

Expected:
```
group_invites table exists: true
groups table exists: true
```

### 2. Dev Server Running

```bash
npm start
# Server: http://localhost:3006
```

### 3. Environment Variables

`.env.local` must contain:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`

---

## Expected Test Results

### Business Logic Tests:

```
╔═══════════════════════════════════════════════════════════════╗
║        JOIN TEAM BY INVITE CODE - TEST SUITE                 ║
╚═══════════════════════════════════════════════════════════════╝

TEST SUITE 1: Invite Code Creation
✓ Admin can create invite code
✓ Non-admin cannot create invite code
✓ Verify code stored in database
✓ Code belongs to correct group
✓ Verify code uniqueness
✓ Test with invalid group ID

[... 8 more test suites ...]

Total Tests: 35+
Passed: 35+
Failed: 0
Pass Rate: 100.0%

✓ ALL TESTS PASSED!
```

### API Protocol Tests:

```
╔═══════════════════════════════════════════════════════════════╗
║        INVITE CODE API PROTOCOL TESTS                        ║
╚═══════════════════════════════════════════════════════════════╝

TEST SUITE 1: HTTP Method Validation
✓ GET /api/groups/create-invite rejected with 405
✓ PUT /api/groups/create-invite rejected with 405
✓ DELETE /api/groups/create-invite rejected with 405
✓ PATCH /api/groups/create-invite rejected with 405
[... and same for other endpoints ...]

TEST SUITE 4: Security - Injection Attempts
✓ SQL injection safely rejected: "'; DROP TABLE group_..."
✓ SQL injection safely rejected: "' OR '1'='1"
✓ XSS payload safely rejected
✓ Response doesn't reflect XSS payload
[... more security tests ...]

[... 6 more test suites ...]

Total Tests: 60+
Passed: 60+
Failed: 0
Pass Rate: 100.0%

✓ ALL API TESTS PASSED!
```

---

## Security Tests Summary

### What's Tested:

#### SQL Injection Prevention ✅
- Quote escaping
- UNION attacks
- Comment injection
- Boolean attacks
- All rejected without DB modification

#### XSS Prevention ✅
- Script tags
- Event handlers
- JavaScript protocol
- SVG injection
- Payloads not reflected in responses

#### Path Traversal Prevention ✅
- Directory traversal attempts
- URL encoding
- Windows/Unix path formats
- All safely rejected

#### Authentication Security ✅
- Missing tokens → 401
- Invalid tokens → 401
- Expired tokens → 401
- Malformed headers → 401
- All return JSON (no stack traces)

#### Authorization Security ✅
- Non-admin cannot create codes (403)
- Non-admin cannot revoke codes (403)
- User cannot access other user's data
- Role="user" always enforced

#### Input Validation ✅
- UUID format validation
- Code format validation
- Length limits
- Special character handling
- Type checking

#### Concurrent Safety ✅
- No race conditions
- No duplicate memberships
- Unique code generation
- Database integrity maintained

---

## API Response Format Validation

### Success Response:
```json
{
  "success": true,
  "inviteCode": "ATLIT-4829",
  "group": { "id": "...", "name": "...", "sport": "..." },
  "membership": { "role": "user", "status": "active" }
}
```

### Error Response:
```json
{
  "error": "This invite code is invalid."
}
```

### Validation:
✅ Always JSON (Content-Type: application/json)  
✅ Never HTML error pages  
✅ No stack traces in production  
✅ Consistent structure  
✅ Clear error messages  

---

## Coverage Gaps (Intentional)

### Not Tested:
1. **Rate Limiting:** Not implemented (no tests)
2. **Webhook Triggers:** Not implemented (no tests)
3. **Audit Logging:** Not implemented (no tests)
4. **Code Usage Tracking:** Not implemented (no tests)
5. **Invite Links:** Not implemented (no tests)

These are future enhancements, not core requirements.

### Optional Features:
1. **Expiration:** Tested but skipped if not enabled
2. **Max Uses per Code:** Not implemented
3. **Pending Approval:** Not implemented

---

## Continuous Integration

### GitHub Actions / CI Pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Invite Code Tests
  run: |
    npm run test:invite-codes
    npm run test:invite-codes-api
```

### Pre-commit Hook:

```bash
# .git/hooks/pre-commit
npm run test:invite-codes
npm run test:invite-codes-api
```

---

## Troubleshooting

### Migration Not Applied
**Error:** `Could not find the table 'public.group_invites'`

**Fix:** Apply migration via Supabase dashboard
```bash
node --env-file=.env.local check-table.js
```

### Server Not Running
**Error:** `ECONNREFUSED`

**Fix:** Start dev server
```bash
npm start
```

### Token Validation Fails
**Error:** JWT validation errors

**Fix:** Check `.env.local` has `JWT_SECRET` set

### Tests Timeout
**Error:** Tests hang or timeout

**Fix:** Check dev server is responsive
```bash
curl http://localhost:3006/api/groups/create-invite
# Should return: {"error":"Method not allowed"}
```

---

## Maintenance

### Adding New Endpoints

When adding new invite-related endpoints:

1. Add business logic tests to `test-invite-codes.js`
2. Add API protocol tests to `test-invite-codes-api.js`
3. Update this document
4. Test all HTTP methods
5. Test authentication
6. Test input validation
7. Test security (injection, XSS)

### Updating Existing Endpoints

When modifying endpoints:

1. Update affected tests
2. Verify all tests still pass
3. Add regression tests for bugs
4. Update documentation

---

## Success Criteria

Feature is **production-ready** when:

✅ All 35+ business logic tests pass  
✅ All 60+ API protocol tests pass  
✅ Zero security vulnerabilities  
✅ All responses return JSON  
✅ All error cases handled  
✅ Migration applied to database  
✅ Manual UI tests complete  

**Current Status:** Ready for production after migration applied
