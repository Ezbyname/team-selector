/**
 * Phone number normalization utilities
 * Supports international phone numbers with country-specific validation
 */

// Country configurations
const COUNTRIES = {
  '+972': { name: 'Israel', flag: '🇮🇱', length: 9, prefixes: ['50', '51', '52', '53', '54', '55', '58'], localPrefix: '0' },
  '+1': { name: 'United States', flag: '🇺🇸', length: 10, areaCodeValidation: true },
  '+44': { name: 'United Kingdom', flag: '🇬🇧', length: 10, localPrefix: '0' },
  '+49': { name: 'Germany', flag: '🇩🇪', length: [10, 11] },
  '+33': { name: 'France', flag: '🇫🇷', length: 9, localPrefix: '0' },
  '+39': { name: 'Italy', flag: '🇮🇹', length: 10 },
  '+34': { name: 'Spain', flag: '🇪🇸', length: 9 },
  '+31': { name: 'Netherlands', flag: '🇳🇱', length: 9, localPrefix: '0' },
  '+32': { name: 'Belgium', flag: '🇧🇪', length: 9, localPrefix: '0' },
  '+41': { name: 'Switzerland', flag: '🇨🇭', length: 9, localPrefix: '0' },
  '+43': { name: 'Austria', flag: '🇦🇹', length: [10, 11], localPrefix: '0' },
  '+45': { name: 'Denmark', flag: '🇩🇰', length: 8 },
  '+46': { name: 'Sweden', flag: '🇸🇪', length: 9, localPrefix: '0' },
  '+47': { name: 'Norway', flag: '🇳🇴', length: 8 },
  '+48': { name: 'Poland', flag: '🇵🇱', length: 9 },
  '+61': { name: 'Australia', flag: '🇦🇺', length: 9, localPrefix: '0' },
  '+81': { name: 'Japan', flag: '🇯🇵', length: 10, localPrefix: '0' },
  '+82': { name: 'South Korea', flag: '🇰🇷', length: [9, 10], localPrefix: '0' },
  '+86': { name: 'China', flag: '🇨🇳', length: 11 },
  '+91': { name: 'India', flag: '🇮🇳', length: 10 },
  '+351': { name: 'Portugal', flag: '🇵🇹', length: 9 },
  '+358': { name: 'Finland', flag: '🇫🇮', length: 9, localPrefix: '0' },
  '+7': { name: 'Russia', flag: '🇷🇺', length: 10 },
};

export function getCountries() {
  return COUNTRIES;
}

export function getCountryList() {
  // Favorites first, then alphabetically
  const favorites = ['+972', '+1'];
  const others = Object.keys(COUNTRIES)
    .filter(code => !favorites.includes(code))
    .sort((a, b) => COUNTRIES[a].name.localeCompare(COUNTRIES[b].name));

  return [...favorites, ...others].map(code => ({
    code,
    ...COUNTRIES[code]
  }));
}

/**
 * Normalize phone number to E.164 format based on country code
 * @param {string} phone - Input phone number (digits only)
 * @param {string} countryCode - Country code (e.g., '+972', '+1')
 * @returns {string|null} - Normalized phone in E.164 format or null if invalid
 */
export function normalizePhone(phone, countryCode = '+972') {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Get digits only - reject if contains non-digits
  const digitsOnly = phone.replace(/[^\d]/g, '');

  // If original had non-digit characters, it's invalid
  if (digitsOnly !== phone) {
    return null;
  }

  // Special handling for specific countries
  if (countryCode === '+972') {
    return normalizeIsraeliPhone(digitsOnly);
  } else if (countryCode === '+1') {
    return normalizeUSAPhone(digitsOnly);
  }

  // Generic normalization for other countries
  return normalizeGenericPhone(digitsOnly, countryCode);
}

/**
 * Normalize Israeli phone number
 * @param {string} digits - Digits only (no dashes, spaces, etc.)
 * @returns {string|null} - +972501234567 or null
 */
function normalizeIsraeliPhone(digits) {
  let normalized;

  if (digits.startsWith('972')) {
    // 972501234567
    normalized = digits;
  } else if (digits.startsWith('0') && digits.length === 10) {
    // 0501234567 → 972501234567
    normalized = '972' + digits.substring(1);
  } else if (digits.length === 9) {
    // 501234567 → 972501234567
    normalized = '972' + digits;
  } else {
    return null;
  }

  // Validate length (should be 12 digits: 972 + 9 digits)
  if (normalized.length !== 12) {
    return null;
  }

  // Validate Israeli mobile prefixes (050, 051, 052, 053, 054, 055, 058)
  const prefix = normalized.substring(3, 5); // Get '50', '51', etc.
  const validPrefixes = ['50', '51', '52', '53', '54', '55', '58'];
  if (!validPrefixes.includes(prefix)) {
    return null;
  }

  return '+' + normalized;
}

/**
 * Normalize USA phone number
 * @param {string} digits - Digits only (no dashes, spaces, etc.)
 * @returns {string|null} - +12025551234 or null
 */
function normalizeUSAPhone(digits) {
  // USA: 10 digits (area code + number)
  // Accept: 2025551234 (10 digits) or 12025551234 (11 digits with country code)

  let normalized;

  if (digits.startsWith('1') && digits.length === 11) {
    // 12025551234
    normalized = digits;
  } else if (digits.length === 10) {
    // 2025551234 → 12025551234
    normalized = '1' + digits;
  } else {
    return null;
  }

  // Validate length (should be 11 digits: 1 + 10 digits)
  if (normalized.length !== 11) {
    return null;
  }

  // Basic validation: area code can't start with 0 or 1
  const areaCode = normalized.substring(1, 4);
  if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
    return null;
  }

  return '+' + normalized;
}

/**
 * Generic phone normalization for countries not requiring special handling
 * @param {string} digits - Digits only
 * @param {string} countryCode - Country code (e.g., '+44', '+49')
 * @returns {string|null} - E.164 format or null
 */
function normalizeGenericPhone(digits, countryCode) {
  const config = COUNTRIES[countryCode];
  if (!config) {
    return null; // Unsupported country
  }

  const countryCodeDigits = countryCode.substring(1); // Remove '+'
  let normalized;

  // Check if already includes country code
  if (digits.startsWith(countryCodeDigits)) {
    normalized = digits;
  } else if (config.localPrefix && digits.startsWith(config.localPrefix)) {
    // Has local prefix (e.g., '0' in UK) - remove it
    normalized = countryCodeDigits + digits.substring(config.localPrefix.length);
  } else {
    // Assume it's just the national number
    normalized = countryCodeDigits + digits;
  }

  // Validate length
  const expectedLength = countryCodeDigits.length + (Array.isArray(config.length) ? config.length[0] : config.length);
  const maxLength = countryCodeDigits.length + (Array.isArray(config.length) ? config.length[config.length.length - 1] : config.length);

  if (normalized.length < expectedLength || normalized.length > maxLength) {
    return null;
  }

  return '+' + normalized;
}

/**
 * Format E.164 phone to display format
 * @param {string} phone - E.164 phone (+972501234567 or +12025551234)
 * @returns {string} - Display format
 */
export function formatPhone(phone) {
  if (!phone) {
    return phone;
  }

  if (phone.startsWith('+972')) {
    // Israeli: +972501234567 → 050-123-4567
    const digits = phone.substring(4); // Remove +972
    return `0${digits.substring(0, 2)}-${digits.substring(2, 5)}-${digits.substring(5)}`;
  } else if (phone.startsWith('+1')) {
    // USA: +12025551234 → (202) 555-1234
    const digits = phone.substring(2); // Remove +1
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }

  return phone;
}

/**
 * Validate phone number format
 * @param {string} phone - Input phone number (digits only)
 * @param {string} countryCode - Country code
 * @returns {boolean} - True if valid
 */
export function isValidPhone(phone, countryCode = '+972') {
  return normalizePhone(phone, countryCode) !== null;
}
