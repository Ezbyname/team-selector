# Expected Integration Test Results

**Purpose:** Template for sharing Postman execution results

---

## Format for Sharing Results

### ✅ If All Tests Pass

```
INTEGRATION TEST RESULTS
========================

Total Runs: 13
Passed: 13
Failed: 0
Pass Rate: 100%

All assertions passed:
✓ 1. Send OTP
✓ 1b. Send OTP - Invalid Phone
✓ 2. Verify OTP
✓ 2b. Verify OTP - Wrong Code
✓ 3. Register
✓ 3b. Register - Weak Password
✓ 4. Login
✓ 4b. Login - Wrong Password
✓ 5. Refresh Token
✓ 5b. Refresh - No Cookie
✓ 6. Logout
✓ 6b. Refresh After Logout

Database Verification:
- auth_users: 1 row
  - phone_normalized: +972509998888
  - password_hash: $2b$12$... (bcrypt confirmed)
  - role: user
  - phone_verified_at: 2026-04-21T...
- otp_codes: 1 row
  - code: 6 digits
  - verified_at: 2026-04-21T...
- auth_sessions: 0 rows (deleted after logout)

Status: ✅ ALL TESTS PASSED
```

---

### ❌ If Any Tests Fail

```
INTEGRATION TEST RESULTS
========================

Total Runs: 13
Passed: 10
Failed: 3
Pass Rate: 76.9%

FAILED REQUESTS:

1. Request: "3. Register"
   Status: 500 (expected 201)
   
   Failed Assertions:
   - ✗ Status code is 201
   - ✗ Response has success field
   
   Response Body:
   {
     "error": "insert or update on table \"auth_users\" violates foreign key constraint..."
   }
   
   Server Logs:
   [Error in Terminal 1 output]

2. Request: "5. Refresh Token"
   Status: 401 (expected 200)
   
   Failed Assertions:
   - ✗ Status code is 200
   - ✗ Response has new accessToken
   
   Response Body:
   {
     "error": "Invalid or expired refresh token"
   }

3. Request: "6b. Refresh After Logout"
   Status: 200 (expected 401)
   
   Failed Assertions:
   - ✗ Status code is 401
   
   Response Body:
   {
     "success": true,
     "user": {...}
   }
   
   Issue: Session not properly invalidated after logout

Database State:
- auth_users: 0 rows (registration failed)
- otp_codes: 1 row (OTP created but not consumed)
- auth_sessions: 1 row (session not deleted)

Status: ❌ FAILURES FOUND - AWAITING FIXES
```

---

## What to Include in Your Report

### Required Information

1. **Summary Counts**
   - Total Runs
   - Passed
   - Failed

2. **For Each Failed Request:**
   - Request name
   - Actual status code
   - Expected status code
   - Failed assertion names
   - Complete response body (JSON)

3. **Server Logs** (Terminal 1)
   - Any error messages
   - Stack traces
   - Database errors

4. **Database State**
   - Row counts for: auth_users, otp_codes, auth_sessions
   - Sample data (non-sensitive fields)

### Optional But Helpful

- Postman Console output
- Screenshots of Postman Runner results
- Screenshots of Supabase Table Editor

---

## Sample Failed Request Detail

```
Request: "3. Register"
Method: POST
URL: http://localhost:3000/api/auth/register
Status: 500 Internal Server Error

Request Body:
{
  "phone": "050-999-8888",
  "password": "TestPass123!",
  "displayName": "Integration Test User"
}

Response Body:
{
  "error": "Failed to create account"
}

Response Headers:
Content-Type: application/json; charset=utf-8
Date: Mon, 21 Apr 2026 20:15:30 GMT

Failed Assertions:
- ✗ Status code is 201 (got 500)
- ✗ Response has success field (not present)
- ✗ Response has user object (not present)

Console Output:
Error: Failed to create user: null value in column "phone" violates not-null constraint
  at /api/auth/register.js:45:12

Database State After:
- auth_users table: 0 rows
- otp_codes table: 1 row (verified_at set)
```

---

## Response Payload Samples

### Successful OTP Send (201)
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresAt": "2026-04-21T20:20:00.000Z",
  "otpCode": "123456"
}
```

### Successful Registration (201)
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "050-999-8888",
    "phoneNormalized": "+972509998888",
    "displayName": "Integration Test User",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Failed Login (401)
```json
{
  "error": "Invalid phone or password"
}
```

---

## Collection Updates Tracking

**If API behavior differs from Postman assumptions, I will:**

1. Document the mismatch:
   ```
   Expected: Response has "message" field
   Actual: Response has "msg" field
   ```

2. Update collection:
   ```javascript
   // Before
   pm.expect(jsonData).to.have.property('message');
   
   // After
   pm.expect(jsonData).to.have.property('msg');
   ```

3. Commit changes:
   ```
   Fix: Update Postman collection to match actual API response
   - Changed "message" to "msg" in assertions
   - Updated expected status code for duplicate registration (409 → 400)
   ```

4. Request re-run with updated collection

---

**When sharing results, copy-paste relevant sections from this template and fill in actual values.**
