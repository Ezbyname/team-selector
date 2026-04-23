/**
 * Consolidated Sessions Routes Handler
 */

import create from './create.js';
import selectPlayers from './select-players.js';
import roster from './roster.js';
import generateTeams from './generate-teams.js';
import addConnection from './add-connection.js';
import removeConnection from './remove-connection.js';

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
