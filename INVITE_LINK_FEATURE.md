# Invite Link & Share Flow

**Status:** ✅ **COMPLETE**  
**Date:** 2026-04-24

---

## Overview

Invite links provide a WhatsApp/Telegram-style sharing experience for team invites. Admins can generate shareable links that automatically join users to their team.

**Key Features:**
- One-click share via Web Share API
- Clipboard fallback for desktop
- Login redirect with code preservation
- Clear error states (invalid, revoked, expired)
- Already-member handling (non-error UX)
- Full mobile + desktop support

---

## User Flows

### Admin: Share Invite Link

1. Navigate to **My Teams** page
2. Find team with admin role
3. Click **"📤 Manage Invites"** button
4. Modal shows:
   - Invite code (e.g., `ATLIT-4B2C`)
   - Invite link (e.g., `https://app.com/join/ATLIT-4B2C`)
   - Actions: Copy Code, Copy Link, Share, Regenerate, Revoke

**Share Options:**
- **Mobile:** Web Share API (native share sheet)
- **Desktop:** Copy to clipboard (fallback)
- Toast notification: "Link copied!"

---

### User: Join via Invite Link

#### If Logged In:

1. Open invite link: `/join/ATLIT-4B2C`
2. See team preview (name, sport, member count)
3. Click **"Join Team"**
4. Success → Redirected to team page

#### If NOT Logged In:

1. Open invite link: `/join/ATLIT-4B2C`
2. Automatically redirected to login page
3. Invite code stored in `sessionStorage`
4. After login → Auto-continue to join flow
5. Success → Redirected to team page

---

### Edge Cases

#### Already Member:

```
You are already a member of this team.

[ Open Team ]
[ Back to Teams ]
```

**Status:** 200 OK (idempotent)  
**NOT an error** - clean UX

#### Invalid Code:

```
This invite link is invalid.
The invite code does not exist or has been removed.
```

**Status:** 404 Not Found

#### Revoked Code:

```
This invite link is no longer active.
The team admin has revoked this invite code.
```

**Status:** 403 Forbidden

#### Expired Code:

```
This invite link has expired.
Please ask the team admin for a new invite link.
```

**Status:** 403 Forbidden

---

## Technical Implementation

### Files Created

1. **`frontend/join.html`** - Invite link landing page
   - Parses code from URL
   - Handles all join states
   - Auto-login redirect

2. **`frontend/components/invite-manage-modal.html`** - Admin invite UI
   - Fetch/create invite code
   - Share functionality (Web Share API + clipboard)
   - Regenerate/revoke actions

3. **`test-invite-link.js`** - Automated test suite (9 suites, 100% pass)

### Files Modified

1. **`frontend/my-teams.html`**
   - Added "Manage Invites" button (admin only)
   - Loads invite-manage-modal component

2. **`frontend/login.html`**
   - Checks `sessionStorage.pendingInviteCode` after login
   - Redirects to join flow if pending code exists

3. **`vercel.json`**
   - Added rewrite: `/join/:code` → `/join.html`

4. **`package.json`**
   - Added `test:invite-link` script

---

## Code Structure

### URL Format

```
/join/{inviteCode}
```

**Example:**
```
https://teamselect.app/join/ATLIT-4B2C
```

**Dynamic Origin:**
```javascript
const appOrigin = window.location.origin;
const inviteLink = `${appOrigin}/join/${inviteCode}`;
```

Works on:
- `http://localhost:3000`
- `https://preview.vercel.app`
- `https://production-domain.com`

---

### Login Redirect Preservation

**On `/join.html` (not logged in):**
```javascript
sessionStorage.setItem('pendingInviteCode', inviteCode);
window.location.href = '/login.html?redirect=join';
```

**After successful login:**
```javascript
const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
if (pendingInviteCode) {
  sessionStorage.removeItem('pendingInviteCode');
  window.location.href = `/join/${pendingInviteCode}`;
  return;
}
```

**Result:** Seamless login → auto-join flow

---

### Share Flow

#### Web Share API (Mobile):

```javascript
if (navigator.share) {
  await navigator.share({
    title: `Join ${teamName}`,
    text: `Join my team on Team Selector`,
    url: inviteLink
  });
}
```

**Fallback (Desktop):**
```javascript
else {
  await navigator.clipboard.writeText(inviteLink);
  showToast('Link copied to clipboard!');
}
```

---

## API Integration

**Invite link is a UX layer** over existing secure invite-code API.

**No new backend endpoints needed.**

Uses existing:
- `POST /api/groups/create-invite` - Create/get code
- `POST /api/groups/join-by-code` - Join team
- `POST /api/groups/revoke-invite` - Revoke code

All existing security guarantees maintained:
- ✅ Auth required (JWT)
- ✅ Rate limiting (5 attempts/min)
- ✅ Role safety (always `user`)
- ✅ 403 vs 404 distinction
- ✅ Idempotent joins
- ✅ Active membership uniqueness

---

## Security Guarantees

### 1. **Authentication Required**

Invite links do NOT bypass auth.

- Logged out users → redirected to login
- Invalid tokens → 401 Unauthorized
- No anonymous access

### 2. **Role Safety**

Joining via invite ALWAYS creates `role='user'`.

- Cannot elevate to admin via invite
- Admin role requires explicit promotion

### 3. **Rate Limiting**

Join attempts are rate-limited (5 per minute per user).

- Prevents brute-force code enumeration
- Returns 429 with `retryAfter` seconds

### 4. **Code Validation**

All validations from `INVITE_CODE_RULES.md` apply:

- Invalid code → 404
- Revoked code → 403
- Expired code → 403
- One active code per group
- Code normalization (uppercase, trim)

### 5. **Concurrency Safety**

- DB-level unique constraint (active memberships)
- Race condition handling (idempotent success)
- No duplicate memberships possible

---

## Test Coverage

**Test Suite:** `test-invite-link.js`

**Results:** 9/9 suites passing (100%)

**Suites:**
1. ✅ Invite Link Format
2. ✅ Join via Invite Link (Logged In User)
3. ✅ Already Member Flow
4. ✅ Invalid Link Handling
5. ✅ Revoked Link Handling
6. ✅ Expired Link Handling
7. ✅ Security - Auth Required
8. ✅ Security - Role Safety
9. ✅ Rate Limiting

**Run tests:**
```bash
npm run test:invite-link
```

---

## UI Components

### Invite Management Modal

**Triggered by:** Admin clicks "Manage Invites" on team card

**Shows:**
- Current invite code
- Full invite link
- Copy Code button
- Copy Link button
- Share button (Web Share API)
- Regenerate Code button
- Revoke Code button

**Toast Notifications:**
- "Code copied to clipboard!"
- "Link copied to clipboard!"
- "Shared successfully!"
- "New code generated!"
- "Code revoked successfully"

---

### Join Landing Page

**States:**

1. **Loading** - Fetching invite details
2. **Join Preview** - Show team name, allow join
3. **Already Member** - "Open Team" button
4. **Success** - "Welcome to [Team]!" with redirect
5. **Error** - Invalid/revoked/expired with clear message

**Mobile Optimized:**
- Full-screen layout
- Large touch targets
- Responsive design
- RTL support (Hebrew)

---

## Admin UI Location

**Current:** Team cards in `my-teams.html`

**Admin-only button:**
```html
<button class="team-invite-btn" onclick="manageInvites(groupId, teamName)">
  📤 Manage Invites
</button>
```

**Shown only for:** `team.role === 'admin'`

**Future Enhancement:** Dedicated team settings page

---

## Browser Support

**Web Share API:**
- ✅ iOS Safari 12+
- ✅ Android Chrome 61+
- ✅ Android Firefox 79+
- ❌ Desktop (fallback to clipboard)

**Clipboard API:**
- ✅ All modern browsers
- ✅ Requires HTTPS (or localhost)

**Graceful Degradation:**
- Share button → Copy Link (if Web Share not available)
- Always functional, never breaks

---

## Future Enhancements

### Optional Features:

1. **QR Code Generation**
   - Generate QR code for invite link
   - Easy scanning for in-person invites

2. **Invite Analytics**
   - Track who joined via which code
   - See invite link performance

3. **Custom Expiration UI**
   - Admin sets expiration time
   - Visual countdown timer

4. **Bulk Invite Management**
   - Manage invites for multiple teams
   - View all active codes

5. **Invite Link Preview**
   - OpenGraph metadata
   - Rich previews in WhatsApp/Telegram/iMessage

---

## Definition of Done ✅

**Requirements Met:**

- ✅ Admin can generate/copy/share invite link
- ✅ User can open link and join smoothly
- ✅ Login redirect preserves invite code
- ✅ All error states are clear
- ✅ All tests pass (9/9 suites)
- ✅ No regression to existing invite-code behavior
- ✅ Web Share API with clipboard fallback
- ✅ Already-member shows "Open Team" (not error)
- ✅ Invite links do not bypass auth
- ✅ Invite links do not grant elevated role
- ✅ Invite links respect rate limiting

---

## Production Checklist

Before deploying:

- ✅ All tests pass (100%)
- ✅ Vercel routing configured
- ✅ Mobile tested (iOS + Android)
- ✅ Desktop tested (Chrome, Firefox, Safari)
- ✅ Share flow tested (native + fallback)
- ✅ Login redirect tested
- ✅ Error states verified
- ✅ Security reviewed (auth, rate limiting, role safety)

---

## Summary

**What Changed:**

- Added invite link landing page (`/join/{code}`)
- Added admin invite management UI
- Added share functionality (Web Share API + clipboard)
- Added login redirect with code preservation
- Added comprehensive error handling
- Added 9 automated test suites

**What Stayed the Same:**

- All invite code backend logic (unchanged)
- All security guarantees (unchanged)
- All API endpoints (unchanged)
- All database schema (unchanged)

**Result:**

Invite codes now have a **production-ready UX layer** that feels like WhatsApp/Telegram invite sharing.

---

Last Updated: 2026-04-24  
Test Pass Rate: 100% (9/9 suites)  
Status: **PRODUCTION READY** ✅
