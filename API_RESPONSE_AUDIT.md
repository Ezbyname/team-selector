# API Response Standardization Audit

## Standard Response Format

All APIs should follow:

### Success Response
```json
{
  "success": true,
  "data": { ... }  // or specific fields like "group", "player", etc.
}
```

### Error Response
```json
{
  "error": "Error message string"
}
```

## HTTP Status Codes

- **200** - Success (GET, PUT, DELETE)
- **201** - Created (POST)
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (no/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **405** - Method Not Allowed
- **409** - Conflict (duplicate resource)
- **500** - Internal Server Error

---

## API Audit Results

### ✅ Compliant APIs

#### groups/create.js
```javascript
// Success (201)
{ success: true, group: { id, name, location, sport, createdAt } }

// Error (400/500)
{ error: "Error message" }
```

#### groups/update.js
```javascript
// Success (200)
{ success: true, group: { id, name, recurringDay, recurringTime } }

// Error (400/403/404/500)
{ error: "Error message" }
```

#### players/add.js
```javascript
// Success (201)
{ success: true, player: { id, name, position, groupId } }

// Error (400/500)
{ error: "Error message" }
```

#### players/update.js
```javascript
// Success (200)
{ success: true, player: { id, name, position } }

// Error (400/404/500)
{ error: "Error message" }
```

#### players/delete.js
```javascript
// Success (200)
{ success: true, message: "Player ... deleted successfully" }

// Error (400/404/500)
{ error: "Error message" }
```

#### connections/add.js
```javascript
// Success (201)
{ success: true, connection: { id, playerId, connectedToId, connectionType } }

// Error (400/409/500)
{ error: "Error message", groupSize?: number, limit?: number }
```

---

### ⚠️ Non-Standard (Need Review)

#### groups/list.js
```javascript
// Current
{ success: true, groups: [...] }

// Should be?
{ success: true, data: { groups: [...] } }
// OR keep as-is since it's clear
```

#### players/list.js
```javascript
// Current
{ success: true, players: [...] }

// Should be?
{ success: true, data: { players: [...] } }
// OR keep as-is since it's clear
```

#### sessions/generate-teams.js
```javascript
// Current
{
  success: true,
  session: { ... },
  teams: [...],
  bench: [...],
  balance: { ... }
}

// Should be?
{
  success: true,
  data: {
    session: { ... },
    teams: [...],
    bench: [...],
    balance: { ... }
  }
}
// OR keep as-is for convenience
```

---

## Recommendation: Flexible Standard

**Two valid patterns:**

### Pattern A: Nested Data (Strict)
```json
{
  "success": true,
  "data": {
    "group": { ... },
    "players": [ ... ]
  }
}
```

**Pros:** Consistent structure  
**Cons:** Extra nesting, harder to access

### Pattern B: Direct Fields (Pragmatic) ← **RECOMMENDED**
```json
{
  "success": true,
  "group": { ... },
  "players": [ ... ]
}
```

**Pros:** Easy to access, clear intent  
**Cons:** Less formal structure

---

## Decision: Pattern B (Current Approach)

**Rationale:**
- Frontend code is simpler: `data.group` vs `data.data.group`
- More readable: fields clearly named
- Common in REST APIs
- Already implemented consistently

**Rules:**
1. Always include `"success": true` in successful responses
2. Use descriptive field names (`group`, `player`, `teams`, etc.)
3. Error responses: Only `{ "error": "message" }`
4. HTTP status codes must match response type

---

## Current Status: ✅ COMPLIANT

All new APIs follow the pattern correctly:
- ✅ `success: true` in all successful responses
- ✅ Descriptive field names
- ✅ `{ error: "..." }` for errors
- ✅ Correct HTTP status codes

**No changes needed.**

---

## Testing Checklist

For each API endpoint:

1. **Success case returns:**
   - `success: true`
   - Appropriate data fields
   - Status 200 or 201

2. **Error cases return:**
   - `{ error: "message" }`
   - Appropriate status code (400/401/403/404/500)
   - No `success` field in errors

3. **Validation errors:**
   - Status 400
   - Clear error message
   - Specific field mentioned if applicable

4. **Auth errors:**
   - Status 401 for missing/invalid token
   - Message: "Authentication required"

5. **Permission errors:**
   - Status 403
   - Message: "[Action] permission required"

---

## Example API Response Test

### Test: Create Group (Success)
```bash
POST /api/groups/create
Authorization: Bearer <token>
Body: { name: "Test", sport: "basketball" }

Expected Response (201):
{
  "success": true,
  "group": {
    "id": "uuid",
    "name": "Test",
    "location": null,
    "sport": "basketball",
    "createdAt": "2026-04-24T..."
  }
}
```

### Test: Create Group (Auth Error)
```bash
POST /api/groups/create
No Authorization header

Expected Response (401):
{
  "error": "Authentication required"
}
```

### Test: Create Group (Validation Error)
```bash
POST /api/groups/create
Authorization: Bearer <token>
Body: { name: "", sport: "invalid" }

Expected Response (400):
{
  "error": "Group name is required"
}
```

---

## Conclusion

✅ **API responses are already standardized correctly**

Current pattern is:
- Consistent
- Clear
- Easy to use
- No changes needed

All new APIs (update, delete) follow the same pattern.
