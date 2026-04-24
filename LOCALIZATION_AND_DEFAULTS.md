# Localization & Default Settings

## Super Admin Locale Configuration

### Primary Super Admin
**User:** Erez  
**Phone:** +972525502281  
**Country:** Israel 🇮🇱  
**Timezone:** Asia/Jerusalem (UTC+2/+3 with DST)  
**Language:** Hebrew (he-IL) / English (en-US)  
**Date Format:** DD/MM/YYYY (Israeli standard)  
**Time Format:** 24-hour (e.g., 15:00, not 3:00 PM)

---

## Default Settings Rules

### Rule 1: Country Selector Defaults to Israel
**Why:** Primary super admin is from Israel

**Implementation:**
```javascript
// frontend/auth.js - Default country state
if (window.authState) {
  authState.countryCode = '+972';  // Israel
}

if (phonePrefix) {
  phonePrefix.textContent = '+972';
}

if (selectedFlag) {
  selectedFlag.src = 'https://flagcdn.com/w40/il.png';
  selectedFlag.alt = 'IL';
}

if (selectedCode) {
  selectedCode.textContent = 'IL';
}
```

**Status:** ✅ Already implemented

---

### Rule 2: Preferred Countries Order
**Order in dropdown:**
1. 🇮🇱 Israel (+972) - **Super admin's country**
2. 🇺🇸 USA (+1) - Common alternative
3. --- Divider ---
4. All other countries (alphabetically)

**Rationale:** 
- Most users will be Israeli (super admin's network)
- USA as secondary for international users
- Easy access to primary countries

**Status:** ✅ Already implemented

---

### Rule 3: Timezone for System Operations
**Default Timezone:** `Asia/Jerusalem` (Israel)

**Use Cases:**
- Session scheduling
- Game time display
- "Today's games" queries
- Notification timing
- Report generation timestamps

**Implementation:**
```javascript
// Server-side default
const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

// When creating sessions
const sessionTime = new Date(userInputTime);
const israelTime = moment.tz(sessionTime, 'Asia/Jerusalem');

// Display to users
const displayTime = israelTime.format('DD/MM/YYYY HH:mm');
```

**Status:** ⚠️ Needs implementation

---

### Rule 4: Date & Time Format
**Date Format:** DD/MM/YYYY (Israeli/European standard)
- Example: 24/04/2026
- Not: 04/24/2026 (US format)

**Time Format:** 24-hour
- Example: 15:30
- Not: 3:30 PM

**Why:** Israeli standard, less ambiguous

**Implementation:**
```javascript
// Format dates consistently
function formatDate(date) {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

// Format times
function formatTime(date) {
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false  // 24-hour format
  }).format(date);
}
```

**Status:** ⚠️ Needs implementation

---

### Rule 5: Primary Language
**Default:** English (en-US)  
**Secondary:** Hebrew (he-IL) - Future support

**Why Start with English:**
- Code/UI already in English
- International player base
- Easier for development/debugging

**Hebrew Support (Future):**
- Right-to-left (RTL) layout
- Hebrew translations for UI
- Hebrew player names support
- Mixed Hebrew/English content

**Implementation Priority:**
1. ✅ English UI (current)
2. ⚠️ RTL support (future)
3. ⚠️ Hebrew translations (future)
4. ⚠️ Language switcher (future)

---

### Rule 6: Phone Number Display
**Display Format:** Israeli convention

**Input:** User enters without formatting
```
User types: 0525502281
```

**Storage:** E.164 international format
```
Database: +972525502281
```

**Display:** Israeli local format with dashes
```
Show as: 052-550-2281
```

**Implementation:**
```javascript
function formatIsraeliPhone(phone) {
  // Remove country code if present
  const local = phone.replace('+972', '0');
  
  // Format: 0XX-XXX-XXXX
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  
  return local;
}

// Usage
const display = formatIsraeliPhone('+972525502281');
// Returns: "052-550-2281"
```

**Status:** ⚠️ Needs implementation

---

## Sports Configuration

### Default Sports
Based on Israeli preferences:

1. **Basketball** 🏀
   - Most popular organized sport in Israel
   - Default positions: Point Guard, Shooting Guard, Small Forward, Power Forward, Center

2. **Soccer** ⚽ (Football)
   - Most popular overall in Israel
   - Default positions: Goalkeeper, Defender, Midfielder, Forward

**Future Sports:**
- Volleyball (popular in Israel)
- Team Handball (Israeli favorite)
- Beach sports variants

---

## Regional Settings

### Currency (Future)
**Primary:** ILS (Israeli Shekel) ₪  
**Display:** ₪99 or 99 ₪

**Use Cases:**
- Paid sessions
- Team fees
- Equipment costs

---

### Working Week
**Israeli Standard:**
- Sunday - Thursday: Working days
- Friday: Short day (until ~14:00)
- Saturday (Shabbat): Day off
- Sunday is first day of week (not Monday)

**Impact on Scheduling:**
- "Weekend games" = Friday afternoon + Saturday
- Default session days = Sunday-Thursday evenings
- Calendar starts on Sunday

**Implementation:**
```javascript
// Calendar configuration
const WEEK_START = 0;  // Sunday (Israeli standard)
const WEEKEND = [5, 6];  // Friday, Saturday

// Session scheduling defaults
const POPULAR_GAME_TIMES = {
  sunday: ['19:00', '20:00', '21:00'],
  monday: ['19:00', '20:00', '21:00'],
  tuesday: ['19:00', '20:00', '21:00'],
  wednesday: ['19:00', '20:00', '21:00'],
  thursday: ['19:00', '20:00', '21:00'],
  friday: ['10:00', '11:00', '12:00'],  // Morning games
  saturday: ['10:00', '17:00', '18:00']  // Post-Shabbat
};
```

---

## Multi-Region Support (Future)

### When Adding International Users

**Automatic Detection:**
```javascript
function detectUserLocale(user) {
  // 1. Check user's country code from phone
  const countryFromPhone = getCountryFromPhone(user.phone_normalized);
  
  // 2. Fallback to browser locale
  const browserLocale = navigator.language;
  
  // 3. Default to Israeli settings (super admin's locale)
  return {
    country: countryFromPhone || 'IL',
    timezone: TIMEZONES[countryFromPhone] || 'Asia/Jerusalem',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    language: 'en-US'
  };
}
```

**Timezone Mapping:**
```javascript
const TIMEZONES = {
  'IL': 'Asia/Jerusalem',
  'US': 'America/New_York',  // Or user-specific
  'GB': 'Europe/London',
  'FR': 'Europe/Paris',
  // ... etc
};
```

**Display Times:**
- Store all times in UTC
- Display in user's timezone
- Show timezone in parentheses: "19:00 (Israel Time)"

---

## Notification Settings

### Default Notification Times (Israel)
**Session Reminders:**
- 24 hours before: 19:00 Israel time
- 3 hours before: Actual session time - 3h
- 30 minutes before: Actual session time - 30m

**Weekly Summaries:**
- Sunday 09:00 Israel time (start of work week)

**Rating Reminders:**
- Thursday 18:00 Israel time (before weekend)

---

## Implementation Checklist

### Phase 1: Core Localization (Current Sprint)
- [x] Country selector defaults to Israel (+972)
- [x] Israel first in country list
- [ ] Date format: DD/MM/YYYY throughout app
- [ ] Time format: 24-hour throughout app
- [ ] Timezone: Asia/Jerusalem for all operations
- [ ] Phone display: Israeli format with dashes

### Phase 2: Regional Settings
- [ ] Week starts on Sunday
- [ ] Weekend = Friday + Saturday
- [ ] Default session times (Israeli schedule)
- [ ] Currency display (ILS ₪)

### Phase 3: Multi-Region Support
- [ ] User locale detection
- [ ] Timezone conversion
- [ ] Multiple date format support
- [ ] International phone formatting

### Phase 4: Hebrew Support
- [ ] RTL layout support
- [ ] Hebrew UI translations
- [ ] Hebrew/English language toggle
- [ ] Mixed content handling

---

## Testing Requirements

### Israeli User Flow
- [ ] Phone number with Israeli format works
- [ ] Dates display as DD/MM/YYYY
- [ ] Times display as 24-hour
- [ ] Session times in Israel timezone
- [ ] Week calendar starts on Sunday
- [ ] Default country is Israel

### International User Flow
- [ ] Can select different country
- [ ] Phone validation works for their country
- [ ] Times display in their timezone (future)
- [ ] UI remains usable

---

## Configuration File

Create: `config/locale.js`

```javascript
export const LOCALE_CONFIG = {
  DEFAULT_COUNTRY: 'IL',
  DEFAULT_COUNTRY_CODE: '+972',
  DEFAULT_TIMEZONE: 'Asia/Jerusalem',
  DEFAULT_LANGUAGE: 'en-US',
  
  DATE_FORMAT: 'DD/MM/YYYY',
  TIME_FORMAT: '24h',
  DATETIME_FORMAT: 'DD/MM/YYYY HH:mm',
  
  WEEK_START: 0,  // Sunday
  WEEKEND_DAYS: [5, 6],  // Friday, Saturday
  
  CURRENCY: {
    code: 'ILS',
    symbol: '₪',
    position: 'before'  // ₪99
  },
  
  PHONE_DISPLAY: {
    format: 'XXX-XXX-XXXX',
    localPrefix: '0'
  },
  
  POPULAR_GAME_TIMES: {
    weekday: ['19:00', '20:00', '21:00'],
    friday: ['10:00', '11:00', '12:00'],
    saturday: ['10:00', '17:00', '18:00']
  }
};
```

---

## Super Admin Profile

**Name:** Erez (E-z Gal)  
**User ID:** 9ce3e60d-c196-4f3a-9609-a70c4e14fb9a  
**Phone:** +972525502281 (Israel)  
**Display:** 052-550-2281  
**Role:** admin (needs upgrade to super_admin)  
**Country:** Israel 🇮🇱  
**Timezone:** Asia/Jerusalem  
**Language:** English (primary), Hebrew (native)  
**Date Preference:** DD/MM/YYYY  
**Time Preference:** 24-hour  

---

## Summary

### Key Localization Rules
1. 🇮🇱 **Country selector defaults to Israel** (super admin's country)
2. 📅 **Date format: DD/MM/YYYY** (Israeli/European standard)
3. ⏰ **24-hour time format** (Israeli standard)
4. 🌍 **Timezone: Asia/Jerusalem** for all operations
5. 📞 **Phone display: Israeli format** (052-550-2281)
6. 📆 **Week starts Sunday** (Israeli calendar)
7. 🏀 **Default sports: Basketball, Soccer** (popular in Israel)

### Implementation Priority
1. **Now:** Country defaults, phone formatting
2. **Next:** Date/time formatting, timezone
3. **Later:** Multi-region support
4. **Future:** Hebrew language support

### Why Israel as Default
- Primary super admin is Israeli
- Expected user base primarily Israeli
- Sets consistent baseline
- Easy to extend for international users later
