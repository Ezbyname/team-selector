# Phase 3A: Screen Structure & User Flow

## Overview

**Phase 3A:** Functional UX with mobile usability
**Phase 3B:** Hebrew/RTL + Visual refresh (immediate next step)

---

## Complete User Flow

```
[Login] → [Sport Selection] → [Group Selection] → [Session Setup] → [Team Display]
                                                          ↓
                                                   [Add Player Modal]
                                                   [Connection Modal]
```

---

## Screen 1: Sport Selection

**Purpose:** Choose basketball or soccer

**Layout:**
```
┌─────────────────────────────────────┐
│  Team Selector                      │
├─────────────────────────────────────┤
│                                     │
│  Choose Your Sport                  │
│                                     │
│  ┌───────────┐  ┌───────────┐     │
│  │    🏀     │  │    ⚽     │     │
│  │Basketball │  │  Soccer   │     │
│  └───────────┘  └───────────┘     │
│                                     │
│                                     │
│  [Logout]                           │
│                                     │
└─────────────────────────────────────┘
```

**Actions:**
- Tap Basketball → Go to Group Selection (basketball)
- Tap Soccer → Go to Group Selection (soccer)

---

## Screen 2: Group Selection

**Purpose:** Choose existing group or create new

**Layout:**
```
┌─────────────────────────────────────┐
│  ← Back    Basketball Groups        │
├─────────────────────────────────────┤
│                                     │
│  [+ Create New Group]               │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Wednesday Night Pickup        │ │
│  │ Location: Central Park        │ │
│  │ 12 players                    │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Weekend League                │ │
│  │ Location: Sports Center       │ │
│  │ 8 players                     │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Actions:**
- Tap group → Go to Session Setup
- [+ Create New Group] → Create group modal (name, location) → Go to Session Setup

---

## Screen 3: Session Setup (MAIN SCREEN)

**Purpose:** Select players, manage connections, generate teams

**This is the primary operator screen.**

### Layout (Mobile)

```
┌─────────────────────────────────────────────────┐
│  ← Back    Wednesday Night Pickup               │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  🏀 Select Players Present Today          ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                  │
│  [+ Add New Player]  [🔗 Manage Connections]    │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ ☑ John Doe          Guard       🔗→2    │   │
│  │   Connected to: Jane, Mike              │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ ☑ Jane Smith        Forward     🔗→1    │   │
│  │   Connected to: John                    │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ ☑ Mike Johnson      Center      🔗→1    │   │
│  │   Connected to: John                    │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Alice Brown       Guard               │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Bob Wilson        Forward             │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ─────────────────────────────────────────────  │
│                                                  │
│  9 players selected                              │
│  Teams: 4v4 + 1 bench                           │
│                                                  │
│  [Generate Teams]                                │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Key Elements

#### 1. Add Player Button Location
```
[+ Add New Player]
```
- **Position:** Top, immediately below section title
- **Prominence:** Primary action button style
- **Always visible:** Not hidden or buried
- **Mobile:** Full width on small screens

#### 2. Player Cards
```
┌─────────────────────────────────────────┐
│ ☑ John Doe          Guard       🔗→2    │
│   Connected to: Jane, Mike              │
│   [Edit] [Connect] [Delete]              │
└─────────────────────────────────────────┘
```

**Structure:**
- Checkbox (left): Select for session
- Name (main): Player name
- Position (right of name): Position label
- Connection badge (🔗→2): Shows connection count
- Connection details (below): "Connected to: Jane, Mike"
- Actions (on tap/long-press): Edit, Connect, Delete

**States:**
- Checked: Highlighted background (light blue)
- Unchecked: White/default background
- Connected: Shows 🔗 badge + connection details

#### 3. Manage Connections Button
```
[🔗 Manage Connections]
```
- **Position:** Top, next to Add Player button
- **Opens:** Connection management modal
- **Badge:** Shows total connection count (optional)

#### 4. Team Size Display
```
9 players selected
Teams: 4v4 + 1 bench
```
- **Position:** Bottom, above Generate Teams button
- **Auto-calculated:** Updates as players checked/unchecked
- **Formula:** (n-1)/2 per team

#### 5. Generate Teams Button
```
[Generate Teams]
```
- **Position:** Bottom of screen
- **Style:** Large, primary button
- **Disabled state:** If < 2 players selected
- **Action:** Create session → Generate teams → Go to Team Display

---

## Screen 4: Add Player Modal

**Trigger:** Tap [+ Add New Player]

**Layout (Mobile Full Screen):**
```
┌────────────────────────────────────────┐
│  Add New Player                   [×]  │
├────────────────────────────────────────┤
│                                        │
│  Player Name *                         │
│  ┌──────────────────────────────────┐ │
│  │ [Enter name________________]     │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Position                              │
│  ┌──────────────────────────────────┐ │
│  │ [Select Position ▼]              │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Options:                              │
│  - Guard                               │
│  - Forward                             │
│  - Center                              │
│  - No Position                         │
│                                        │
│  ☑ Include in today's session          │
│                                        │
│                                        │
│  [Cancel]          [Add Player]        │
│                                        │
└────────────────────────────────────────┘
```

**Fields:**
- **Player Name:** Required text input
- **Position:** Dropdown (Guard, Forward, Center, No Position)
- **Include in session:** Checkbox (default: checked)

**Validation:**
- Name required (min 2 characters)
- Position optional (defaults to "No Position")

**Actions:**
- [Cancel]: Close modal, no changes
- [Add Player]: 
  1. POST /api/players/add
  2. Add to group permanently
  3. If "Include" checked: Add to current session
  4. Close modal
  5. Show player in list
  6. Show success toast: "Player added"

---

## Screen 5: Connection Management Modal

**Trigger:** Tap [🔗 Manage Connections]

**Layout (Mobile Full Screen):**
```
┌────────────────────────────────────────┐
│  Manage Connections              [×]   │
├────────────────────────────────────────┤
│                                        │
│  Current Connections                   │
│                                        │
│  ┌────────────────────────────────┐   │
│  │ John Doe ↔ Jane Smith         │   │
│  │   Source: Group default       │   │
│  │   [Override] [Remove]         │   │
│  └────────────────────────────────┘   │
│                                        │
│  ┌────────────────────────────────┐   │
│  │ John Doe ↔ Mike Johnson       │   │
│  │   Source: Session override    │   │
│  │   [Remove Override]            │   │
│  └────────────────────────────────┘   │
│                                        │
│  ──────────────────────────────────   │
│                                        │
│  Add New Connection                    │
│                                        │
│  Select Player 1:                      │
│  [John Doe ▼]                          │
│                                        │
│  Select Player 2:                      │
│  [Select... ▼]                         │
│                                        │
│  Connection Type:                      │
│  [✓] This session only                 │
│  [ ] Save as group default             │
│                                        │
│  [Add Connection]                      │
│                                        │
│  [Done]                                │
│                                        │
└────────────────────────────────────────┘
```

### Connection Display Logic

**1. Group Default Connection**
```
┌────────────────────────────────┐
│ John Doe ↔ Jane Smith         │
│   Source: Group default       │  ← Gray text
│   [Override] [Remove]         │
└────────────────────────────────┘
```

**Actions:**
- [Override]: Add session-specific connection (same pair)
  - Hides group default for this session
  - Shows as session override
- [Remove]: Delete group connection permanently
  - Requires confirmation: "This will remove the connection for all future sessions. Continue?"

**2. Session Override Connection**
```
┌────────────────────────────────┐
│ John Doe ↔ Mike Johnson       │
│   Source: Session override    │  ← Blue text
│   [Remove Override]            │
└────────────────────────────────┘
```

**Actions:**
- [Remove Override]: Delete session connection only
  - Group default (if exists) applies again
  - No confirmation needed (session-specific)

**3. New Connection (No Existing)**
```
┌────────────────────────────────┐
│ Alice Brown ↔ Bob Wilson      │
│   Source: [None yet]          │
│   [Add New] button below      │
└────────────────────────────────┘
```

### Add Connection Form

**Fields:**
- **Player 1:** Dropdown (players in session)
- **Player 2:** Dropdown (players in session, excluding Player 1)
- **Type:** Radio buttons
  - ✓ This session only (default)
  - Save as group default

**Validation:**
- Cannot connect player to themselves
- Cannot create duplicate connection
- Group size limit enforced (basketball: 4, soccer: 10)
  - Error shown if would exceed limit

**Actions:**
- [Add Connection]:
  1. If "session only": POST /api/sessions/add-connection
  2. If "group default": POST /api/connections/add
  3. Update UI immediately
  4. Show success toast

---

## Screen 6: Player Action Menu

**Trigger:** Long-press or tap ••• on player card

**Layout (Bottom Sheet):**
```
┌────────────────────────────────┐
│  John Doe                      │
├────────────────────────────────┤
│                                │
│  [🔗] Manage Connections       │
│                                │
│  [✏️] Edit Player              │
│                                │
│  [🗑️] Delete Player            │
│                                │
│  [Cancel]                      │
│                                │
└────────────────────────────────┘
```

**Actions:**

**1. Manage Connections:**
- Open connection modal pre-filled with this player
- Focus on connections involving this player

**2. Edit Player:**
```
┌────────────────────────────────┐
│  Edit Player               [×] │
├────────────────────────────────┤
│                                │
│  Name *                        │
│  [John Doe____________]        │
│                                │
│  Position                      │
│  [Guard ▼]                     │
│                                │
│  [Cancel]  [Save]              │
│                                │
└────────────────────────────────┘
```
- POST /api/players/update
- Updates group player (permanent)

**3. Delete Player:**
- Confirmation: "Delete John Doe from the group? This cannot be undone."
- [Cancel] [Delete]
- DELETE /api/players/delete
- Removes from group permanently
- Removes from current session if selected

---

## Screen 7: Team Display

**No changes from current implementation**

```
┌────────────────────────────────────────┐
│  ← New Session    Teams                │
├────────────────────────────────────────┤
│                                        │
│  [Regenerate Teams]                    │
│                                        │
│  Team 1                Total: 33       │
│  ┌──────────────────────────────────┐ │
│  │ John Doe         Guard           │ │
│  │ Jane Smith       Forward         │ │
│  │ Mike Johnson     Center          │ │
│  │ Alice Brown      Guard           │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Team 2                Total: 33       │
│  ┌──────────────────────────────────┐ │
│  │ Bob Wilson       Forward         │ │
│  │ Carol Davis      Center          │ │
│  │ Dave Miller      Guard           │ │
│  │ Eve Thompson     Forward         │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Bench                                 │
│  ┌──────────────────────────────────┐ │
│  │ Frank Harris     Center          │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

---

## Exact User Flow Examples

### Example 1: Add Player During Setup

```
1. User: Tap [Session Setup] for "Wednesday Night"
   → Screen shows player list

2. User: Tap [+ Add New Player]
   → Modal opens

3. User: Enter name "Tom Wilson"
4. User: Select position "Forward"
5. User: Leave "Include in today's session" checked
6. User: Tap [Add Player]

7. System:
   - POST /api/players/add
   - Adds to group
   - Modal closes
   - Tom Wilson appears in list (checked)
   - Toast: "Player added"

8. User: Can immediately connect Tom to others
9. User: Can generate teams with Tom included
```

---

### Example 2: Modify Connection for Session Only

```
1. User: In Session Setup
2. User: Tap [🔗 Manage Connections]
   → Connection modal opens

3. User: Sees existing connection:
   "John ↔ Jane (Group default)"

4. User: Wants John with Mike today (not Jane)

5. User: In "Add New Connection":
   - Player 1: John
   - Player 2: Mike
   - Type: ✓ This session only
   - Tap [Add Connection]

6. System:
   - POST /api/sessions/add-connection
   - Shows "John ↔ Mike (Session override)"
   - John-Jane connection still exists in group
   - But for THIS session, John with Mike

7. User: Tap [Done]
8. User: Tap [Generate Teams]
   → John and Mike on same team (Jane separate)

9. Next session:
   → John-Jane group default applies again
```

---

### Example 3: Permanent Group Connection

```
1. User: In Session Setup
2. User: Tap [🔗 Manage Connections]

3. User: In "Add New Connection":
   - Player 1: Alice
   - Player 2: Bob
   - Type: [ ] This session only
   - Type: [✓] Save as group default
   - Tap [Add Connection]

4. System:
   - POST /api/connections/add
   - Alice ↔ Bob saved permanently
   - Shows "Alice ↔ Bob (Group default)"

5. Future sessions:
   → Alice-Bob connection applies automatically
```

---

## Mobile Responsive Behavior

### Breakpoints

```css
/* Mobile (default) */
- Single column layout
- Full-width buttons
- Stack elements vertically
- Bottom sheets for modals

/* Tablet (768px+) */
- Two-column layout (player list | connections)
- Side-by-side buttons
- Modal dialogs (not bottom sheets)

/* Desktop (1024px+) */
- Three-column layout (groups | players | connections)
- Persistent connection panel
- Larger touch targets
```

### Touch Targets

```css
/* All interactive elements */
min-height: 56px;
min-width: 56px;
padding: 16px;

/* Tap area includes visible element + padding */
```

### Gestures

- **Tap:** Select/deselect
- **Long-press:** Open action menu
- **Swipe down:** Dismiss modal/bottom sheet
- **Pull to refresh:** Reload player list (optional)

---

## Visual Hierarchy (3A - Functional)

**Phase 3A focuses on structure, not visual design.**

**Colors (Functional Only):**
- Primary action: Blue (#2196F3)
- Destructive action: Red (#F44336)
- Success: Green (#4CAF50)
- Background: White/Light gray
- Text: Dark gray (#333)

**Typography (Clear, Readable):**
- Headers: 20px, bold
- Body: 16px, regular
- Labels: 14px, medium
- Metadata: 12px, light

**Phase 3B will introduce:**
- Brand colors (vibrant, playful)
- Custom typography
- Animations
- Delight elements

---

## Session Override vs Group Default (Summary)

### Visual Distinction

**Group Default:**
```
Source: Group default  ← Gray text, subtle
[Override] [Remove]    ← Two actions
```

**Session Override:**
```
Source: Session override  ← Blue text, prominent
[Remove Override]         ← One action (temporary)
```

### Behavior

| Action | Group Default | Session Override |
|--------|--------------|------------------|
| Remove | Deletes permanently | Reverts to group default |
| Override | Creates session override | N/A (already override) |
| Persistence | All future sessions | Current session only |
| Confirmation | Yes ("Delete permanently?") | No (temporary) |

---

## Ready to Proceed?

This document defines:
✅ Final screen structure
✅ Exact user flow
✅ Where Add Player appears (top, prominent)
✅ Where connection editing appears (modal)
✅ How session overrides shown (blue) vs group defaults (gray)

**Phase 3A Implementation can begin once approved.**
**Phase 3B (Hebrew/RTL + Visual) will immediately follow.**
