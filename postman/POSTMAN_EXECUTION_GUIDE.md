# Postman Collection - Execution Guide

**Purpose:** Execute Phase 1 authentication integration tests

---

## Setup (One-Time)

### 1. Import Collection

1. Open Postman
2. Click **Import** (top left)
3. Drag and drop: `Team-Selector-Auth.postman_collection.json`
4. Verify imported: "Team Selector - Authentication API" appears in Collections

### 2. Import Environment

1. Click **Environments** (left sidebar)
2. Click **Import**
3. Drag and drop: `Team-Selector.postman_environment.json`
4. Verify imported: "Team Selector - Local Development" appears

### 3. Configure Environment

1. Click on "Team Selector - Local Development" environment
2. Update these values (you'll get them after creating Supabase project):
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJhbGci...` (from Supabase dashboard)
   - `SUPABASE_SERVICE_KEY`: `eyJhbGci...` (from Supabase dashboard)
3. Leave other values as defaults
4. Click **Save**

### 4. Select Environment

1. Click dropdown in top right (next to eye icon)
2. Select **"Team Selector - Local Development"**

---

## Execution

### Option A: Collection Runner (Recommended)

**Runs all tests in sequence automatically**

1. Click on "Team Selector - Authentication API" collection
2. Click **Run** button (or press Ctrl+Alt+R)
3. Runner window opens
4. Click **Run Team Selector - Authentication API**
5. Watch tests execute in real-time
6. Review results

**Expected Output:**
```
Total Runs: 13
Passed: 13
Failed: 0
```

### Option B: Manual Execution (For Debugging)

**Run one request at a time**

1. Expand "Team Selector - Authentication API" collection
2. Click **"1. Send OTP"**
3. Click **Send**
4. Review response
5. Check **Test Results** tab (assertions)
6. Repeat for each request in order

**Important:** Requests must run in order (1, 2, 3, 4, 5, 6) because they depend on each other (OTP code, user ID, tokens, etc.)

---

## Understanding Results

### Test Results Tab

Each request shows:
- ✅ **PASS** - Assertion succeeded
- ❌ **FAIL** - Assertion failed (see details)

### Response Body Tab

Shows actual API response:
```json
{
  "success": true,
  "user": {...},
  "accessToken": "eyJhbGci..."
}
```

### Console Tab

Shows:
- Extracted variables (OTP codes, tokens)
- Debug messages
- Request/response details

---

## Common Issues

### Issue: "Error: getaddrinfo ENOTFOUND localhost"

**Solution:** 
- Server not running
- Run: `npm run dev` in project directory
- Wait for "Ready! Available at http://localhost:3000"

### Issue: "401 Unauthorized" on all requests

**Solution:**
- Environment not selected
- Check dropdown (top right) - should show "Team Selector - Local Development"

### Issue: "Refresh Token" test fails with 401

**Solution:**
- This is expected if not running in sequence
- Refresh token is extracted from previous login request
- Run full collection from beginning

### Issue: OTP_CODE variable is empty

**Solution:**
- Ensure NODE_ENV=development in environment
- Check response from "1. Send OTP" - should have `otpCode` field
- If using production/Twilio, manually set OTP_CODE variable

---

## Maintenance

### When Endpoints Change

1. **Update Request:**
   - Edit request method/URL/body
   - Save changes

2. **Update Tests:**
   - Click **Tests** tab in request
   - Modify JavaScript assertions
   - Save changes

3. **Re-Run:**
   - Execute collection again
   - Verify all tests pass

### When New Endpoint Added

1. **Add Request:**
   - Right-click collection → Add Request
   - Configure method, URL, body, headers
   
2. **Add Tests:**
   - Click **Tests** tab
   - Write assertions (follow existing pattern)

3. **Order:**
   - Drag to correct position in sequence
   - Consider dependencies (auth tokens, etc.)

---

## Exporting Results

### JSON Results

1. After runner completes
2. Click **Export Results**
3. Save as: `test-results-YYYY-MM-DD.json`
4. Share this file

### Screenshots

1. After runner completes
2. Screenshot showing:
   - Total runs
   - Passed/Failed counts
   - Individual test results
3. Share screenshot

---

## Troubleshooting

### All Tests Fail Immediately

Check:
- [ ] Server running (`npm run dev`)
- [ ] Environment selected
- [ ] BASE_URL correct (`http://localhost:3000`)
- [ ] No typos in environment values

### Specific Test Fails

1. Click on failed request
2. Check **Test Results** tab - which assertion failed?
3. Check **Response Body** - what did API return?
4. Check **Console** - any error messages?
5. Share these details for debugging

### Database Errors

If you see "relation does not exist" or similar:
- Schema not deployed to Supabase
- Go to Supabase SQL Editor
- Run `supabase/migrations/001_initial_schema.sql`

---

## Success Criteria

**Phase 1 Integration Tests Pass When:**

✅ All 13 requests return expected status codes  
✅ All assertions pass (100% pass rate)  
✅ User created in database  
✅ Password hashed correctly  
✅ Tokens issued and validated  
✅ Session lifecycle works (login → refresh → logout)  

**Next:** Share runner results and any failures for analysis

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-21
