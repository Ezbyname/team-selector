/**
 * Phone number normalization utilities
 * Supports Israel (+972) and USA (+1) phone numbers
 */

/**
 * Normalize phone number to E.164 format based on country code
 * @param {string} phone - Input phone number (digits only)
 * @param {string} countryCode - Country code ('+972' for Israel, '+1' for USA)
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

  if (countryCode === '+972') {
    return normalizeIsraeliPhone(digitsOnly);
  } else if (countryCode === '+1') {
    return normalizeUSAPhone(digitsOnly);
  }

  return null;
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
