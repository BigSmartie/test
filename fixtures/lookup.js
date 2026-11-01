'use strict';

// Static-review fixture only. Do not deploy.
if (require.main === module) {
  throw new Error('Static-review fixture: direct execution is disabled.');
}

// req.user.id is supplied by trusted authentication middleware, not by the client.
// The database adapter supports ? placeholders and binds values separately from SQL.
function createLookups(db) {
  return {
    async searchCustomers(req, res) {
      const name = String(req.query.name || '');
      const rows = await db.query(
        'SELECT id, display_name FROM customers WHERE display_name LIKE ?',
        [`%${name}%`],
      );
      return res.json(rows);
    },

    async readInvoice(req, res) {
      if (!req.user) return res.status(401).json({ error: 'Sign in required' });
      const rows = await db.query(
        'SELECT id, owner_id, amount, billing_address FROM invoices WHERE id = ? AND owner_id = ?',
        [req.params.id, req.user.id],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    },
  };
}

module.exports = { createLookups };
