# ⚡ ACTION NOW - Beta Blocker Resolution

**Status:** ✅ Code fixed. You need 2 infrastructure setups.

**Code changes applied:**
- ✅ Rate limiting no longer falls back silently to in-memory in production
- ✅ Production explicitly requires Redis (fail closed if missing)
- ✅ Development shows loud warning when using in-memory fallback
- ✅ Validation enhanced to catch misconfiguration

---

## 🔴 BLOCKER 1: Upstash Redis (15 min)

### Action

1. **Sign up:** https://upstash.com
2. **Create database:** Regional, `us-east-1`
3. **Copy credentials:**
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=AX...
   ```
4. **Add to `.env.local`** (for local testing)
5. **Add to Vercel:**
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL production
   vercel env add UPSTASH_REDIS_REST_TOKEN production
   ```

### Verification

```bash
npm run validate:beta
```

Must show:
```
✅ REDIS: Connection successful, read/write works
```

---

## 🔴 BLOCKER 2: Migration 004 (5 min)

### Action

**Supabase Dashboard → SQL Editor**, run:

```sql
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_group_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_membership_per_user_group
ON group_members(group_id, user_id) 
WHERE status = 'active';
```

### Verification

```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'group_members' 
AND indexname = 'unique_active_membership_per_user_group';
```

Must return 1 row.

---

## ✅ Final Check

```bash
npm run validate:beta
```

Must show:
```
✅ READY FOR BETA TESTING
```

---

## 🚀 Deploy

```bash
vercel --prod
```

---

## 🧪 CRITICAL TEST (After Deploy)

**On deployed app**, DevTools Console:

```javascript
const token = localStorage.getItem('token');
for (let i = 0; i < 10; i++) {
  fetch('/api/groups/join-by-code', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code: 'TEST-' + i })
  }).then(r => r.json()).then(d => console.log(`${i+1}: ${d.error || 'OK'}`));
}
```

**MUST see:**
```
1: This invite code is invalid
2: This invite code is invalid
3: This invite code is invalid
4: This invite code is invalid
5: This invite code is invalid
6: Too many attempts ✅
7: Too many attempts ✅
8: Too many attempts ✅
```

**If all show "invalid":** Redis NOT working. Check Vercel logs.

---

## ✅ DONE When

- [ ] Rate limit test → 429 on 6th attempt
- [ ] `validate:beta` → READY
- [ ] Console → zero errors
- [ ] Concurrency test (2 tabs, rapid join) → no duplicates

---

**Time:** 20 min setup + 5 min deploy + 10 min test = 35 min  
**Then:** ✅ Beta ready

---

## 📋 Quick Links

- Full details: `BLOCKER_RESOLUTION.md`
- Validation: `npm run validate:beta`
- Deploy: `vercel --prod`
