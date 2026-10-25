const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db');
const { authenticate, requireRole } = require('../auth');

// All workspace routes require authentication
router.use(authenticate);

// GET /api/workspaces - List workspaces within the user's organization
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const workspaces = db.prepare(`
      SELECT w.*,
        (SELECT COUNT(*) FROM brand_rules WHERE workspace_id = w.id AND status = 'approved') as approved_rules_count,
        (SELECT COUNT(*) FROM brand_rules WHERE workspace_id = w.id AND status = 'candidate') as candidate_rules_count,
        (SELECT COUNT(*) FROM claim_ledger WHERE workspace_id = w.id) as total_claims_count
      FROM workspaces w
      WHERE w.organization_id = ?
      ORDER BY w.id ASC
    `).all(req.organizationId);

    res.json({ success: true, workspaces });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/workspaces/:id - Get specific workspace
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const ws = db.prepare(`
      SELECT * FROM workspaces
      WHERE id = ? AND organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!ws) {
      return res.status(404).json({ success: false, error: 'Workspace not found in your organization.' });
    }

    res.json({ success: true, workspace: ws });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workspaces - Create workspace (Admin or Brand Manager only)
router.post('/', requireRole('admin', 'brand_manager'), (req, res) => {
  const { name, description, industry, preferred_tone, approved_terminology, prohibited_terminology, brand_colors } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Workspace name is required.' });
  }

  const db = getDb();
  try {
    const stmt = db.prepare(`
      INSERT INTO workspaces (
        organization_id, name, description, industry, preferred_tone,
        approved_terminology, prohibited_terminology, brand_colors, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `);

    const result = stmt.run(
      req.organizationId,
      name.trim(),
      description ?? null,
      industry || 'General',
      preferred_tone || 'Professional',
      approved_terminology || '',
      prohibited_terminology || '',
      brand_colors || '',
      req.user.name
    );

    logAudit('WORKSPACE_CREATED', 'workspaces', result.lastInsertRowid, req.user, { name }, req.organizationId);

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Brand workspace created successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/workspaces/:id - Update workspace (Admin or Brand Manager only)
router.put('/:id', requireRole('admin', 'brand_manager'), (req, res) => {
  const { name, description, industry, preferred_tone, approved_terminology, prohibited_terminology, brand_colors, status } = req.body;
  const db = getDb();

  try {
    const existing = db.prepare(`
      SELECT * FROM workspaces WHERE id = ? AND organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Workspace not found in your organization.' });
    }

    const stmt = db.prepare(`
      UPDATE workspaces SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        industry = COALESCE(?, industry),
        preferred_tone = COALESCE(?, preferred_tone),
        approved_terminology = COALESCE(?, approved_terminology),
        prohibited_terminology = COALESCE(?, prohibited_terminology),
        brand_colors = COALESCE(?, brand_colors),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `);

    stmt.run(
      name ?? null,
      description ?? null,
      industry ?? null,
      preferred_tone ?? null,
      approved_terminology ?? null,
      prohibited_terminology ?? null,
      brand_colors ?? null,
      status ?? null,
      req.params.id,
      req.organizationId
    );

    logAudit('WORKSPACE_UPDATED', 'workspaces', req.params.id, req.user, { name: name || existing.name }, req.organizationId);

    res.json({ success: true, message: 'Workspace updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
