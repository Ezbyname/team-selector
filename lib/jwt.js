/**
 * JWT token generation and verification utilities
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '15m'; // Access token: 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // Refresh token: 7 days

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Generate access token with user claims
 * @param {Object} user - User object from database
 * @returns {string} - JWT access token
 */
export function generateAccessToken(user) {
  const payload = {
    sub: user.id, // Subject (user ID)
    role: user.role, // admin, sub_admin, or user
    phone: user.phone_normalized,
    iat: Math.floor(Date.now() / 1000), // Issued at
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate refresh token (opaque)
 * @returns {string} - Random refresh token
 */
export function generateRefreshToken() {
  // Generate cryptographically secure random token
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify and decode access token
 * @param {string} token - JWT access token
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null if invalid format
 */
export function extractBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Calculate refresh token expiration timestamp
 * @returns {Date} - Expiration date (7 days from now)
 */
export function getRefreshTokenExpiration() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}
