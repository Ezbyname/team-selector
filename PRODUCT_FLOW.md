# Team Selector - Product Flow

## Product Model

### Single-Operator Session Flow

This app is **NOT** a multi-user social app where players interact with each other.

**Reality:**
- ONE person operates the app (the organizer)
- Opens it on their phone/device
- Makes all decisions about today's game
- Players do NOT need accounts or access

**The operator:**
- Selects the group
- Marks who arrived today
- Adds new players on the spot
- Decides connection rules
- Generates teams

---

## Complete User Flow

### 1. Choose Sport

**Screen:** Sport Selection

**Operator Actions:**
- [ ] Select Basketball or Soccer

**System:**
- Sets sport context for positions

---

### 2. Choose Group

**Screen:** Group Selection

**Operator Actions:**
- [ ] View all groups for this sport
- [ ] Select existing group
- [ ] OR create new group

**System:**
- Loads group players
- Shows player count

---

### 3. View All Players

**Screen:** Player Management

**Operator Sees:**
- All players in the group
- Player names
- Player positions
- (Admin only: ratings, star status)

**Operator Can:**
- [ ] Add new player
- [ ] Edit existing player
- [ ] Delete player
- [ ] Set star status (admin only)
- [ ] Define connections (who plays together)

---

### 4. Add/Edit Player (Inline)

**Important:** This is NOT hidden in admin settings.
**Location:** Accessible at any time during session setup.

**Add New Player:**
```
[Add Player Button]

Modal/Inline Form:
- Player Name: [_____________]
- Position: [Dropdown: Guard/Forward/Center]
- [Save] [Cancel]
```

**System:**
- Adds player to group
- Player is immediately available for selection
- Can be included in today's session right away

**Edit Player:**
```
Click player card → Edit

Modal:
- Name: [Current Name]
- Position: [Current Position]
- (Admin only: Default Rating, Star Status)
- [Save] [Cancel]
```

---

### 5. Mark Who Is Present Today

**Screen:** Session Setup

**Operator Actions:**
- [ ] Check boxes for players who arrived
- [ ] Uncheck players who are absent

**System:**
- Tracks present vs absent
- Only present players go to team generation

**Example:**
```
✅ Player A
✅ Player B
☐  Player C (absent)
✅ Player D
✅ Player E
...

[7 players selected]
```

---

### 6. Define Together Constraints (Optional)

**Screen:** Connection Rules (inline or modal)

**Operator Actions:**
- [ ] Select Player A
- [ ] Select Player B
- [ ] Click "Keep Together"

**System:**
- Creates connection: A must be with B
- If both selected for session → same team
- If one absent → no constraint

**No Mutual Consent:**
- Operator decides
- No approval needed from players
- Unidirectional definition

**Example:**
```
Player A ←→ Player B (together)
Player C ←→ Player D (together)

[Remove Connection] buttons available
```

---

### 7. Generate Teams

**Screen:** Team Generation

**Operator Actions:**
- [ ] Click "Generate Teams"

**System:**
1. Takes selected (present) players
2. Applies connection constraints
3. Balances by rating/position/stars
4. Generates teams

**Auto Team Sizing:**
- 9 players → 4v4 + 1 bench
- 7 players → 3v3 + 1 bench
- 11 players → 5v5 + 1 bench

**Constraints Applied:**
- Connected players on same team (hard rule)
- Star players distributed evenly
- Positions balanced
- Ratings balanced

---

### 8. View Teams

**Screen:** Team Display

**Operator Sees:**

**Regular User:**
- Team 1: Names + Positions
- Team 2: Names + Positions
- Bench: Names + Positions

**Admin/Sub-Admin:**
- All above PLUS:
- Player ratings
- Team totals
- Balance metrics

**Operator Can:**
- [ ] Regenerate (reshuffle with same players)
- [ ] New Session (start over)

---

## Key UX Principles

### 1. Inline Player Management

**DO:**
✅ Show "Add Player" button prominently
✅ Allow adding players during session setup
✅ Make it feel natural and easy

**DON'T:**
❌ Hide player management in admin section
❌ Require separate workflow to add players
❌ Make it feel like a power-user feature

---

### 2. Connection Rules Are Operator-Defined

**DO:**
✅ Operator decides connections
✅ Single-click to connect players
✅ Clear visual indicator
✅ Easy to remove connections

**DON'T:**
❌ Require mutual approval
❌ Send notifications to players
❌ Make it feel like a social feature

---

### 3. Session Is Ephemeral

**Each session:**
- Operator marks who is present
- Sets connections if needed
- Generates teams
- Done

**Next session:**
- Start fresh
- Same group, different attendance
- Re-define connections if needed

---

### 4. Player Data Persists

**Player Profile:**
- Name
- Position
- Default rating (admin-set)
- Star status (admin-set)
- Grading history (admin-only)

**Connections:**
- Stored at group level
- Operator can set/remove any time
- Persists across sessions
- Only applies when both players present

---

## Permissions Model

### Regular User (Operator)

**Can:**
- Select group
- View player names + positions
- Mark attendance
- Add new players
- Set connections
- Generate teams

**Cannot See:**
- Player ratings
- Star status
- Balance metrics
- Grading details

---

### Admin / Sub-Admin

**Can:**
- Everything regular user can do PLUS:
- See ratings
- See star status
- See balance metrics
- Grade players
- Set default ratings
- Manage star designation

---

## Database Model

### Tables

**groups:**
- id, name, location, sport

**players:**
- id, group_id, name, position, default_rating, is_star

**player_connections:**
- id, group_id, player_id, connected_to_id, connection_type
- **Unidirectional** (operator-defined, no mutual)

**game_sessions:**
- id, group_id, session_date, status

**session_players:**
- id, session_id, player_id
- (tracks who was present for this session)

---

## Example Session Flow

### Scenario: Basketball Game at Park

**Operator:** Alex (has the app)

**Step 1:** Open app → Choose Basketball

**Step 2:** Select group "Wednesday Night Pickup"

**Step 3:** View players (15 total in group)
```
Player A - Guard
Player B - Guard
Player C - Forward
...
Player O - Center
```

**Step 4:** Someone new shows up!
- Click [+ Add Player]
- Name: "Player P"
- Position: Forward
- Save
- Player P now in list

**Step 5:** Mark who arrived today
```
✅ Player A
✅ Player B
☐  Player C (absent)
✅ Player D
☐  Player E (absent)
✅ Player F
✅ Player G
✅ Player H
✅ Player I
✅ Player P (the new player!)

[9 players selected]
```

**Step 6:** Set connections
- Player A wants to play with Player D (they always play together)
- Click Player A card → "Connect To" → Select Player D
- Connection created: A ←→ D

**Step 7:** Generate Teams
- Click "Generate Teams"
- System: 9 players → 4v4 + 1 bench
- System: A and D must be together
- System: Balance the rest

**Step 8:** View Result
```
Team 1 (Blue):
- Player A (Guard)    ← Connected pair
- Player D (Forward)  ← Connected pair
- Player F (Center)
- Player I (Guard)

Team 2 (Red):
- Player B (Guard)
- Player G (Forward)
- Player H (Center)
- Player P (Forward)

Bench:
- Player X
```

**Step 9:** Operator shows phone to players
- "Blue team: A, D, F, I"
- "Red team: B, G, H, P"
- "X starts on bench, rotate in next game"

**Done!**

---

## API Endpoints

### Groups
- `GET /api/groups/list` - List all groups
- `POST /api/groups/create` - Create group

### Players
- `GET /api/players/list?groupId=...` - List players in group
- `POST /api/players/add` - Add player to group
- `POST /api/players/update` - Edit player
- `DELETE /api/players/delete` - Remove player

### Connections
- `GET /api/connections/list?groupId=...` - List connections
- `POST /api/connections/add` - Create connection
- `DELETE /api/connections/remove` - Remove connection

### Sessions
- `POST /api/sessions/create` - Start new session
- `POST /api/sessions/select-players` - Mark attendance
- `POST /api/sessions/generate-teams` - Generate balanced teams

---

## Frontend Screen Structure

### Recommended Flow

```
1. [Sport Selection]
      ↓
2. [Group Selection]
      ↓
3. [Session Setup]
   - Player List
   - [+ Add Player] button (prominent)
   - Checkboxes for attendance
   - Connection indicators
   - [Manage Connections] button
   - Auto team size display
   - [Generate Teams] button
      ↓
4. [Team Display]
   - Team 1
   - Team 2
   - Bench
   - [Regenerate] [New Session] buttons
```

---

## Connection UI Mockup

### Option A: Inline Connections

```
┌─────────────────────────────────┐
│ Session Setup                   │
├─────────────────────────────────┤
│                                 │
│ ☑ Player A (Guard) 🔗           │
│   └─ Connected to: Player D     │
│                                 │
│ ☑ Player B (Forward)            │
│                                 │
│ ☐ Player C (Center)             │
│                                 │
│ ☑ Player D (Forward) 🔗         │
│   └─ Connected to: Player A     │
│                                 │
│ [+ Add Player]                  │
│                                 │
│ ─────────────────────────       │
│                                 │
│ 9 players selected              │
│ Teams: 4v4 + 1 bench            │
│                                 │
│ [Generate Teams]                │
│                                 │
└─────────────────────────────────┘
```

### Option B: Modal for Connections

```
Click player → Show actions:
┌─────────────────────┐
│ Player A            │
├─────────────────────┤
│ [✓] Include Today   │
│ [🔗] Connect To...  │
│ [✏️] Edit Player    │
└─────────────────────┘

If click "Connect To":
┌─────────────────────────┐
│ Connect Player A to:    │
├─────────────────────────┤
│ ☐ Player B              │
│ ☐ Player C              │
│ ☑ Player D ✓            │
│ ☐ Player E              │
│                         │
│ [Save] [Cancel]         │
└─────────────────────────┘
```

---

## Migration Path

### From Current State

1. ✅ Groups exist
2. ✅ Players exist
3. ✅ Sessions exist
4. ✅ Team generation works
5. ⚠️ Connections need migration (006)
6. ⚠️ Frontend needs "Add Player" button
7. ⚠️ Frontend needs connection UI

### Required Changes

**Backend:**
- [x] Migration 006 (unidirectional connections)
- [x] Connection API endpoints
- [ ] Update players API to return connections

**Frontend:**
- [ ] Add "Add Player" button to session setup
- [ ] Add player modal/form
- [ ] Add connection UI (inline or modal)
- [ ] Show connection indicators
- [ ] Allow removing connections

---

## Testing Checklist

### Add Player Flow
- [ ] Click "Add Player" during session setup
- [ ] Enter name + position
- [ ] Player appears in list immediately
- [ ] Can check player for today's session
- [ ] Can connect new player to others

### Connection Flow
- [ ] Connect Player A to Player B
- [ ] Both selected for session
- [ ] Generate teams → A and B on same team
- [ ] Reshuffle → A and B still together
- [ ] Test 10 times → 100% together

### Attendance Flow
- [ ] Check 9 players
- [ ] Generate teams → 4v4 + 1 bench
- [ ] Uncheck 2 players (now 7)
- [ ] Generate teams → 3v3 + 1 bench

### Connection + Absence
- [ ] A connected to B
- [ ] Only A selected (B absent)
- [ ] Generate teams → No error
- [ ] A can be on any team (no constraint)

---

## Success Criteria

✅ Operator can add player during session setup
✅ Adding player feels natural, not hidden
✅ Operator can connect players easily
✅ Connected players NEVER split if both present
✅ Connections persist across sessions
✅ No mutual approval needed
✅ Single-operator flow clear and intuitive

---

**Product Model:** Single-operator session flow
**Connection Model:** Operator-defined, unidirectional
**Player Management:** Inline and accessible
**Session Flow:** Linear and intuitive
