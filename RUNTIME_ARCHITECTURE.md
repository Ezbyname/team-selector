# Runtime Architecture & Development Guide

**Project Type:** Vercel Serverless API with Static Frontend  
**Last Updated:** 2026-04-21  
**Status:** ✅ Properly Configured  

---

## Project Structure

```
team-selector/
├── api/                      # Vercel Serverless Functions (Backend v2.0)
│   └── auth/
│       ├── send-otp.js
│       ├── verify-otp.js
│       ├── register.js
│       ├── login.js
│       ├── refresh.js
│       └── logout.js
├── frontend/                 # Static PWA (Frontend v1.2.2)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── ...
├── lib/                      # Shared utilities
│   ├── phone.js
│   ├── jwt.js
│   └── supabase.js
├── supabase/migrations/      # Database schema
├── postman/                  # Integration tests
├── test-*.js                 # Unit tests
├── package.json
├── vercel.json              # Vercel configuration
└── .env.local               # Local environment (gitignored)
```

---

## Deployment Model

### Vercel Serverless Functions

**How it works:**
- Each file in `api/` becomes a serverless endpoint
- Example: `api/auth/send-otp.js` → `https://domain.com/api/auth/send-otp`
- Functions run on-demand (cold start + warm instances)
- Stateless, auto-scaling

**Function Format:**
```javascript
// api/auth/endpoint.js
export default async function handler(req, res) {
  // req.method, req.body, req.headers, etc.
  return res.status(200).json({ success: true });
}
```

**NOT Express middleware** - Vercel provides its own runtime.

---

## Local Development

### Official Command

```bash
npm run dev
```

**This runs:** `vercel dev`

**What it does:**
- Starts Vercel development server
- Simulates Vercel's serverless runtime locally
- Auto-reloads on file changes
- Reads `.env.local` automatically
- Available at: `http://localhost:3000` (or 3001 if 3000 in use)

### Endpoint URLs

When running locally (`npm run dev`):
- POST http://localhost:3000/api/auth/send-otp
- POST http://localhost:3000/api/auth/verify-otp
- POST http://localhost:3000/api/auth/register
- POST http://localhost:3000/api/auth/login
- POST http://localhost:3000/api/auth/refresh
- POST http://localhost:3000/api/auth/logout

### Environment Setup

1. Create `.env.local` in project root:
```bash
# JWT Configuration
JWT_SECRET=your_32_character_secret_key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Twilio (optional - dev mode logs OTP to console)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Environment
NODE_ENV=development
```

2. Verify configuration:
```bash
npm run validate:env
```

3. Start development server:
```bash
npm run dev
```

---

## Testing

### Unit Tests

```bash
npm run test:unit
```

**Runs:**
- `test-phone.js` - Phone normalization (13 tests)
- `test-jwt.js` - JWT utilities (10 tests)

**Total:** 23 unit tests  
**Status:** ✅ All passing  

### Integration Tests

```bash
npm run test:integration
```

**Runs:**
- Environment validation
- Backend integration tests (19 tests via Postman collection)

**Requires:**
- Supabase project with deployed schema
- Running development server (`npm run dev` in another terminal)

### All Tests

```bash
npm test
```

Runs unit + integration tests sequentially.

---

## Production Deployment

### Deploy to Vercel

```bash
npm run deploy
```

**This runs:** `vercel --prod`

**What happens:**
1. Vercel builds serverless functions from `api/`
2. Deploys to production domain
3. Environment variables read from Vercel project settings (not .env.local)

### Environment Variables in Production

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add:
   - `JWT_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `TWILIO_ACCOUNT_SID` (if using SMS)
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `NODE_ENV=production`

**Or via CLI:**
```bash
vercel env add JWT_SECRET
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
```

---

## Architecture Decisions

### Why Serverless Functions?

**Pros:**
- Zero server management
- Auto-scaling
- Pay-per-use (free tier: 100GB-hours/month)
- Built-in HTTPS
- Global edge network

**Cons:**
- Cold starts (~100-500ms first request)
- Stateless (can't hold WebSocket connections long-term)
- 10-second execution timeout (Vercel free tier)

### Why Separate `frontend/` Directory?

**Reason:** This repo contains TWO applications:
1. **Frontend v1.2.2** (Static PWA) - currently deployed separately
2. **Backend v2.0** (Serverless API) - Phase 1 work

**Separation benefits:**
- Clear project boundaries
- Vercel doesn't get confused about project type
- `vercel dev` works correctly
- Can deploy API without touching frontend

**Future:** Frontend v2.0 will integrate with this backend and live in `frontend/`.

### Why No Express?

**Old approach (broken):**
```javascript
// server.js - WRONG for Vercel
import express from 'express';
const app = express();
app.post('/api/auth/send-otp', handler);
```

**Vercel approach (correct):**
```javascript
// api/auth/send-otp.js - RIGHT for Vercel
export default async function handler(req, res) {
  // Direct handler, no Express
}
```

**Reason:** Vercel provides its own runtime. Express is unnecessary and causes issues.

---

## Common Issues & Solutions

### Issue: `vercel dev` says "Recursively invoking"

**Cause:** `package.json` has `"dev": "vercel dev"` and Vercel tries to run it again.  
**Solution:** ✅ Fixed - `vercel.json` now specifies API-only build.

### Issue: Vercel expects `public/` directory

**Cause:** Vercel detected HTML files in root and assumed static site.  
**Solution:** ✅ Fixed - Moved frontend to `frontend/`, configured `vercel.json`.

### Issue: Port 3000 already in use

**Solution:** Vercel automatically uses port 3001 (or next available).  
**Or manually specify:**
```bash
vercel dev --listen 3002
```

### Issue: Environment variables not loading

**Check:**
- `.env.local` exists in project root
- Variable names match (case-sensitive)
- Run `npm run validate:env` to verify

### Issue: Integration tests fail with ECONNREFUSED

**Solution:**
- Ensure `npm run dev` is running in another terminal
- Check URL in Postman: `http://localhost:3000` (or 3001)

---

## Development Workflow

### First Time Setup

```bash
# 1. Clone repo
git clone https://github.com/Ezbyname/team-selector.git
cd team-selector

# 2. Install dependencies
npm install

# 3. Create .env.local (see Environment Setup above)

# 4. Create Supabase project
# Follow: SUPABASE_SETUP_5MIN.md

# 5. Deploy schema
# In Supabase SQL Editor: run supabase/migrations/001_initial_schema.sql

# 6. Verify environment
npm run validate:env

# 7. Start development server
npm run dev

# 8. Run tests (in another terminal)
npm test
```

### Daily Development

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests after changes
npm run test:unit        # Quick unit tests
npm run test:integration # Full integration tests

# Make changes to api/ files
# Vercel auto-reloads on file save

# When done
git add .
git commit -m "..."
git push
```

### Before Pushing

```bash
# Run all tests
npm test

# Verify environment still valid
npm run validate:env

# Check no secrets in code
git diff
```

---

## Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "name": "team-selector-api",
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["fra1"]
}
```

**Explanation:**
- `builds`: Only build files in `api/` directory
- `routes`: Map `/api/*` URLs to serverless functions
- `env`: Set NODE_ENV for production
- `regions`: Deploy to Frankfurt (closest to target users)

---

## Package.json Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vercel dev` | Start local development server |
| `npm run build` | `echo ...` | No build needed (serverless) |
| `npm run deploy` | `vercel --prod` | Deploy to production |
| `npm run validate:env` | `node validate-env.js` | Verify environment config |
| `npm run test:unit` | `node test-*.js` | Run unit tests |
| `npm run test:backend` | `node test-backend.js` | Run integration tests |
| `npm run test:integration` | `validate + backend` | Full integration suite |
| `npm test` | `unit + integration` | Run all tests |

---

## Migration Notes

### What Changed (2026-04-21)

**Before (Broken):**
- Frontend files (HTML, JS, CSS) in root
- No `vercel.json`
- Manual `server.js` with Express
- `vercel dev` failed with recursion error
- Workaround: `node server.js` (not official)

**After (Fixed):**
- Frontend files moved to `frontend/`
- Proper `vercel.json` configuration
- Removed Express dependency
- `npm run dev` = `vercel dev` (works correctly)
- Official supported workflow

**Breaking Change:** None - this only affects local development setup.

---

## FAQ

**Q: Can I still deploy the frontend (v1.2.2)?**  
A: Yes! It's in `frontend/` directory. Deploy separately as static site or wait for Phase 1 completion.

**Q: Do I need Express for local development?**  
A: No. `vercel dev` simulates the serverless runtime. Express is not needed.

**Q: Can I use this API with the old frontend?**  
A: Yes, but you'll need to update `frontend/app.js` to call the new API endpoints.

**Q: What's the production URL?**  
A: After `npm run deploy`, Vercel provides a URL like `https://team-selector-api.vercel.app`

**Q: How do I add a new endpoint?**  
A: Create `api/path/to/endpoint.js` with default export handler function. Restart `npm run dev`.

---

## Support

**Issues:** https://github.com/Ezbyname/team-selector/issues  
**Documentation:** This file + `EXECUTION_CHECKLIST.md` + `BACKEND_SETUP.md`  

---

**Last Verified:** 2026-04-21  
**Vercel Dev Status:** ✅ Working  
**Integration Tests:** ✅ Passing  
**Production Ready:** ✅ Yes
