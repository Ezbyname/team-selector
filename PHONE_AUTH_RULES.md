# Phone Authentication System - Rules & Guidelines

## Critical Rules (DO NOT BREAK)

### 1. Country Code Management
- **ALWAYS** use `authState.countryCode` for country code state
- **NEVER** reference `countrySelect` element (it doesn't exist)
- **DEFAULT** to `'+972'` (Israel) if countryCode is undefined
- **UPDATE** `authState.countryCode` when user selects a country

```javascript
// ✅ CORRECT
const countryCode = authState.countryCode || '+972';

// ❌ WRONG
const countrySelect = document.getElementById('countrySelect');
const countryCode = countrySelect ? countrySelect.value : '+972';
```

---

### 2. Custom Dropdown Structure
The dropdown MUST be nested inside `.phone-field` for proper positioning.

```html
<!-- ✅ CORRECT STRUCTURE -->
<div class="phone-field">
  <button class="country-selector" id="countrySelector">
    <img id="selectedFlag" src="...">
    <span id="selectedCode">IL</span>
  </button>

  <div class="phone-input-wrapper">
    <div class="phone-prefix" id="phonePrefix">+972</div>
    <input id="phoneInput" class="phone-input" />
  </div>

  <!-- MUST BE HERE -->
  <div class="country-dropdown" id="countryDropdown">
    <!-- country options -->
  </div>
</div>

<!-- ❌ WRONG - dropdown outside phone-field -->
<div class="phone-field">...</div>
<div class="country-dropdown">...</div>
```

**CSS Requirements:**
```css
.phone-field {
  position: relative;  /* Required for absolute dropdown */
  overflow: visible;   /* Don't clip dropdown */
}

.country-dropdown {
  position: absolute;
  top: 64px;  /* Below selector */
  left: 0;    /* Aligned with selector */
}
```

---

### 3. No Chevron/Arrow Icons
- **DO NOT** add chevron ("⌄") or dropdown arrows to country selector
- The button itself indicates clickability
- Keeps design clean: `[ 🇮🇱 IL ]` not `[ 🇮🇱 IL ⌄ ]`

---

### 4. API Configuration
- **ALWAYS** use relative path `/api/auth` for API calls
- **NEVER** hardcode localhost ports (causes CORS errors)
- Vercel dev handles routing via `vercel.json`

```javascript
// ✅ CORRECT
const API_BASE_URL = '/api/auth';

// ❌ WRONG
const API_BASE_URL = 'http://localhost:3000/api/auth';
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api/auth' 
  : '/api/auth';
```

---

### 5. Flag Images
- **USE** `https://flagcdn.com/w40/{code}.png` for flag images
- **NEVER** use emoji flags in HTML (Windows rendering issues)
- **ALWAYS** use lowercase country codes: `il.png` not `IL.png`

```html
<!-- ✅ CORRECT -->
<img class="country-flag" src="https://flagcdn.com/w40/il.png" alt="IL">

<!-- ❌ WRONG -->
<span class="flag">🇮🇱</span>
```

**JavaScript Initialization:**
```javascript
// ✅ CORRECT
if (selectedFlag) {
  selectedFlag.src = 'https://flagcdn.com/w40/il.png';
  selectedFlag.alt = 'IL';
}

// ❌ WRONG
if (selectedFlag) {
  selectedFlag.textContent = '🇮🇱';
}
```

---

### 6. Phone Input Validation
**Frontend validation must happen BEFORE API call:**

1. **Non-empty check**
2. **Digits-only check** (reject formatting characters)
3. **Length check** (8-12 digits)

```javascript
// ✅ CORRECT ORDER
if (!phone) {
  showError('phoneScreen', 'Please enter phone number');
  return;
}

if (!/^\d+$/.test(phone)) {
  showError('phoneScreen', 'Phone number must contain only digits');
  return;
}

if (phone.length < 8 || phone.length > 12) {
  showError('phoneScreen', 'Phone number must be between 8 and 12 digits');
  return;
}

// THEN make API call
```

---

### 7. Error Messages
- **NEVER** show generic "Network error" when validation fails
- **ALWAYS** show specific error messages
- Clear errors before showing loading state

```javascript
// ✅ CORRECT
setLoading('phoneScreen', true);
clearError('phoneScreen');  // Clear before API call

try {
  const response = await fetch(...);
  if (response.ok) {
    // success
  } else {
    showError('phoneScreen', data.error || 'Failed to send OTP');
  }
} catch (error) {
  showError('phoneScreen', 'Network error. Please try again.');
} finally {
  setLoading('phoneScreen', false);  // Always clear loading
}
```

---

### 8. Loading Button State
**Save original button text BEFORE changing it:**

```javascript
// ✅ CORRECT
if (isLoading && !button.dataset.originalText) {
  button.dataset.originalText = button.textContent;  // Save BEFORE
}
button.disabled = isLoading;
button.textContent = isLoading ? 'Loading...' : button.dataset.originalText;

if (!isLoading) {
  delete button.dataset.originalText;  // Clean up after
}

// ❌ WRONG
button.textContent = 'Loading...';
button.dataset.originalText = button.textContent;  // Saves "Loading..."!
```

---

## Phone Field Component Specs

### Country Selector Button
```css
.country-selector {
  width: 110px;
  height: 56px;
  flex: 0 0 110px;
  gap: 6px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  font-size: 16px;
  font-weight: 700;
}
```

### Phone Prefix (inside input wrapper)
```css
.phone-prefix {
  width: 76px;
  flex: 0 0 76px;
  border-right: 1px solid #e5e7eb;
  font-size: 16px;
  font-weight: 700;
}
```

### Phone Input
```html
<input
  id="phoneInput"
  class="phone-input"
  type="tel"
  inputmode="numeric"
  pattern="[0-9]*"
  placeholder="501234567"
  autocomplete="tel-national"
  required
/>
```

### Dropdown
```css
.country-dropdown {
  position: absolute;
  top: 64px;   /* Just below selector */
  left: 0;     /* Aligned with selector */
  width: 190px;
  max-height: 240px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  z-index: 9999;
}
```

---

## Country Selection Flow

### On Country Option Click:
```javascript
option.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  const flagSrc = option.dataset.flagSrc;
  const code = option.dataset.code;
  const prefix = option.dataset.prefix;

  // 1. Update flag image
  selectedFlag.src = flagSrc;
  selectedFlag.alt = code;

  // 2. Update country code text
  selectedCode.textContent = code;

  // 3. Update prefix
  phonePrefix.textContent = prefix;

  // 4. Store in authState (CRITICAL)
  authState.countryCode = prefix;

  // 5. Reset phone input
  phoneInput.value = '';

  // 6. Close dropdown
  countryDropdown.classList.add('hidden');

  // 7. Focus input
  phoneInput.focus();
});
```

---

## Mobile Responsive Rules

### At 480px breakpoint:
```css
@media (max-width: 480px) {
  .country-selector {
    width: 96px;
    flex-basis: 96px;
    font-size: 15px;
  }

  .phone-prefix {
    width: 64px;
    flex-basis: 64px;
    font-size: 15px;
  }

  .phone-input {
    padding: 0 12px;
    font-size: 15px;
  }
}
```

---

## Common Mistakes to Avoid

### ❌ Don't Do This:
1. Adding chevron/arrow to country selector
2. Using emoji flags in HTML
3. Putting dropdown outside `.phone-field`
4. Hardcoding API ports
5. Referencing deleted `countrySelect` element
6. Saving button text AFTER changing it
7. Showing "Network error" for validation failures
8. Setting flag with `textContent` instead of `src`

### ✅ Do This:
1. Clean selector design without arrows
2. Use flagcdn.com for flag images
3. Nest dropdown inside `.phone-field`
4. Use relative API paths
5. Use `authState.countryCode` for country state
6. Save button text BEFORE loading state
7. Show specific validation errors
8. Use `img.src` for flag updates

---

## Testing Checklist

Before committing phone auth changes:

- [ ] Country selector opens dropdown below button (not top-left)
- [ ] Clicking country updates flag, code, and prefix
- [ ] `authState.countryCode` is set correctly
- [ ] Phone input only accepts digits
- [ ] Validation errors are specific (not generic)
- [ ] Loading button recovers after errors
- [ ] API calls use relative path `/api/auth`
- [ ] Flag images load from flagcdn.com
- [ ] No console errors about undefined elements
- [ ] Works on mobile (responsive at 480px)
- [ ] Dropdown closes when clicking outside
- [ ] Hard refresh clears cache properly

---

## Files to Keep in Sync

When updating phone authentication:

1. **frontend/index.html** - Main phone input
2. **frontend/login.html** - Standalone login page
3. **frontend/auth.js** - JavaScript logic
4. **frontend/auth.css** - Styling

**Both HTML files must have:**
- Same country dropdown structure
- Same flag image sources
- Same input attributes
- Dropdown nested inside `.phone-field`

---

## Emergency Fixes

### If dropdown renders at top-left:
1. Check `.phone-field` has `position: relative`
2. Check `.country-dropdown` is INSIDE `.phone-field`
3. Check CSS includes `overflow: visible`

### If "Network error" appears:
1. Check `authState.countryCode` is set
2. Check API_BASE_URL is `/api/auth` (relative)
3. Check no references to deleted `countrySelect`
4. Check validation logic before API call

### If button stuck in "Loading..." state:
1. Check `button.dataset.originalText` is saved BEFORE changing text
2. Check `finally` block calls `setLoading(false)`
3. Check `delete button.dataset.originalText` after restoring

### If flags don't show:
1. Check using `<img>` tags not emoji spans
2. Check `src="https://flagcdn.com/w40/{code}.png"`
3. Check lowercase country codes (il not IL)
4. Check default state sets `img.src` not `textContent`

---

## Version History

- **v1.0** - Initial emoji-based flags (Windows issues)
- **v2.0** - Flag images from flagcdn.com
- **v3.0** - Fixed chevron removal and dropdown positioning
- **v3.1** - Fixed countrySelect references (CORS error)
- **v3.2** - Fixed API path for Vercel dev (current)

---

## Contact & Support

If phone auth breaks after changes:
1. Check this document first
2. Review git diff for structural changes
3. Test with hard refresh (Ctrl+Shift+R)
4. Check browser console for errors
5. Verify authState.countryCode is set

**Remember:** The phone input is the primary entry point for users. Any breakage here blocks all new registrations and logins.
