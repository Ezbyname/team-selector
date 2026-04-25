/**
 * Consolidated Admin Routes Handler
 */

import createSubAdmin from '../../lib/api-handlers/admin/create-sub-admin.js';
import revokeSubAdmin from '../../lib/api-handlers/admin/revoke-sub-admin.js';
import grantGradingPermission from '../../lib/api-handlers/admin/grant-grading-permission.js';
import revokeGradingPermission from '../../lib/api-handlers/admin/revoke-grading-permission.js';
import users from '../../lib/api-handlers/admin/users.js';

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
