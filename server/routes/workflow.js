const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db');
const { authenticate, requireRole } = require('../auth');

router.use(authenticate);

// GET /api/workflow/queue - Pending submissions in organization
router.get('/queue', (req, res) => {
  try {
    const db = getDb();
    const queue = db.prepare(`
      SELECT d.*,
        (SELECT COUNT(*) FROM review_findings WHERE draft_id = d.id AND status = 'open') as open_findings,
        (SELECT COUNT(*) FROM review_findings WHERE draft_id = d.id AND status = 'open' AND severity = 'HIGH') as high_severity_findings,
        (SELECT COUNT(*) FROM content_revisions WHERE draft_id = d.id) as revision_count
      FROM content_drafts d
      WHERE d.organization_id = ? AND d.status IN ('SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED')
      ORDER BY d.submitted_at DESC, d.id DESC
    `).all(req.organizationId);

    res.json({ success: true, queue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Decision handler logic
function handleDecision(req, res) {
  const { decision, comments } = req.body;
  const draftId = req.params.draft_id || req.body.draft_id;
  const policy_exception = !!(req.body.policy_exception || req.body.manager_policy_exception);
  const exception_reason = req.body.exception_reason || req.body.exception_rationale;
  const db = getDb();

  const validDecisions = ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'approved', 'rejected', 'changes_requested'];
  if (!validDecisions.includes(decision)) {
    return res.status(400).json({
      success: false,
      error: "Invalid decision. Must be 'APPROVED', 'REJECTED', or 'CHANGES_REQUESTED'."
    });
  }

  const normalizedDecision = decision.toUpperCase();

  // Policy exception boundary: Only Brand Manager or Admin can grant exceptions
  if (policy_exception) {
    if (req.user.role !== 'brand_manager' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Permission Denied: Only Brand Managers or Administrators can approve policy exceptions."
      });
    }

    if (!exception_reason || exception_reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "A documented exception justification reason (min 5 characters) is required when overriding policy guidelines."
      });
    }
  }

  try {
    const draft = db.prepare('SELECT * FROM content_drafts WHERE id = ? AND organization_id = ?').get(draftId, req.organizationId);
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found in your organization.' });
    }

    // High severity findings check
    if (normalizedDecision === 'APPROVED') {
      const openHighFindings = db.prepare(`
        SELECT COUNT(*) as count FROM review_findings
        WHERE draft_id = ? AND status = 'open' AND severity = 'HIGH'
      `).get(draftId);

      if (openHighFindings.count > 0 && !policy_exception) {
        return res.status(400).json({
          success: false,
          error: `Cannot approve draft with ${openHighFindings.count} open HIGH-severity finding(s) without an explicit Brand Manager policy exception and documented justification.`
        });
      }
    }

    const insertDecision = db.prepare(`
      INSERT INTO review_decisions (draft_id, revision_id, reviewer_id, decision, comments, policy_exception, exception_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertDecision.run(
      draftId,
      draft.current_version,
      req.user.name,
      normalizedDecision,
      comments ?? null,
      policy_exception ? 1 : 0,
      exception_reason ?? null
    );

    // Update draft status (internal governance; BrandGuard never automatically publishes content)
    db.prepare(`
      UPDATE content_drafts SET
        status = ?,
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `).run(normalizedDecision, draftId, req.organizationId);

    logAudit('WORKFLOW_DECISION', 'content_drafts', draftId, req.user, {
      decision: normalizedDecision,
      comments,
      policy_exception: !!policy_exception,
      exception_reason
    }, req.organizationId);

    res.json({
      success: true,
      decision: normalizedDecision,
      status: normalizedDecision,
      message: `Decision '${normalizedDecision}' recorded. (BrandGuard serves as a governance gate and never automatically publishes content).`
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/workflow/decision & /api/workflow/:draft_id/decision - Reviewer makes decision
router.post('/decision', requireRole('reviewer', 'brand_manager', 'admin'), handleDecision);
router.post('/:draft_id/decision', requireRole('reviewer', 'brand_manager', 'admin'), handleDecision);

// GET /api/workflow/:draft_id/history - Get decision history
router.get('/:draft_id/history', (req, res) => {
  try {
    const db = getDb();
    const draft = db.prepare('SELECT id FROM content_drafts WHERE id = ? AND organization_id = ?').get(req.params.draft_id, req.organizationId);
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found in your organization.' });
    }

    const decisions = db.prepare('SELECT * FROM review_decisions WHERE draft_id = ? ORDER BY id DESC').all(req.params.draft_id);
    res.json({ success: true, decisions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
