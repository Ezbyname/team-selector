/**
 * Connection API Router
 * Routes requests to specific connection endpoints
 */

import add from './add.js';
import remove from './remove.js';
import list from './list.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/add')) {
    return add(req, res);
  } else if (path.endsWith('/remove')) {
    return remove(req, res);
  } else if (path.endsWith('/list')) {
    return list(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
