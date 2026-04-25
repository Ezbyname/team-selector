/**
 * Consolidated Ratings Routes Handler
 */

import gradePlayer from '../../lib/api-handlers/ratings/grade-player.js';
import players from '../../lib/api-handlers/ratings/players.js';
import player from '../../lib/api-handlers/ratings/player.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/grade-player')) {
    return gradePlayer(req, res);
  } else if (path.endsWith('/players')) {
    return players(req, res);
  } else if (path.endsWith('/player')) {
    return player(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
