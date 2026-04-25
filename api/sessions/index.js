/**
 * Consolidated Sessions Routes Handler
 */

import create from '../../lib/api-handlers/sessions/create.js';
import selectPlayers from '../../lib/api-handlers/sessions/select-players.js';
import roster from '../../lib/api-handlers/sessions/roster.js';
import generateTeams from '../../lib/api-handlers/sessions/generate-teams.js';
import addConnection from '../../lib/api-handlers/sessions/add-connection.js';
import removeConnection from '../../lib/api-handlers/sessions/remove-connection.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/create')) {
    return create(req, res);
  } else if (path.endsWith('/select-players')) {
    return selectPlayers(req, res);
  } else if (path.endsWith('/roster')) {
    return roster(req, res);
  } else if (path.endsWith('/generate-teams')) {
    return generateTeams(req, res);
  } else if (path.endsWith('/add-connection')) {
    return addConnection(req, res);
  } else if (path.endsWith('/remove-connection')) {
    return removeConnection(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
