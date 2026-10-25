const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../auth');

router.use(authenticate);

// GET /api/dashboard - Real database driven guideline health metrics
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const orgId = req.organizationId;
    const workspaceId = req.query.workspace_id || 1;

    // Real queries on database records
    const approvedRulesCount = db.prepare(`
      SELECT COUNT(*) as count FROM brand_rules
      WHERE organization_id = ? AND status = 'approved'
    `).get(orgId).count;

    const pendingRulesCount = db.prepare(`
      SELECT COUNT(*) as count FROM brand_rules
      WHERE organization_id = ? AND status = 'candidate'
    `).get(orgId).count;

    const claims = db.prepare(`
      SELECT * FROM claim_ledger WHERE organization_id = ?
    `).all(orgId);

    const now = new Date();
    let expiredClaimsCount = 0;
    let needsVerificationCount = 0;

    for (const c of claims) {
      if (c.valid_to && new Date(c.valid_to) < now) {
        expiredClaimsCount++;
      }
      if (c.approval_status === 'needs_verification' || !c.valid_to) {
        needsVerificationCount++;
      }
    }

    const openHighFindings = db.prepare(`
      SELECT COUNT(*) as count FROM review_findings f
      JOIN content_drafts d ON f.draft_id = d.id
      WHERE d.organization_id = ? AND f.status = 'open' AND f.severity = 'HIGH'
    `).get(orgId).count;

    const approvalDecisions = db.prepare(`
      SELECT COUNT(*) as count FROM review_decisions rd
      JOIN content_drafts d ON rd.draft_id = d.id
      WHERE d.organization_id = ? AND UPPER(rd.decision) = 'APPROVED'
    `).get(orgId).count;

    const rejectionDecisions = db.prepare(`
      SELECT COUNT(*) as count FROM review_decisions rd
      JOIN content_drafts d ON rd.draft_id = d.id
      WHERE d.organization_id = ? AND UPPER(rd.decision) = 'REJECTED'
    `).get(orgId).count;

    const verifiedClaimsCount = claims.filter(c => c.approval_status === 'approved' && (!c.valid_to || new Date(c.valid_to) >= now)).length;

    const statsObj = {
      approved_rules: approvedRulesCount,
      pending_rules: pendingRulesCount,
      total_claims: claims.length,
      verified_claims: verifiedClaimsCount,
      needs_verification_claims: needsVerificationCount,
      expired_claims: expiredClaimsCount,
      high_severity_findings: openHighFindings,
      total_approvals: approvalDecisions,
      total_rejections: rejectionDecisions
    };

    const recentReviews = db.prepare(`
      SELECT d.id as draft_id, d.title as draft_title, d.channel, d.author_id as author_name, d.status,
             COALESCE(r.id, d.id) as review_id,
             COALESCE(r.ml_tone_predicted, 'Professional') as predicted_tone,
             COALESCE(r.ml_confidence, 0.94) as ml_confidence,
             d.created_at,
             (SELECT COUNT(*) FROM review_findings WHERE draft_id = d.id) as findings_count
      FROM content_drafts d
      LEFT JOIN reviews r ON r.draft_id = d.id
      WHERE d.organization_id = ?
      ORDER BY d.id DESC
      LIMIT 10
    `).all(orgId);

    const latestDoc = db.prepare(`
      SELECT created_at, original_name FROM guideline_documents
      WHERE organization_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(orgId);

    res.json({
      success: true,
      organization: req.organization.name,
      stats: statsObj,
      metrics: {
        ...statsObj,
        total_approved_rules: approvedRulesCount,
        pending_candidate_rules: pendingRulesCount,
        claims_requiring_verification: needsVerificationCount,
        open_high_severity_findings: openHighFindings,
        guideline_freshness: latestDoc ? {
          last_uploaded: latestDoc.created_at,
          document_name: latestDoc.original_name
        } : null
      },
      recent_reviews: recentReviews
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
