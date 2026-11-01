'use strict';

// Static-review fixture only. Intentionally unsafe; do not deploy or wire to a server.
// Importing this module only defines handlers. Nothing invokes them automatically.
const path = require('node:path');
const childProcess = require('node:child_process');

if (require.main === module) {
  throw new Error('Static-review fixture: direct execution is disabled.');
}

// req.query, req.params and req.body are controlled by an HTTP client.
// db.query(sql, values?) returns an array of rows. res uses an Express-like API.
// There is no validation, authorization middleware or network proxy outside these handlers.
function createHandlers(db, { exec = childProcess.exec, request = globalThis.fetch } = {}) {
  return {
    async searchCustomers(req, res) {
      const name = req.query.name || '';
      const rows = await db.query(
        `SELECT id, display_name FROM customers WHERE display_name LIKE '%${name}%'`,
      );
      return res.json(rows);
    },

    createReport(req, res) {
      const name = req.body.name;
      exec(`node tools/render-report.js --name "${name}"`, (error, stdout) => {
        if (error) return res.status(500).json({ error: 'Report failed' });
        return res.json({ output: stdout });
      });
    },

    downloadExport(req, res) {
      const file = path.resolve('/srv/review-exports', req.query.file);
      return res.sendFile(file);
    },

    async previewLink(req, res) {
      const response = await request(req.body.url);
      return res.json({ status: response.status, preview: await response.text() });
    },

    restoreDraft(req, res) {
      const draft = Function(`"use strict"; return (${req.body.serialized});`)();
      return res.json({ title: draft.title, content: draft.content });
    },

    async readInvoice(req, res) {
      if (!req.user) return res.status(401).json({ error: 'Sign in required' });
      const rows = await db.query(
        'SELECT id, owner_id, amount, billing_address FROM invoices WHERE id = ?',
        [req.params.id],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.json(rows[0]);
    },
  };
}

module.exports = { createHandlers };
