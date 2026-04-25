/**
 * Consolidated Groups API Handler
 * Routes all /api/groups/* requests to appropriate handlers
 */

import create from '../../lib/api-handlers/groups/create.js';
import createInvite from '../../lib/api-handlers/groups/create-invite.js';
import joinByCode from '../../lib/api-handlers/groups/join-by-code.js';
import leave from '../../lib/api-handlers/groups/leave.js';
import list from '../../lib/api-handlers/groups/list.js';
import myTeams from '../../lib/api-handlers/groups/my-teams.js';
import myTeamsAll from '../../lib/api-handlers/groups/my-teams-all.js';
import revokeInvite from '../../lib/api-handlers/groups/revoke-invite.js';
import transferOwnership from '../../lib/api-handlers/groups/transfer-ownership.js';
import update from '../../lib/api-handlers/groups/update.js';

export default async function handler(req, res) {
  // Extract path after /api/groups/
  const fullPath = req.url.split('?')[0]; // Remove query string
  const path = fullPath.split('/api/groups/')[1] || '';

  // Route to appropriate handler
  switch (path) {
    case 'create':
      return create(req, res);

    case 'create-invite':
      return createInvite(req, res);

    case 'join-by-code':
      return joinByCode(req, res);

    case 'leave':
      return leave(req, res);

    case 'list':
      return list(req, res);

    case 'my-teams':
      return myTeams(req, res);

    case 'my-teams-all':
      return myTeamsAll(req, res);

    case 'revoke-invite':
      return revokeInvite(req, res);

    case 'transfer-ownership':
      return transferOwnership(req, res);

    case 'update':
      return update(req, res);

    default:
      return res.status(404).json({
        success: false,
        error: 'API route not found'
      });
  }
}
