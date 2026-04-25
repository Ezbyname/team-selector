/**
 * Consolidated Support Routes Handler
 */

import contact from '../../lib/api-handlers/support/contact.js';

export default async function handler(req, res) {
  const path = req.url.split('?')[0];

  if (path.endsWith('/contact')) {
    return contact(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
