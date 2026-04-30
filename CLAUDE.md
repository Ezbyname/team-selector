# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local development (requires Vercel CLI installed globally)
npm start              # runs: vercel dev

# Validate environment before starting
npm run validate:env

# Testing
npm run test:unit      # phone normalization + JWT tests
npm run test:backend   # full backend integration tests
npm run test:balancing # team balancing algorithm tests
npm run test:invite-codes
npm run test:leave-transfer
npm run test:integration  # runs all of the above

# Deploy
npm run deploy         # vercel --prod

# Admin utilities (run with node directly, edit credentials in-file first)
node create-super-admin.js
node update-admin-password.js
node check-and-promote-admin.js
node check-otp.js
node generate-otp.js
```

All integration tests require `.env.local` and are loaded with `--env-file=.env.local`. Unit tests run without env vars.

## Architecture

### Overview

This is a **Vercel Serverless + Static PWA** project. There is no build step. The frontend is plain vanilla JS served from `frontend/`. The backend is Node.js serverless functions under `api/`.

```
api/          → Vercel serverless entry points (one index.js per domain)
lib/          → Shared backend utilities and actual handler implementations
frontend/     → Static PWA (HTML/CSS/JS, no framework, no bundler)
supabase/migrations/  → PostgreSQL schema migrations (apply manually)
```

### API Routing Pattern

`vercel.json` rewrites all requests for a domain (e.g., `/api/auth/*`) to a single entry file (`api/auth/index.js`). That entry file routes internally to handler modules in `lib/api-handlers/`:

```
/api/auth/login → api/auth/index.js → lib/api-handlers/auth/login.js
/api/groups/... → api/groups/index.js → lib/api-handlers/groups/...
```

This is **not Express**. Vercel provides its own `(req, res)` runtime. Handlers are plain async functions: `export default async function handler(req, res) { ... }`.

### Key Libraries (`lib/`)

- `supabase.js` — Supabase client using the **service role key** (bypasses RLS). Also exports `withRLS(userId, callback)` for operations that need row-level security context.
- `jwt.js` — Custom JWT auth: 15-minute access tokens + 7-day opaque refresh tokens stored in `refresh_tokens` table.
- `permissions.js` — Middleware helpers: `requireAuth`, `requireAdmin`, `requireSuperAdmin`, and `canManageGroup(userId, groupId)`.
- `rate-limit.js` — Upstash Redis rate limiter in production; in-memory fallback in development only.
- `teamBalancer.js` — Team generation engine (see below).
- `phone.js` — Phone normalization to E.164 format.

### Database Schema (Supabase/PostgreSQL)

Key tables:
- `auth_users` — Custom auth table (not Supabase Auth). Roles: `user`, `sub_admin`, `admin`, `super_admin`.
- `groups` — Teams/groups created by admins. `created_by` references the owning admin.
- `group_members` — Per-team role (a user can be `sub_admin` in one team and `user` in another).
- `players` — Players within a group.
- `player_ratings` — Admin-only ratings used for balancing.
- `player_connections` — `prefer_together` connections keep players on the same team.
- `game_sessions` — Individual game sessions tied to a group.
- `refresh_tokens` — Stores opaque refresh tokens for session management.
- `otp_codes` — Temporary OTP codes (5-minute expiry).

### ⚠️ Critical Schema Gotcha

`auth_users.phone` stores the user's **display name**, not their phone number. The actual phone (in E.164 format) is in `phone_normalized`. Always query by `phone_normalized`, never by `phone`.

```javascript
// ✅ Correct
supabase.from('auth_users').select('*').eq('phone_normalized', '+972525502281')

// ❌ Wrong — searches display names
supabase.from('auth_users').select('*').eq('phone', '0525502281')
```

### Role & Permission System

Two separate role fields:
- `auth_users.role` — Global role (`admin` can create teams; `super_admin` has system-wide access)
- `group_members.role` — Per-team role (`sub_admin` can manage players in that specific team)

Permission checks: `lib/permissions.js` → `canManageGroup()` checks both `groups.created_by` and `group_members.role`.

### Team Balancing Algorithm (`lib/teamBalancer.js`)

Multi-candidate strategy:
1. Finds connected player groups (`prefer_together` connections via BFS).
2. Generates 100 random candidate allocations, each shuffling the groups then greedily assigning by minimizing an imbalance score.
3. Imbalance score = `teamSizeDiff × 20 + ratingDiff × 10 + positionImbalance × 5`.
4. Returns the best-scoring candidate.

Players use `finalRating` (admin-set) or fall back to `defaultRating` (default: 5). Star player logic was removed — balancing is purely ratings + positions + connections.

### Authentication Flow

- **New users**: OTP flow (`/index.html` → send-otp → verify-otp → register)
- **Existing users**: Direct login (`/login.html` → phone + password)
- **⚠️ Known bug**: The OTP verify-otp handler has a bug detecting existing users, which can show the registration screen to existing users. Admin accounts must be created via scripts and should always use the direct login page.

### Environment Variables

Required in `.env.local` for development, and set in Vercel dashboard for production:

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
JWT_SECRET                   # min 32 chars
UPSTASH_REDIS_REST_URL       # required in production for rate limiting
UPSTASH_REDIS_REST_TOKEN
TWILIO_ACCOUNT_SID           # for OTP SMS
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

In development without Redis, rate limiting falls back to in-memory (not safe for production).

### Frontend

Static files in `frontend/` — no framework, no bundler. Key files:
- `auth.js` / `auth.css` — Auth screens shared across pages
- `i18n.js` — Bilingual Hebrew/English support
- `sw.js` — Service worker for PWA offline support
- Pages are individual HTML files; routing is handled by `vercel.json` redirects/rewrites.

### Database Migrations

Migrations in `supabase/migrations/` must be applied manually to Supabase. There is no automated migration runner in CI. Use `apply-migrations.js` or the Supabase dashboard SQL editor.
