const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db');
const { authenticate, requireRole } = require('../auth');

router.use(authenticate);

function evaluateClaimRecord(claim) {
  const now = new Date();
  const hasEvidence = !!(claim.evidence_source && claim.evidence_source.trim());
  const hasRef = !!(claim.source_reference && claim.source_reference.trim());

  if (!hasEvidence || !hasRef) {
    return {
      status: 'needs_verification',
      badge: 'Needs Verification',
      reason: 'Missing supporting evidence source or document reference'
    };
  }

  if (claim.valid_to) {
    const expiry = new Date(claim.valid_to);
    if (!isNaN(expiry.getTime()) && expiry < now) {
      return {
        status: 'expired',
        badge: 'Expired Evidence',
        reason: `Evidence expired on ${claim.valid_to}. Requires renewal or authorized policy exception.`
      };
    }
  }

  if (claim.approval_status === 'pending') {
    return {
      status: 'pending',
      badge: 'Pending Approval',
      reason: 'Awaiting Brand Manager approval'
    };
  }

  if (claim.approval_status === 'rejected') {
    return {
      status: 'rejected',
      badge: 'Rejected',
      reason: 'Claim rejected by Brand Authority'
    };
  }

  return {
    status: 'approved',
    badge: 'Verified & Active',
    reason: 'Active substantiation record on file'
  };
}

// GET /api/claims - List claims in user's organization with dynamic status calculation
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const claims = db.prepare(`
      SELECT c.*,
        (SELECT source_name FROM claim_evidence WHERE claim_id = c.id LIMIT 1) as evidence_source,
        (SELECT doc_reference FROM claim_evidence WHERE claim_id = c.id LIMIT 1) as source_reference,
        (SELECT title FROM claim_evidence WHERE claim_id = c.id LIMIT 1) as evidence_title
      FROM claim_ledger c
      WHERE c.organization_id = ?
      ORDER BY c.id DESC
    `).all(req.organizationId);

    const evaluated = claims.map(c => {
      const evaluation = evaluateClaimRecord(c);
      return {
        ...c,
        computed_status: evaluation.status,
        status_badge: evaluation.badge,
        status_reason: evaluation.reason
      };
    });

    res.json({ success: true, claims: evaluated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/claims/:id - Get single claim
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const claim = db.prepare(`
      SELECT c.*,
        (SELECT source_name FROM claim_evidence WHERE claim_id = c.id LIMIT 1) as evidence_source,
        (SELECT doc_reference FROM claim_evidence WHERE claim_id = c.id LIMIT 1) as source_reference,
        (SELECT title FROM claim_evidence WHERE claim_id = c.id LIMIT 1) as evidence_title
      FROM claim_ledger c
      WHERE c.id = ? AND c.organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found in your organization.' });
    }

    const evaluation = evaluateClaimRecord(claim);
    res.json({
      success: true,
      claim: {
        ...claim,
        computed_status: evaluation.status,
        status_badge: evaluation.badge,
        status_reason: evaluation.reason
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/claims - Add a claim to the ledger
router.post('/', (req, res) => {
  const {
    claim_code, claim_title, claim_text, category, evidence_source, source_reference,
    owner, valid_from, valid_to, approval_status, workspace_id
  } = req.body;

  if (!claim_text) {
    return res.status(400).json({ success: false, error: 'Claim text is required.' });
  }

  const db = getDb();
  const wsId = workspace_id || 1;
  const initialStatus = (req.user.role === 'creator') ? 'pending' : (approval_status || 'approved');

  try {
    const code = claim_code || `CLM-${Date.now().toString().slice(-4)}`;

    const stmt = db.prepare(`
      INSERT INTO claim_ledger (
        organization_id, workspace_id, claim_code, claim_title, claim_text, category, approval_status,
        owner, reviewer, valid_from, valid_to, created_by, approved_by, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const approvedBy = (initialStatus === 'approved') ? req.user.name : null;
    const approvedAt = (initialStatus === 'approved') ? new Date().toISOString() : null;

    const result = stmt.run(
      req.organizationId,
      wsId,
      code,
      claim_title ?? null,
      claim_text,
      category || 'Performance',
      initialStatus,
      owner || req.user.name,
      null,
      valid_from ?? null,
      valid_to ?? null,
      req.user.name,
      approvedBy,
      approvedAt
    );

    const claimId = result.lastInsertRowid;

    // Attach supporting evidence record if provided
    if (evidence_source || source_reference) {
      db.prepare(`
        INSERT INTO claim_evidence (
          claim_id, title, source_name, source_url, supporting_excerpt, doc_reference, evidence_date, expiration_date, verification_status
        ) VALUES (?, ?, ?, null, null, ?, ?, ?, 'VERIFIED')
      `).run(
        claimId,
        claim_title || 'Supporting Documentation',
        evidence_source || 'Verified Source',
        source_reference ?? null,
        valid_from ?? null,
        valid_to ?? null
      );
    }

    logAudit('CLAIM_CREATED', 'claim_ledger', claimId, req.user, {
      claim_code: code,
      status: initialStatus
    }, req.organizationId);

    res.json({
      success: true,
      id: claimId,
      claim_code: code,
      approval_status: initialStatus,
      message: 'Claim recorded in persistent Claim Ledger.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/claims/:id/approve - Approve claim (Brand Manager / Admin only)
router.post('/:id/approve', requireRole('admin', 'brand_manager'), (req, res) => {
  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM claim_ledger WHERE id = ? AND organization_id = ?').get(req.params.id, req.organizationId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Claim not found in your organization.' });
    }

    const stmt = db.prepare(`
      UPDATE claim_ledger SET
        approval_status = 'approved',
        approved_by = ?,
        approved_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `);

    stmt.run(req.user.name, req.params.id, req.organizationId);

    logAudit('CLAIM_APPROVED', 'claim_ledger', req.params.id, req.user, {
      claim_code: existing.claim_code
    }, req.organizationId);

    res.json({
      success: true,
      message: `Claim ${existing.claim_code} has been approved.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/claims/:id/exception - Approve policy exception with recorded reason
router.post('/:id/exception', requireRole('admin', 'brand_manager'), (req, res) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({
      success: false,
      error: 'A recorded, detailed justification reason is mandatory when approving a policy exception.'
    });
  }

  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM claim_ledger WHERE id = ? AND organization_id = ?').get(req.params.id, req.organizationId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Claim not found in your organization.' });
    }

    const stmt = db.prepare(`
      UPDATE claim_ledger SET
        approval_status = 'approved',
        policy_exception_reason = ?,
        approved_by = ?,
        approved_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `);

    stmt.run(reason, req.user.name, req.params.id, req.organizationId);

    logAudit('CLAIM_POLICY_EXCEPTION', 'claim_ledger', req.params.id, req.user, {
      claim_code: existing.claim_code,
      reason
    }, req.organizationId);

    res.json({
      success: true,
      message: `Policy exception granted and recorded for claim ${existing.claim_code}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
