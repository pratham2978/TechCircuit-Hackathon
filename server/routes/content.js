const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db');
const { authenticate } = require('../auth');

router.use(authenticate);

function computeDiffSummary(oldText, newText) {
  if (!oldText) return 'Initial content creation';
  if (oldText === newText) return 'No textual change';
  const oldWords = oldText.split(/\s+/).length;
  const newWords = newText.split(/\s+/).length;
  const diffWords = newWords - oldWords;
  return `Content revised (${diffWords >= 0 ? '+' : ''}${diffWords} words)`;
}

// Helper to get or list drafts
function handleGetDrafts(req, res) {
  try {
    const db = getDb();
    const drafts = db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM review_findings WHERE draft_id = d.id AND status = 'open') as open_findings_count
      FROM content_drafts d
      WHERE d.organization_id = ?
      ORDER BY d.id DESC
    `).all(req.organizationId);
    res.json({ success: true, drafts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Helper to get single draft
function handleGetDraftById(req, res) {
  try {
    const db = getDb();
    const draft = db.prepare(`
      SELECT * FROM content_drafts WHERE id = ? AND organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found in your organization.' });
    }

    const revisions = db.prepare('SELECT * FROM content_revisions WHERE draft_id = ? ORDER BY version_num DESC').all(req.params.id);
    const findings = db.prepare('SELECT * FROM review_findings WHERE draft_id = ? ORDER BY id ASC').all(req.params.id);
    const decisions = db.prepare('SELECT * FROM review_decisions WHERE draft_id = ? ORDER BY id DESC').all(req.params.id);

    res.json({ success: true, draft, revisions, findings, decisions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Helper to save draft
function handleSaveDraft(req, res) {
  const { id, title, content_type, channel, workspace_id, revision_note } = req.body;
  const content_text = req.body.content_text || req.body.raw_content || req.body.content;

  if (!content_text || !content_text.trim()) {
    return res.status(400).json({ success: false, error: 'Content text cannot be empty.' });
  }

  const db = getDb();
  const wsId = workspace_id || 1;

  try {
    if (id) {
      // Update existing draft
      const existing = db.prepare('SELECT * FROM content_drafts WHERE id = ? AND organization_id = ?').get(id, req.organizationId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Draft not found in your organization.' });
      }

      const nextVersion = existing.current_version + 1;
      const diffSummary = revision_note || computeDiffSummary(existing.content_text, content_text);

      const updateDraft = db.prepare(`
        UPDATE content_drafts SET
          title = COALESCE(?, title),
          content_type = COALESCE(?, content_type),
          content_text = ?,
          channel = COALESCE(?, channel),
          current_version = ?,
          updated_at = datetime('now')
        WHERE id = ? AND organization_id = ?
      `);
      updateDraft.run(title ?? null, content_type ?? null, content_text, channel ?? null, nextVersion, id, req.organizationId);

      const insertRev = db.prepare(`
        INSERT INTO content_revisions (draft_id, version_num, content_text, diff_summary, author_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertRev.run(id, nextVersion, content_text, diffSummary ?? null, req.user.name);

      logAudit('DRAFT_REVISED', 'content_drafts', id, req.user, {
        version: nextVersion,
        diffSummary
      }, req.organizationId);

      res.json({
        success: true,
        id,
        version: nextVersion,
        draft: { id, title: title || existing.title, content_text, channel: channel || existing.channel, current_version: nextVersion },
        message: `Saved revision v${nextVersion}.`
      });
    } else {
      // Create new draft
      const insertDraft = db.prepare(`
        INSERT INTO content_drafts (organization_id, workspace_id, title, content_type, content_text, channel, author_id, current_version, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'DRAFT')
      `);
      const draftResult = insertDraft.run(
        req.organizationId,
        wsId,
        title || 'Untitled Campaign Copy',
        content_type || 'Social Media Post',
        content_text,
        channel || 'Social Media',
        req.user.name
      );
      const newId = draftResult.lastInsertRowid;

      const insertRev = db.prepare(`
        INSERT INTO content_revisions (draft_id, version_num, content_text, diff_summary, author_id)
        VALUES (?, 1, ?, 'Initial Draft', ?)
      `);
      insertRev.run(newId, content_text, req.user.name);

      logAudit('DRAFT_CREATED', 'content_drafts', newId, req.user, {
        title: title || 'Untitled Campaign Copy'
      }, req.organizationId);

      res.json({
        success: true,
        id: newId,
        version: 1,
        draft: { id: newId, title: title || 'Untitled Campaign Copy', content_text, channel: channel || 'Social Media', current_version: 1 },
        message: 'Draft saved successfully.'
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/content & /api/content/drafts - List drafts
router.get('/', handleGetDrafts);
router.get('/drafts', handleGetDrafts);

// POST /api/content & /api/content/drafts - Save draft
router.post('/', handleSaveDraft);
router.post('/drafts', handleSaveDraft);

// GET /api/content/:id & /api/content/drafts/:id - Get single draft
router.get('/drafts/:id', handleGetDraftById);
router.get('/:id', handleGetDraftById);

// GET /api/content/drafts/:id/compare - Compare revisions side by side
router.get('/drafts/:id/compare', (req, res) => {
  const { v1, v2 } = req.query;
  const db = getDb();
  try {
    const draft = db.prepare('SELECT id FROM content_drafts WHERE id = ? AND organization_id = ?').get(req.params.id, req.organizationId);
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found in your organization.' });
    }

    const rev1 = db.prepare('SELECT * FROM content_revisions WHERE draft_id = ? AND version_num = ?').get(req.params.id, v1 || 1);
    const rev2 = db.prepare('SELECT * FROM content_revisions WHERE draft_id = ? AND version_num = ?').get(req.params.id, v2 || 2);

    if (!rev1 || !rev2) {
      return res.status(404).json({ success: false, error: 'One or both versions not found for comparison.' });
    }

    res.json({
      success: true,
      v1: { version: rev1.version_num, text: rev1.content_text, date: rev1.created_at },
      v2: { version: rev2.version_num, text: rev2.content_text, date: rev2.created_at }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
