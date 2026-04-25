# Password Reset Identity Questions

**Zero-cost password reset flow - Simple identity verification**

---

## Question Types

The system accepts answers that match:

1. **Team name** you belong to
2. **Player name** in one of your teams
3. **Sport type** (basketball or soccer/football)

---

## Example Questions (English / עברית)

### Option 1: Team Name

**English:**
```
What is the name of one team you belong to?
```

**עברית:**
```
מה שם הקבוצה שלך?
```

**Example answers:**
- "Atlit Basketball"
- "קבוצת עתלית"
- "Sunday Night Crew"
- Any partial match of a team name

---

### Option 2: Player Name

**English:**
```
Name one player in your team
```

**עברית:**
```
תן שם של שחקן אחד בקבוצה שלך
```

**Example answers:**
- "David"
- "דוד"
- "Michael Cohen"
- "מיכאל"
- Any partial match of a player name

---

### Option 3: Sport Type

**English:**
```
What sport do you play in this app?
```

**עברית:**
```
איזה ספורט אתה משחק באפליקציה?
```

**Example answers:**
- "basketball"
- "כדורסל"
- "soccer"
- "football"
- "כדורגל"

---

## How It Works (Technical)

### Verification Logic

The system checks if the answer matches:

1. **Team names** - case-insensitive partial match
   - User answer: "atlit"
   - Matches team: "Atlit Basketball"
   
2. **Player names** - case-insensitive partial match
   - User answer: "david"
   - Matches player: "David Cohen"

3. **Sport types** - exact or synonym match
   - "basketball" = "basketball"
   - "soccer" = "football"
   - "כדורסל" = checks if user has basketball teams

### Security Features

✅ **Never reveals if:**
- Phone number exists
- Team name is correct
- Player name is correct
- Answer was close but not exact

❌ **Generic error only:**
```
Unable to verify identity.
```

✅ **Rate limiting:**
- 5 attempts per hour per phone number
- Prevents brute force guessing

---

## UI Implementation

### Forgot Password Screen

Show single question (user's choice):

**Option A: Simple dropdown**
```
Answer one question to reset your password:

[ Dropdown: Select question type ]
  - Name one team you belong to
  - Name one player in your team
  - What sport do you play?

[ Answer input field ]

[ Submit button ]
```

**Option B: Single flexible question (recommended)**
```
To reset your password, answer this question:

Name one team you belong to, OR one player in your team, OR the sport you play

[ Answer input field ]

[ Submit button ]
```

---

## Bilingual Support

### English Screen

```
┌─────────────────────────────────────────┐
│   Forgot Your Password?                 │
│                                         │
│   Answer this question to reset:       │
│                                         │
│   Name one team, player, or sport      │
│                                         │
│   [ ___________________________ ]      │
│                                         │
│   [ Submit ]                           │
│                                         │
│   Or: [ Ask team admin to reset ]     │
└─────────────────────────────────────────┘
```

### Hebrew Screen (RTL)

```
┌─────────────────────────────────────────┐
│                 ?שכחת סיסמה              │
│                                         │
│           :ענה על השאלה כדי לאפס        │
│                                         │
│      תן שם של קבוצה, שחקן, או ספורט    │
│                                         │
│   [ ___________________________ ]      │
│                                         │
│   [ שלח ]                              │
│                                         │
│   [ או: בקש מאדמין לאפס ] :או          │
└─────────────────────────────────────────┘
```

---

## Admin Reset Alternative

If identity question fails or user doesn't remember:

### User sees:
```
Unable to verify identity.

Alternative: Ask your team admin to reset your password from the team member list.
```

### Admin UI (in team member list):

```
Members
├─ David Cohen (Admin)
├─ Michael L. (Member) [Reset Password]
└─ Sarah K. (Member) [Reset Password]
```

When admin clicks "Reset Password":

```
┌─────────────────────────────────────────┐
│   Reset Password                        │
│                                         │
│   Reset password for Michael L.?        │
│                                         │
│   They will need to set a new password │
│   next time they log in.               │
│                                         │
│   [ Cancel ]  [ Confirm Reset ]        │
└─────────────────────────────────────────┘
```

---

## Testing the Flow

### Test 1: Correct team name
```
Phone: +972501234567
Answer: "Atlit"
Result: ✅ Reset token issued
```

### Test 2: Correct player name
```
Phone: +972501234567
Answer: "david"
Result: ✅ Reset token issued
```

### Test 3: Correct sport
```
Phone: +972501234567
Answer: "basketball"
Result: ✅ Reset token issued
```

### Test 4: Wrong answer
```
Phone: +972501234567
Answer: "random text"
Result: ❌ "Unable to verify identity."
```

### Test 5: Non-existent phone
```
Phone: +972509999999
Answer: "anything"
Result: ❌ "Unable to verify identity."
```

### Test 6: Rate limit exceeded
```
Phone: +972501234567
6 failed attempts in 1 hour
Result: ❌ 429 "Too many reset attempts"
```

---

## Summary

**Zero cost:** No SMS, no email, no external services

**Simple:** One flexible question with multiple acceptable answer types

**Secure:** Rate limited, no information leakage, generic errors

**Bilingual:** English and Hebrew support

**Admin fallback:** Team admins can reset if identity question fails
