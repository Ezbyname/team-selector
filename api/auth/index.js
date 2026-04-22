/**
 * Consolidated Auth Routes Handler
 * Handles all /api/auth/* endpoints in one function
 */

import sendOtp from './send-otp.js';
import verifyOtp from './verify-otp.js';
import register from './register.js';
import login from './login.js';
import refresh from './refresh.js';
import logout from './logout.js';

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
  }

  return res.status(404).json({ error: 'Not found' });
}
