const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../auth');

router.use(authenticate);

// GET /api/audit - List audit trail events for user's organization
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
    const events = db.prepare(`
      SELECT * FROM audit_events
      WHERE organization_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(req.organizationId, limit);

    const parsed = events.map(e => ({
      ...e,
      details: e.details_json ? JSON.parse(e.details_json) : {}
    }));

    res.json({ success: true, events: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
