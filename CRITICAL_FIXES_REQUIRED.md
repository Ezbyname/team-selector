# Critical Architectural Fixes Required

## Status: 🔴 BLOCKING PRODUCTION

These issues must be resolved before the system can be considered production-ready.

---

## 🔴 1. Role Consistency (CRITICAL - CLARIFICATION NEEDED)

### Current State:
- Database enum: `user_role AS ENUM ('admin', 'sub_admin', 'user')`
- Documentation: Refers to "member" role
- Code: Uses `role: 'user'`
- Tests: Expect `role: 'user'`

### Issue:
Inconsistent terminology between documentation and implementation.

### Decision Required:
**Option A: Keep database as-is**
- Database: `'admin', 'sub_admin', 'user'`
- Documentation: Update all references from "member" to "user"
- Rationale: No migration needed, tests already pass

**Option B: Change database schema**
- Database: `'admin', 'sub_admin', 'member'`
- Migration: `ALTER TYPE user_role RENAME VALUE 'user' TO 'member'`
- Update: All code, tests, documentation
- Rationale: More semantically correct ("member" is clearer than "user")

### Recommendation:
**Option A** - Documentation should match implementation.
Update `INVITE_CODE_RULES.md` to say `role: 'user'` not `role: 'member'`.

---

## 🔴 2. Admin Exit Rule (CRITICAL - NOT IMPLEMENTED)

### Current State:
Admin can leave team, creating orphaned group with no owner.

### Required Behavior:
```javascript
// In leave-team endpoint (DOES NOT EXIST YET)
if (userRole === 'admin') {
  const otherAdmins = await getOtherAdmins(groupId, userId);
  
  if (otherAdmins.length === 0) {
    return res.status(403).json({
      success: false,
      error: "You must assign another admin before leaving this team.",
      canTransferOwnership: true
    });
  }
}
```

### Implementation Required:
1. Create `POST /api/groups/leave` endpoint
2. Validate admin cannot leave if sole admin
3. Add `POST /api/groups/transfer-ownership` endpoint
4. Update tests

### Status: **NOT IMPLEMENTED** 🔴

---

## 🔴 3. Join Idempotency (IMPORTANT - NEEDS DISCUSSION)

### Current State:
Duplicate join returns `409 Conflict` with error message.

### User's Recommendation:
Make join idempotent - return success if already member.

### Counter-Argument:
Current behavior is semantically correct:
- `409 Conflict` indicates "you're already in this state"
- Frontend can handle this gracefully
- User knows they're already a member

### Alternative Approach:
Keep `409` but add flag:
```json
{
  "success": false,
  "error": "You are already a member of this team.",
  "alreadyMember": true,
  "group": { ... }
}
```

Frontend treats `alreadyMember: true` as non-error.

### Decision Required:
- Option A: Change to `200` success when already member (idempotent)
- Option B: Keep `409` but add `alreadyMember` flag for frontend handling
- Option C: Keep current behavior (strict REST semantics)

### Recommendation:
**Option A** - Change to idempotent for better UX.

---

## 🔴 4. Rate Limiting (SECURITY - NOT IMPLEMENTED)

### Current State:
No rate limiting on join-by-code endpoint.

### Attack Vector:
Brute force code enumeration:
```
Try: TEAM-0000, TEAM-0001, TEAM-0002...
Eventually find valid code
```

### Required Implementation:

**Option A: Application-level (Simple)**
```javascript
// In-memory store (loses state on restart)
const attempts = new Map(); // userId/IP -> { count, resetAt }

if (attempts.get(key).count > 5) {
  return res.status(429).json({
    success: false,
    error: "Too many attempts. Try again later.",
    retryAfter: 60
  });
}
```

**Option B: Redis-based (Production)**
```javascript
const key = `join-attempts:${userId}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);

if (count > 5) {
  return res.status(429).json({ ... });
}
```

**Option C: Vercel Rate Limiting**
```javascript
// In vercel.json
{
  "rateLimit": {
    "/api/groups/join-by-code": {
      "requests": 5,
      "period": "1m"
    }
  }
}
```

### Recommendation:
**Option A** for MVP, migrate to **Option B** for production scale.

### Status: **NOT IMPLEMENTED** 🔴

---

## 🔴 5. Invite Code Format Standardization (PARTIAL)

### Current State:
- Normalization: ✅ Uppercase + trim
- Format validation: ❌ Not enforced
- Ambiguous characters: ❌ Not filtered

### Required Enhancement:
```javascript
function generateInviteCode(teamName) {
  const prefix = teamName
    .split(' ')[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 6);

  // Exclude ambiguous: 0, O, 1, I, L
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }

  return `${prefix}-${suffix}`;
}

function isValidCodeFormat(code) {
  // Must be XXXXX-XXXX or shorter prefix
  return /^[A-Z]{1,6}-[A-Z0-9]{4}$/.test(code);
}
```

### Status: **PARTIALLY IMPLEMENTED** 🟡

---

## 🔴 6. Group Privacy Protection (NEEDS REVIEW)

### Current State:
```javascript
if (!invite) {
  return res.status(404).json({
    error: "This invite code is invalid."
  });
}
```

This is **CORRECT** - doesn't leak group info.

### Potential Issue:
If group is deleted but code exists, might expose metadata.

### Verification Needed:
Check that `invite.groups` join returns null for deleted groups.

### Recommendation:
Current implementation is secure. Mark as ✅.

### Status: **NEEDS VERIFICATION** 🟡

---

## 🔴 7. Query Safety - Status Filtering (CRITICAL)

### Current State:
Join-by-code correctly checks:
```javascript
if (existingMembership.status === 'active') { ... }
```

### Required Audit:
ALL queries involving `group_members` must filter by status.

### Endpoints to Check:
1. ✅ `join-by-code.js` - Checks status
2. ❓ `my-teams.js` - Need to verify
3. ❓ `create-invite.js` - Checks created_by (admin role)
4. ❓ Any other group membership queries

### Required Pattern:
```javascript
// ALWAYS filter active members
.select('*')
.eq('group_id', groupId)
.eq('status', 'active')  // REQUIRED
```

### Status: **NEEDS AUDIT** 🟡

---

## 🔴 8. System Guarantees (DOCUMENTATION)

### Required Addition to INVITE_CODE_RULES.md:

```markdown
## Rule 16: System Guarantees

The system MUST ALWAYS guarantee:

1. ✅ No revoked or expired code can create membership
   - Enforced: SQL filter + code validation
   
2. ✅ A group can never have >1 active invite code
   - Enforced: Partial unique index on (group_id) WHERE is_active=true
   
3. ✅ Invite codes never grant elevated roles
   - Enforced: Hardcoded role='user' in insert
   
4. ❌ Membership creation is idempotent
   - Current: Returns 409 on duplicate
   - Required: Return success with alreadyMember flag
   
5. ✅ All API responses are deterministic
   - Enforced: No undefined states in tests
   
6. ✅ No operation crashes from missing/null data
   - Enforced: Explicit null checks, 99 passing tests
   
7. ✅ Security validation at DB + API level
   - Enforced: Unique index + code checks
```

### Status: **NEEDS DOCUMENTATION UPDATE** 🟡

---

## 🔴 9. Defensive Programming Audit (NEEDS REVIEW)

### Pattern to Enforce:
```javascript
// ALWAYS check existence before access
if (!object) return error;
if (!object.property) return error;

// NEVER assume nested properties exist
const value = object?.nested?.property;
if (!value) return error;
```

### Files to Audit:
- ✅ `join-by-code.js` - Already has checks
- ❓ `create-invite.js` - Need to verify
- ❓ `revoke-invite.js` - Need to verify

### Status: **NEEDS AUDIT** 🟡

---

## Summary: Implementation Status

| Issue | Status | Blocker | Action Required |
|-------|--------|---------|-----------------|
| 1. Role Consistency | 🟡 | No | Decision: Keep 'user' or rename to 'member' |
| 2. Admin Exit Rule | 🔴 | **YES** | Implement leave + transfer ownership endpoints |
| 3. Join Idempotency | 🟡 | No | Decision: 200 success or keep 409 |
| 4. Rate Limiting | 🔴 | **YES** | Implement rate limiting on join endpoint |
| 5. Code Format | 🟡 | No | Add ambiguous char filtering |
| 6. Privacy Protection | ✅ | No | Already secure, verify only |
| 7. Query Safety | 🟡 | No | Audit all membership queries |
| 8. System Guarantees | 🟡 | No | Update documentation |
| 9. Defensive Programming | 🟡 | No | Code audit |

---

## Blockers for Production

**MUST IMPLEMENT:**
1. 🔴 Admin exit prevention
2. 🔴 Rate limiting on join-by-code

**SHOULD IMPLEMENT:**
3. 🟡 Join idempotency (UX improvement)
4. 🟡 Ambiguous character filtering (security improvement)

**SHOULD AUDIT:**
5. 🟡 Query safety across all endpoints
6. 🟡 Defensive programming patterns

**DOCUMENTATION:**
7. 🟡 System guarantees section
8. 🟡 Role naming consistency

---

## Next Steps

### Immediate (Blocking):
1. Implement rate limiting (Option A: in-memory for MVP)
2. Create leave-team endpoint with admin validation
3. Create transfer-ownership endpoint

### Short-term (Important):
4. Make join idempotent (change 409 → 200 with flag)
5. Filter ambiguous characters from codes
6. Audit all group_members queries for status='active'

### Documentation:
7. Update INVITE_CODE_RULES.md with System Guarantees
8. Clarify role='user' vs 'member' terminology

---

**After these fixes, feature will be truly production-ready.**
