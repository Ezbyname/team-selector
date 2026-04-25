/**
 * Consolidated Auth Routes Handler
 * Handles all /api/auth/* endpoints in one function
 */

import sendOtp from '../../lib/api-handlers/auth/send-otp.js';
import verifyOtp from '../../lib/api-handlers/auth/verify-otp.js';
import register from '../../lib/api-handlers/auth/register.js';
import login from '../../lib/api-handlers/auth/login.js';
import refresh from '../../lib/api-handlers/auth/refresh.js';
import logout from '../../lib/api-handlers/auth/logout.js';
import requestPasswordReset from '../../lib/api-handlers/auth/request-password-reset.js';
import completePasswordReset from '../../lib/api-handlers/auth/complete-password-reset.js';
import setNewPasswordAfterAdminReset from '../../lib/api-handlers/auth/set-new-password-after-admin-reset.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/send-otp')) {
    return sendOtp(req, res);
  } else if (path.endsWith('/verify-otp')) {
    return verifyOtp(req, res);
  } else if (path.endsWith('/register')) {
    return register(req, res);
  } else if (path.endsWith('/login')) {
    return login(req, res);
  } else if (path.endsWith('/refresh')) {
    return refresh(req, res);
  } else if (path.endsWith('/logout')) {
    return logout(req, res);
  } else if (path.endsWith('/request-password-reset')) {
    return requestPasswordReset(req, res);
  } else if (path.endsWith('/complete-password-reset')) {
    return completePasswordReset(req, res);
  } else if (path.endsWith('/set-new-password-after-admin-reset')) {
    return setNewPasswordAfterAdminReset(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
