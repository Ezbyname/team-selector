/**
 * Consolidated Players Routes Handler
 */

import add from '../../lib/api-handlers/players/add.js';
import deletePlayer from '../../lib/api-handlers/players/delete.js';
import grade from '../../lib/api-handlers/players/grade.js';
import list from '../../lib/api-handlers/players/list.js';
import update from '../../lib/api-handlers/players/update.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/add')) {
    return add(req, res);
  } else if (path.endsWith('/delete')) {
    return deletePlayer(req, res);
  } else if (path.endsWith('/grade')) {
    return grade(req, res);
  } else if (path.endsWith('/list')) {
    return list(req, res);
  } else if (path.endsWith('/update')) {
    return update(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
