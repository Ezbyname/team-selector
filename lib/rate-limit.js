/**
 * Redis-based rate limiter for production serverless environment
 * Uses Upstash Redis for distributed rate limiting across function instances
 *
 * IMPORTANT: In production, Redis is REQUIRED. Rate limiting will not work
 * without it. In-memory fallback is ONLY for local development.
 */

import { Redis } from '@upstash/redis';

// Check if running in production
// Vercel sets VERCEL_ENV, Node.js typically uses NODE_ENV
const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.VERCEL === '1';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Upstash Redis client
let redis = null;

if (REDIS_URL && REDIS_TOKEN) {
  try {
    redis = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN
    });
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redis = null;
  }
}

// CRITICAL: Check if Redis is missing in production
if (IS_PRODUCTION && !redis) {
  console.error('╔════════════════════════════════════════════════════════════╗');
  console.error('║  CRITICAL: REDIS NOT CONFIGURED IN PRODUCTION             ║');
  console.error('║  Rate limiting is NOT FUNCTIONAL                          ║');
  console.error('║  Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN  ║');
  console.error('╚════════════════════════════════════════════════════════════╝');
}

// Development-only fallback: in-memory storage
const inMemoryAttempts = new Map();

// Log warning in development if using fallback
if (!redis && !IS_PRODUCTION) {
  console.warn('⚠️  WARNING: Using in-memory rate limiter for DEVELOPMENT ONLY');
  console.warn('⚠️  This is NOT SAFE for production. Configure Upstash Redis.');

  // Clean up old in-memory entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of inMemoryAttempts.entries()) {
      if (data.resetAt < now) {
        inMemoryAttempts.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check if rate limit exceeded (Redis-backed)
 * @param {string} identifier - User ID or IP address
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<{ allowed: boolean, retryAfter: number, error?: string }>}
 */
export async function checkRateLimit(identifier, maxAttempts = 5, windowMs = 60000) {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  // PRODUCTION: Redis is REQUIRED
  if (IS_PRODUCTION && !redis) {
    console.error('CRITICAL: Rate limiting called in production without Redis configured');
    return {
      allowed: false,
      retryAfter: 60,
      error: 'Rate limiting not available - system configuration error'
    };
  }

  // Use Redis if available
  if (redis) {
    try {
      // Use Redis INCR with expiration
      const count = await redis.incr(key);

      // Set expiration on first increment
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }

      // Check if limit exceeded
      if (count > maxAttempts) {
        const ttl = await redis.pttl(key);
        const retryAfter = Math.ceil(ttl / 1000);

        return {
          allowed: false,
          retryAfter: Math.max(retryAfter, 1)
        };
      }

      return {
        allowed: true,
        retryAfter: 0
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);

      // In production, fail closed (deny request)
      if (IS_PRODUCTION) {
        return {
          allowed: false,
          retryAfter: 60,
          error: 'Rate limiting service error'
        };
      }
      // In development, fall through to in-memory
    }
  }

  // DEVELOPMENT ONLY: Fallback to in-memory
  if (!IS_PRODUCTION) {
    let record = inMemoryAttempts.get(key);

    // Initialize or reset if window expired
    if (!record || record.resetAt < now) {
      record = {
        count: 0,
        resetAt: now + windowMs
      };
      inMemoryAttempts.set(key, record);
    }

    // Increment attempt count
    record.count++;

    // Check if limit exceeded
    if (record.count > maxAttempts) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      return {
        allowed: false,
        retryAfter
      };
    }

    return {
      allowed: true,
      retryAfter: 0
    };
  }

  // Should never reach here, but fail closed if we do
  return {
    allowed: false,
    retryAfter: 60,
    error: 'Rate limiting configuration error'
  };
}

/**
 * Reset rate limit for identifier
 * @param {string} identifier
 */
export async function resetRateLimit(identifier) {
  const key = `ratelimit:${identifier}`;

  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }

  // Development fallback only
  if (!IS_PRODUCTION) {
    inMemoryAttempts.delete(key);
  }
}

/**
 * Get current attempt count
 * @param {string} identifier
 * @returns {Promise<number>}
 */
export async function getAttemptCount(identifier) {
  const key = `ratelimit:${identifier}`;

  if (redis) {
    try {
      const count = await redis.get(key);
      return count || 0;
    } catch (error) {
      console.error('Redis get error:', error);
    }
  }

  // Development fallback only
  if (!IS_PRODUCTION) {
    const record = inMemoryAttempts.get(key);
    if (!record || record.resetAt < Date.now()) {
      return 0;
    }
    return record.count;
  }

  return 0;
}

/**
 * Check if Redis is properly configured
 * @returns {boolean}
 */
export function isRateLimitingConfigured() {
  return redis !== null;
}

/**
 * Check if running in production mode
 * @returns {boolean}
 */
export function isProduction() {
  return IS_PRODUCTION;
}
