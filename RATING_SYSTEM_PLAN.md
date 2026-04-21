# Rating System Implementation Plan

## 🎯 Overview
Transform Team Selector from a static app into a full-featured platform with:
- User authentication
- Player ratings (admin + community)
- Saved teams
- Rating-based team balancing

---

## 🏗️ Technology Stack

### Recommended: Supabase + Vercel
- **Frontend:** Current app (HTML/CSS/JS)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Hosting:** Vercel (current)
- **Auth:** Supabase Auth (Email + Google OAuth)

### Why Supabase?
✅ Free tier (500MB storage, 50K monthly active users)
✅ Built-in authentication
✅ Real-time subscriptions
✅ Row Level Security (RLS)
✅ REST API auto-generated
✅ Works perfectly with Vercel

---

## 📊 Database Schema

```sql
-- Users table (managed by Supabase Auth)
-- Comes with: id, email, created_at, etc.

-- Players profile table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('basketball', 'soccer')),
  position INTEGER CHECK (position BETWEEN 0 AND 3),
  is_star BOOLEAN DEFAULT false,
  official_rating DECIMAL(3,1) CHECK (official_rating BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community ratings table
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  rated_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating DECIMAL(3,1) NOT NULL CHECK (rating BETWEEN 1 AND 10),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, rated_by_user_id)
);

-- Saved teams table
CREATE TABLE saved_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('basketball', 'soccer')),
  team_size INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE team_members (
  team_id UUID REFERENCES saved_teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (team_id, player_id)
);

-- Game history table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  saved_team_id UUID REFERENCES saved_teams(id) ON DELETE SET NULL,
  sport TEXT NOT NULL,
  team_size INTEGER NOT NULL,
  team1_players UUID[] NOT NULL,
  team2_players UUID[] NOT NULL,
  bench_players UUID[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table
CREATE TABLE admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_ratings_player_id ON ratings(player_id);
CREATE INDEX idx_ratings_rated_by ON ratings(rated_by_user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_player_id ON team_members(player_id);
CREATE INDEX idx_games_saved_team_id ON games(saved_team_id);

-- Row Level Security (RLS) Policies

-- Players: Everyone can read, only own user can update
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players are viewable by everyone"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own player profile"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own player profile"
  ON players FOR UPDATE
  USING (auth.uid() = user_id);

-- Ratings: Everyone can read, users can rate others
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON ratings FOR INSERT
  WITH CHECK (auth.uid() = rated_by_user_id);

CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE
  USING (auth.uid() = rated_by_user_id);

-- Saved teams: Creator and members can view/edit
ALTER TABLE saved_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public teams are viewable by everyone"
  ON saved_teams FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own teams"
  ON saved_teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own teams"
  ON saved_teams FOR UPDATE
  USING (auth.uid() = created_by);

-- Admin only: Official ratings
CREATE POLICY "Only admins can set official ratings"
  ON players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );
```

---

## 🔐 Authentication Flow

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Login
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

// Sign up
async function signup(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  })
  return { data, error }
}

// Google OAuth
async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  })
  return { data, error }
}

// Get current user
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Check if admin
async function isAdmin(userId) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .single()
  
  return !!data && !error
}
```

---

## 📱 New Screens Structure

```
/
├── index.html (Login/Signup)
├── dashboard.html (My Teams)
├── team.html (Team Management)
├── players.html (Player List)
├── rate.html (Rating Screen)
├── generate.html (Generate Teams - Enhanced)
└── admin.html (Admin Panel - Ratings Overview)
```

---

## 🎨 UI Components

### Login Screen
```html
<div class="login-screen">
  <h1>🏀 Team Selector</h1>
  <form id="loginForm">
    <input type="email" placeholder="Email" required>
    <input type="password" placeholder="Password" required>
    <button type="submit">Login</button>
  </form>
  <button id="googleLogin">Login with Google</button>
  <a href="signup.html">Create Account</a>
</div>
```

### Team Card
```html
<div class="team-card">
  <h3>🏀 כדורסל שישי</h3>
  <p>12 שחקנים</p>
  <div class="actions">
    <button onclick="playTeam(teamId)">Play</button>
    <button onclick="editTeam(teamId)">Edit</button>
  </div>
</div>
```

### Player Card with Rating
```html
<div class="player-card">
  <div class="player-info">
    <h4>משה</h4>
    <span class="position">Guard</span>
  </div>
  <div class="rating">
    <span class="official-rating">8.5</span>
    <span class="community-rating">(Avg: 8.2)</span>
  </div>
  <button onclick="ratePlayer(playerId)">Rate</button>
</div>
```

### Admin Rating View
```html
<div class="admin-rating-view">
  <h3>משה - Rating Details</h3>
  <div class="official-rating-input">
    <label>Official Rating:</label>
    <input type="number" min="1" max="10" step="0.1" value="8.5">
    <button>Save</button>
  </div>
  <div class="community-ratings">
    <h4>Community Ratings:</h4>
    <ul>
      <li>יוסי: 9.0 ⭐⭐⭐⭐⭐</li>
      <li>דני: 7.0 ⭐⭐⭐⭐</li>
      <li>אורי: 8.0 ⭐⭐⭐⭐</li>
    </ul>
    <p>Average: 8.0 / 10</p>
  </div>
</div>
```

---

## 🔢 Enhanced Team Balancing Algorithm

```javascript
function balanceTeamsWithRatings(players, teamSize) {
  // Step 1: Calculate total rating
  const totalRating = players.reduce((sum, p) => sum + (p.official_rating || 5), 0)
  const targetRatingPerTeam = totalRating / 2

  // Step 2: Handle linked groups (same as before)
  const groups = findLinkedGroups(players)
  const team1 = []
  const team2 = []
  
  // Step 3: Distribute star players
  const stars = players.filter(p => p.isStar)
  stars.sort((a, b) => b.official_rating - a.official_rating) // Highest rated first
  
  stars.forEach((star, idx) => {
    const team = idx % 2 === 0 ? team1 : team2
    team.push(star)
  })

  // Step 4: Sort remaining by rating
  const remaining = players.filter(p => !p.isStar && !isAssigned(p))
  remaining.sort((a, b) => b.official_rating - a.official_rating)

  // Step 5: Greedy balance - add to team with lower total rating
  remaining.forEach(player => {
    const rating1 = team1.reduce((sum, p) => sum + p.official_rating, 0)
    const rating2 = team2.reduce((sum, p) => sum + p.official_rating, 0)
    
    const team = rating1 <= rating2 ? team1 : team2
    if (team.length < teamSize) {
      team.push(player)
    }
  })

  return [team1, team2]
}
```

---

## 📈 Development Phases

### Phase 1: Backend Setup (Day 1-2)
- [ ] Create Supabase project
- [ ] Set up database tables
- [ ] Configure RLS policies
- [ ] Test database queries
- [ ] Create admin user (you)

### Phase 2: Authentication (Day 3)
- [ ] Build login screen
- [ ] Build signup screen
- [ ] Implement email/password auth
- [ ] Implement Google OAuth
- [ ] Session management
- [ ] Protected routes

### Phase 3: Player Management (Day 4-5)
- [ ] Dashboard screen
- [ ] Create/edit/delete teams
- [ ] Add/remove players
- [ ] Player profiles
- [ ] Sync with Supabase

### Phase 4: Rating System (Day 6-8)
- [ ] Community rating UI
- [ ] Submit ratings
- [ ] View ratings (players)
- [ ] Admin rating panel
- [ ] Average calculations
- [ ] Rating history

### Phase 5: Enhanced Team Generation (Day 9-10)
- [ ] Player selection (who's playing)
- [ ] Rating-based algorithm
- [ ] Position + rating balance
- [ ] Save game history
- [ ] Statistics

### Phase 6: Polish & Deploy (Day 11-12)
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile optimization
- [ ] Testing
- [ ] Deploy

---

## 🚀 Quick Start Guide

### 1. Create Supabase Project
```bash
1. Go to https://supabase.com
2. Create new project
3. Copy URL and anon key
4. Run SQL schema (above)
```

### 2. Install Dependencies
```bash
npm init -y
npm install @supabase/supabase-js
```

### 3. Add Environment Variables
```javascript
// .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Initialize Supabase Client
```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## 💰 Cost Estimate

### Supabase Free Tier
- 500 MB database storage
- 50,000 monthly active users
- 1 GB file storage
- 2 GB bandwidth

**For your use case: 100% FREE** ✅

### Vercel (Current)
- Already hosting
- No additional cost

**Total: $0/month** 🎉

---

## 🔒 Security Considerations

1. **Row Level Security (RLS)** - Enforced at database level
2. **Admin verification** - Only you can set official ratings
3. **Rate limiting** - Prevent spam ratings
4. **Input validation** - Sanitize all user inputs
5. **HTTPS only** - Vercel provides this automatically

---

## 📝 Next Steps

1. **Decision:** Approve this plan?
2. **Setup:** Create Supabase project
3. **Start:** Phase 1 - Backend setup
4. **Iterate:** Build one phase at a time
5. **Test:** Each feature before moving on

---

## ❓ Questions to Decide

1. **Rating scale:** 1-10 or 1-5 stars?
2. **Admin list:** Just you or multiple admins?
3. **Public teams:** Can players see other teams?
4. **Rating visibility:** Everyone sees ratings or admin only?
5. **Historical data:** Keep old game results?

---

**Ready to start? Let me know and I'll begin with Phase 1!** 🚀
