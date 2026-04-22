/**
 * Consolidated Players Routes Handler
 */

import add from './add.js';
import list from './list.js';
import grade from './grade.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/add')) {
    return add(req, res);
  } else if (path.endsWith('/list')) {
    return list(req, res);
  } else if (path.endsWith('/grade')) {
    return grade(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
