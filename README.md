# 🏀⚽ Team Selector - בוחר קבוצות

A Progressive Web App (PWA) for creating balanced basketball and soccer teams with authentication, persistent groups, and player ratings.

**Current Version:** v1.2.2 (Production) | v2.0.0-alpha (In Development)  
**Live Demo:** https://team-selector-dun.vercel.app

## Features (v1.2.2 - Production)

### 🎯 Smart Team Balancing
- Automatic team generation with intelligent algorithms
- Star player distribution across teams
- Position-based balancing
- Linked players stay together

### 🏀 Basketball Mode
- 2v2 to 5v5 games
- Positions: Guard, Forward, Center
- NBA-inspired design

### ⚽ Soccer Mode
- 5v5 to 11v11 games
- Positions: Goalkeeper, Defender, Midfielder, Forward

### ✨ User Experience
- **Bilingual**: Full Hebrew and English support with RTL/LTR
- **Dark/Light Mode**: Easy on the eyes
- **Mobile First**: Optimized for iPhone and Android
- **Offline Ready**: Works without internet (PWA)
- **Kid Friendly**: Simple enough for a 5-year-old to use

### 💾 Smart Features
- Auto-save players between sessions
- Link players to keep them on same team
- Mark star players for balanced distribution
- Bench system for games with extra players

## Coming in v2.0 🚀

### 🔐 Authentication
- Phone + password login with OTP verification
- Persistent sessions (7-day refresh tokens)
- Role-based access (admin, sub-admin, user)

### 👥 Permanent Groups
- Create recurring groups with members
- Manage group permissions
- Track game history

### 🎮 Temporary Games
- Quick one-time games without a group
- Share game links
- Auto-expiry after 7 days

### 📊 Player Ratings (Internal)
- Admin-only player ratings
- Hidden from UI in MVP
- Used for advanced team balancing
- Community rating system (future)

### 💾 Database Persistence
- All data saved to cloud (Supabase)
- Cross-device synchronization
- Game history tracking
- Audit trails

---

## Installation (v1.2.2)

### As a Web App
1. Visit https://team-selector-dun.vercel.app
2. On mobile: Tap "Add to Home Screen" for app-like experience

### For Development
See [QUICK_START.md](QUICK_START.md) for v2.0 setup instructions.

## Development

### v1.2.2 (Current Production)
Built with vanilla JavaScript for maximum compatibility:
- **No build process required**
- **No dependencies**
- **Works offline**
- **Fast and lightweight**

### v2.0.0 (In Development)
Full-stack architecture:
- **Frontend:** Vanilla JS with auth screens
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** Supabase (PostgreSQL with RLS)
- **Auth:** Custom phone+password with JWT
- **SMS:** Twilio for OTP verification

### File Structure
```
team-selector/
├── api/auth/              # Authentication endpoints (v2.0)
│   ├── send-otp.js
│   ├── verify-otp.js
│   ├── register.js
│   ├── login.js
│   ├── refresh.js
│   └── logout.js
├── lib/                   # Backend utilities (v2.0)
│   ├── phone.js           # Phone normalization
│   ├── jwt.js             # Token management
│   └── supabase.js        # Database client
├── supabase/migrations/   # Database schema (v2.0)
│   └── 001_initial_schema.sql
├── index.html             # Main UI (v1.2.2)
├── styles.css             # NBA-themed styling
├── app.js                 # Client logic (v1.2.2)
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
├── test-algorithm.html    # Algorithm tests (9/9 passing)
├── QUICK_START.md         # Setup guide
├── BACKEND_SETUP.md       # Comprehensive backend guide
├── PHASE1_STATUS.md       # Current progress
├── RATING_SYSTEM_PLAN.md  # Full architecture plan
└── ALGORITHM_RULES.md     # Team balancing rules
```

## Usage

1. **Choose Sport**: Select Basketball or Soccer
2. **Add Players**: Enter player names
3. **Assign Positions** (Optional): Click on position dropdown
4. **Mark Stars** ⭐: Click star icon for key players
5. **Link Players** 🔗: Keep friends/family together
6. **Set Team Size**: Choose how many players per team
7. **Generate Teams**: Get balanced teams instantly!

## Algorithm

The team generation algorithm:
1. Identifies linked player groups
2. Separates star players between teams
3. Balances positions across teams
4. Handles extra players (bench system)
5. Ensures fairness while respecting constraints

## Browser Support

Works on all modern browsers:
- Chrome/Edge (Desktop & Mobile)
- Safari (iOS & macOS)
- Firefox
- Samsung Internet

## Quick Start (v2.0 Development)

```bash
# Install dependencies
npm install

# Setup environment (see .env.example)
cp .env.example .env.local

# Run locally
vercel dev
```

See [QUICK_START.md](QUICK_START.md) for full setup instructions.

---

## Documentation

- 📖 [Quick Start Guide](QUICK_START.md) - Get running in 5 minutes
- 🏗️ [Backend Setup Guide](BACKEND_SETUP.md) - Comprehensive backend setup
- 📋 [Phase 1 Status](PHASE1_STATUS.md) - Current implementation progress
- 🎯 [Rating System Plan](RATING_SYSTEM_PLAN.md) - Full architecture & roadmap
- 🧪 [Algorithm Rules](ALGORITHM_RULES.md) - Team balancing logic & tests

---

## Technology Stack

### v1.2.2 (Production)
- Vanilla JavaScript
- CSS3 with custom properties
- Service Worker (PWA)
- LocalStorage

### v2.0.0 (In Development)
- **Frontend:** Vanilla JS (no framework)
- **Backend:** Node.js 24 LTS
- **Functions:** Vercel Serverless
- **Database:** PostgreSQL (Supabase)
- **Auth:** Custom JWT + bcrypt
- **SMS:** Twilio
- **Deployment:** Vercel

---

## Project Timeline

**Total:** 25 days (5 weeks)

- **Phase 1:** Auth Foundation (5 days) - ✅ Backend Complete
- **Phase 2:** Player Management (4 days)
- **Phase 3:** Temporary Game Flow (6 days)
- **Phase 4:** Team Generation (3 days)
- **Phase 5:** Permanent Groups (4 days)
- **Phase 6:** Polish & Deploy (3 days)

---

## License

MIT License - Free to use and modify

## Contributing

Feel free to open issues or submit pull requests!

---

Made with ❤️ for basketball and soccer lovers everywhere
