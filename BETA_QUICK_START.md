# 🚀 Beta Quick Start - 30 Minute Checklist

---

## ⏱️ BLOCKING TASKS (Must complete before beta)

### 1. Upstash Redis Setup (15 min)

```bash
# 1. Sign up: https://upstash.com
# 2. Create database (Regional, us-east-1)
# 3. Copy credentials
# 4. Add to .env.local:
```

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...
```

```bash
# 5. Add to Vercel:
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN

# 6. Verify:
npm run validate:beta
```

**Must see:** ✅ REDIS: Connection successful

---

### 2. Database Migration (5 min)

```sql
-- Run in Supabase SQL Editor:

ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_membership_per_user_group
ON group_members(group_id, user_id) WHERE status = 'active';
```

**Verify:**
```bash
npm run validate:beta
```

**Must see:** ✅ DB: Migration 004 applied

---

### 3. Deploy (5 min)

```bash
npm install
npm run validate:beta  # Must show: ✅ READY FOR BETA TESTING
vercel --prod
```

---

### 4. Critical Smoke Tests (10 min)

**Test on deployed app, not localhost!**

| Test | Action | Expected |
|------|--------|----------|
| Login | Login with phone | ✅ Success, no errors |
| Create Team | Create team + generate invite | ✅ Invite link copies |
| Join (logged out) | Open invite in incognito → login | ✅ Auto-returns to join |
| Already Member | Join same team twice | ✅ "Already member" (not error) |
| Rate Limit | Join invalid code 10x rapidly | ✅ 429 on 6th+ attempt |
| Console | Check console on all pages | ✅ ZERO errors |

---

## 🎯 Ready if ALL pass:

- ✅ Validation script shows "READY FOR BETA"
- ✅ Rate limiting returns 429 (Redis working)
- ✅ Migration applied (no duplicate memberships)
- ✅ All smoke tests pass
- ✅ Zero console errors

---

## ❌ NOT ready if:

- ❌ Rate limit test: all attempts succeed (429 never appears)
- ❌ Validation shows: "REDIS: Redis credentials not configured"
- ❌ Validation shows: "DB: Migration 004 NOT applied"
- ❌ Any console errors on any page
- ❌ Join flow doesn't preserve invite code through login

---

## 📞 Quick Commands

```bash
# Validate everything
npm run validate:beta

# Run balancing tests
npm run test:balancing

# Deploy
vercel --prod

# Watch logs
vercel logs --follow

# Rollback if issues
vercel rollback
```

---

## 🚨 Emergency Contact

If beta testers report critical issues:

1. Check Vercel logs: `vercel logs --follow`
2. Check Supabase logs: Dashboard → Logs → API
3. Rollback if needed: `vercel rollback`
4. Fix locally, validate, redeploy

---

**Total Time:** ~30-40 minutes  
**Then:** Invite 3-5 beta testers  
**Monitor:** First 24 hours closely
