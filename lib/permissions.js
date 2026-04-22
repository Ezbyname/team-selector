/**
 * Permission Middleware
 * Enforces role and permission checks at API layer
 */

import { supabase } from './supabase.js';
import { verifyAccessToken } from './jwt.js';

/**
 * Extract and verify user from request
 */
export async function extractUser(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    return null;
  }

  // Fetch fresh user data from database
  const { data: user, error } = await supabase
    .from('auth_users')
    .select('id, phone, phone_normalized, role, can_grade_players')
    .eq('id', payload.sub)
    .single();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Require authentication (any role)
 */
export function requireAuth(handler) {
  return async (req, res) => {
    const user = await extractUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Attach user to request
    req.user = user;
    return handler(req, res);
  };
}

/**
 * Require admin role
 */
export function requireAdmin(handler) {
  return async (req, res) => {
    const user = await extractUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach user to request
    req.user = user;
    return handler(req, res);
  };
}

/**
 * Require grading permission
 * Admin OR can_grade_players = true
 */
export function requireGradingPermission(handler) {
  return async (req, res) => {
    const user = await extractUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'admin' && !user.can_grade_players) {
      return res.status(403).json({ error: 'Grading permission required' });
    }

    // Attach user to request
    req.user = user;
    return handler(req, res);
  };
}

/**
 * Check if user has grading permission
 */
export function canGradePlayers(user) {
  return user.role === 'admin' || user.can_grade_players === true;
}

/**
 * Check if user is admin
 */
export function isAdmin(user) {
  return user.role === 'admin';
}
