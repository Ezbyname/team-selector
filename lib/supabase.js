/**
 * Supabase client initialization
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key (bypasses RLS)

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
}

// Service role client (bypasses RLS - use only in backend)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Execute query with RLS context (sets app.user_id)
 * This allows RLS policies to access the current user ID
 * @param {string} userId - Current user ID
 * @param {Function} callback - Async function to execute with RLS context
 * @returns {Promise<any>} - Result of callback
 */
export async function withRLS(userId, callback) {
  // Set RLS context variable
  await supabase.rpc('set_config', {
    setting: 'app.user_id',
    value: userId,
    is_local: true,
  });

  try {
    return await callback(supabase);
  } finally {
    // Reset context (optional, but good practice)
    await supabase.rpc('set_config', {
      setting: 'app.user_id',
      value: '',
      is_local: true,
    });
  }
}
