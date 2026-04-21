# Team Selector v2 - Quick Start

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Supabase
1. Create project: https://supabase.com
2. Run SQL from: `supabase/migrations/001_initial_schema.sql`
3. Copy Project URL + service_role key

### 3. Configure Environment
Create `.env.local`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=random_32_character_string_here
NODE_ENV=development
```

### 4. Run Locally
```bash
vercel dev
```

### 5. Test Auth
```bash
# Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "050-123-4567"}'

# Check console for OTP code (in dev mode)
# Then verify:
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "050-123-4567", "code": "123456"}'

# Register:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "050-123-4567", "password": "test123", "displayName": "Test"}'
```

---

## 📚 Documentation

- **Setup Guide:** `BACKEND_SETUP.md` (comprehensive)
- **Implementation Plan:** `RATING_SYSTEM_PLAN.md` (full architecture)
- **Phase Status:** `PHASE1_STATUS.md` (current progress)
- **Algorithm Rules:** `ALGORITHM_RULES.md` (team balancing)

---

## 🛠️ Project Structure

```
api/auth/          → Authentication endpoints
lib/               → Utilities (phone, jwt, supabase)
supabase/          → Database schema
test-algorithm.html → Frontend algorithm tests (9/9 passing)
app.js             → Current frontend (v1.2.2)
index.html         → Current UI
```

---

## 🎯 Current Status

**Version:** 2.0.0-alpha  
**Phase:** 1 - Auth Foundation (Backend Complete)  
**Next:** Auth Frontend Screens  

**Live v1.2.2:** https://team-selector-dun.vercel.app  
**Features:**
- ✅ Sport selection (Basketball/Soccer)
- ✅ Player management with positions
- ✅ Star players distribution
- ✅ Linked players (stay together)
- ✅ Position-balanced team generation
- ✅ Bilingual (Hebrew/English)
- ✅ Dark/Light mode
- ✅ PWA (installable on mobile)

**Coming in v2.0:**
- 🔄 Phone+password authentication
- 🔄 Permanent groups
- 🔄 Temporary games
- 🔄 Player ratings (internal, hidden in UI)
- 🔄 Persistent teams & history
- 🔄 Role-based access (admin/sub-admin/user)

---

## 🔑 Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (bypasses RLS) |
| `JWT_SECRET` | Yes | Token signing secret (32+ chars) |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio SMS (dev: logs to console) |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio sender number |
| `NODE_ENV` | Optional | development/production |

---

## 🐛 Troubleshooting

**"JWT_SECRET is not defined"**  
→ Add to `.env.local` (32+ characters)

**"Phone already registered"**  
→ Use different phone or delete from Supabase

**"Twilio error" in logs**  
→ OK in dev mode, OTP logged to console

**RLS policy error**  
→ Use service_role key, not anon key

---

## 📞 Contact

Issues/Feedback: https://github.com/Ezbyname/team-selector/issues
