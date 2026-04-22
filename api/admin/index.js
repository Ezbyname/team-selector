/**
 * Consolidated Admin Routes Handler
 */

import createSubAdmin from './create-sub-admin.js';
import revokeSubAdmin from './revoke-sub-admin.js';
import grantGradingPermission from './grant-grading-permission.js';
import revokeGradingPermission from './revoke-grading-permission.js';
import users from './users.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/create-sub-admin')) {
    return createSubAdmin(req, res);
  } else if (path.endsWith('/revoke-sub-admin')) {
    return revokeSubAdmin(req, res);
  } else if (path.endsWith('/grant-grading-permission')) {
    return grantGradingPermission(req, res);
  } else if (path.endsWith('/revoke-grading-permission')) {
    return revokeGradingPermission(req, res);
  } else if (path.endsWith('/users')) {
    return users(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
