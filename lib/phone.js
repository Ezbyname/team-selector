/**
 * Phone number normalization utilities
 * Converts Israeli phone numbers to E.164 format
 */

/**
 * Normalize Israeli phone number to E.164 format
 * @param {string} phone - Input phone number (e.g., "050-123-4567", "0501234567", "+972501234567")
 * @returns {string|null} - Normalized phone in E.164 format (+972501234567) or null if invalid
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Handle different formats
  if (cleaned.startsWith('+972')) {
    // Already in E.164 format: +972501234567
    cleaned = cleaned.substring(1); // Remove +
  } else if (cleaned.startsWith('972')) {
    // Without +: 972501234567
    // Keep as is
  } else if (cleaned.startsWith('0')) {
    // Local format: 0501234567
    cleaned = '972' + cleaned.substring(1);
  } else {
    // Invalid format
    return null;
  }

  // Validate length (should be 12 digits: 972 + 9 digits)
  if (cleaned.length !== 12) {
    return null;
  }

  // Validate Israeli mobile prefixes (050, 051, 052, 053, 054, 055, 058)
  const prefix = cleaned.substring(3, 6);
  const validPrefixes = ['050', '051', '052', '053', '054', '055', '058'];
  if (!validPrefixes.includes(prefix)) {
    return null;
  }

  return '+' + cleaned;
}

/**
 * Format E.164 phone to display format
 * @param {string} phone - E.164 phone (+972501234567)
 * @returns {string} - Display format (050-123-4567)
 */
export function formatPhone(phone) {
  if (!phone || !phone.startsWith('+972')) {
    return phone;
  }

  const digits = phone.substring(4); // Remove +972
  return `0${digits.substring(0, 2)}-${digits.substring(2, 5)}-${digits.substring(5)}`;
}

/**
 * Validate phone number format
 * @param {string} phone - Input phone number
 * @returns {boolean} - True if valid Israeli mobile number
 */
export function isValidPhone(phone) {
  return normalizePhone(phone) !== null;
}
