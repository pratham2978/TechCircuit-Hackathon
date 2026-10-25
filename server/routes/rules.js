const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db');
const { authenticate, requireRole } = require('../auth');

router.use(authenticate);

// GET /api/rules - List rules for user's organization
router.get('/', (req, res) => {
  try {
    const { status, category, rule_type, workspace_id } = req.query;
    const db = getDb();

    let query = `
      SELECT r.*, d.original_name as document_name
      FROM brand_rules r
      LEFT JOIN guideline_documents d ON r.source_document_id = d.id
      WHERE r.organization_id = ?
    `;
    const params = [req.organizationId];

    if (workspace_id) {
      query += ' AND r.workspace_id = ?';
      params.push(workspace_id);
    }
    if (status) {
      if (status === 'candidate' || status === 'pending') {
        query += " AND (r.status = 'candidate' OR r.status = 'pending')";
      } else {
        query += ' AND r.status = ?';
        params.push(status);
      }
    }
    if (category) {
      query += ' AND r.category = ?';
      params.push(category);
    }
    if (rule_type) {
      query += ' AND r.rule_type = ?';
      params.push(rule_type);
    }

    query += ' ORDER BY r.id DESC';

    const rules = db.prepare(query).all(...params);
    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/rules/:id - Get single rule
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const rule = db.prepare(`
      SELECT r.*, d.original_name as document_name
      FROM brand_rules r
      LEFT JOIN guideline_documents d ON r.source_document_id = d.id
      WHERE r.id = ? AND r.organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found in your organization.' });
    }
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rules - Create manual rule
router.post('/', requireRole('admin', 'brand_manager'), (req, res) => {
  const { rule_code, category, title, description, rule_type, pattern_or_phrase, replacement_or_guidance, severity, source_reference, workspace_id } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ success: false, error: 'Title, description, and category are required.' });
  }

  const db = getDb();
  const wsId = workspace_id || 1;

  try {
    const code = rule_code || `RULE-${Date.now().toString().slice(-4)}`;
    const stmt = db.prepare(`
      INSERT INTO brand_rules (
        organization_id, workspace_id, rule_code, category, title, description, rule_type,
        pattern_or_phrase, replacement_or_guidance, severity,
        source_reference, source_excerpt, status, extraction_method, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', 'manual_entry', ?)
    `);

    const result = stmt.run(
      req.organizationId,
      wsId,
      code,
      category,
      title,
      description,
      rule_type || 'deterministic_term',
      pattern_or_phrase ?? null,
      replacement_or_guidance ?? null,
      severity || 'Medium',
      source_reference || 'Manual Rule Entry',
      description,
      req.user.name
    );

    logAudit('RULE_CREATED', 'brand_rules', result.lastInsertRowid, req.user, { rule_code: code, title }, req.organizationId);

    res.json({ success: true, id: result.lastInsertRowid, rule_code: code });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/rules/:id - Edit rule
router.put('/:id', requireRole('admin', 'brand_manager'), (req, res) => {
  const { title, description, category, rule_type, pattern_or_phrase, replacement_or_guidance, severity, source_reference } = req.body;
  const db = getDb();

  try {
    const existing = db.prepare('SELECT * FROM brand_rules WHERE id = ? AND organization_id = ?').get(req.params.id, req.organizationId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Rule not found in your organization.' });
    }

    const stmt = db.prepare(`
      UPDATE brand_rules SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        rule_type = COALESCE(?, rule_type),
        pattern_or_phrase = COALESCE(?, pattern_or_phrase),
        replacement_or_guidance = COALESCE(?, replacement_or_guidance),
        severity = COALESCE(?, severity),
        source_reference = COALESCE(?, source_reference),
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `);

    stmt.run(
      title ?? null,
      description ?? null,
      category ?? null,
      rule_type ?? null,
      pattern_or_phrase ?? null,
      replacement_or_guidance ?? null,
      severity ?? null,
      source_reference ?? null,
      req.params.id,
      req.organizationId
    );

    logAudit('RULE_UPDATED', 'brand_rules', req.params.id, req.user, { title, severity }, req.organizationId);

    res.json({ success: true, message: 'Rule updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rules/:id/approve - Approve rule (Admin / Brand Manager only)
router.post('/:id/approve', requireRole('admin', 'brand_manager'), (req, res) => {
  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM brand_rules WHERE id = ? AND organization_id = ?').get(req.params.id, req.organizationId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Rule not found in your organization.' });
    }

    const stmt = db.prepare(`
      UPDATE brand_rules SET
        status = 'approved',
        approved_by = ?,
        approved_at = datetime('now'),
        rejection_reason = NULL,
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `);

    stmt.run(req.user.name, req.params.id, req.organizationId);

    logAudit('RULE_APPROVED', 'brand_rules', req.params.id, req.user, {
      rule_code: existing.rule_code,
      title: existing.title
    }, req.organizationId);

    res.json({
      success: true,
      message: `Rule ${existing.rule_code} is now an authoritative approved brand policy.`,
      status: 'approved'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rules/:id/reject - Reject candidate rule
router.post('/:id/reject', requireRole('admin', 'brand_manager'), (req, res) => {
  const { rejection_reason } = req.body;
  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM brand_rules WHERE id = ? AND organization_id = ?').get(req.params.id, req.organizationId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Rule not found in your organization.' });
    }

    const stmt = db.prepare(`
      UPDATE brand_rules SET
        status = 'rejected',
        rejection_reason = ?,
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `);

    stmt.run(rejection_reason || 'Rejected by brand authority', req.params.id, req.organizationId);

    logAudit('RULE_REJECTED', 'brand_rules', req.params.id, req.user, {
      rule_code: existing.rule_code,
      reason: rejection_reason
    }, req.organizationId);

    res.json({
      success: true,
      message: `Rule ${existing.rule_code} has been rejected.`,
      status: 'rejected'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
