/**
 * Consolidated Groups Routes Handler
 */

import create from './create.js';
import list from './list.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/create')) {
    return create(req, res);
  } else if (path.endsWith('/list')) {
    return list(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
