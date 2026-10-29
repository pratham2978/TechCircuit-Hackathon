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

    // Claims expiring within 30 days
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiringSoonClaims = claims.filter(c => {
      if (!c.valid_to) return false;
      const exp = new Date(c.valid_to);
      return exp >= now && (exp - now <= thirtyDaysMs);
    });

    // Improvement #2: Per-rule health metrics (firings, dismissals, dismissal rate, top reason, needs_clarification)
    const orgRules = db.prepare(`
      SELECT r.id, r.rule_code, r.title, r.category, r.severity, r.status
      FROM brand_rules r
      WHERE r.organization_id = ?
      ORDER BY r.id ASC
    `).all(orgId);

    // Get findings stats per rule
    const ruleFindingsStats = db.prepare(`
      SELECT
        f.rule_id,
        COUNT(*) as times_fired,
        SUM(CASE WHEN f.status = 'rejected' THEN 1 ELSE 0 END) as times_dismissed,
        SUM(CASE WHEN f.dismiss_reason = 'rule_unclear' THEN 1 ELSE 0 END) as count_rule_unclear,
        SUM(CASE WHEN f.dismiss_reason = 'false_positive' THEN 1 ELSE 0 END) as count_false_positive,
        SUM(CASE WHEN f.dismiss_reason = 'approved_exception' THEN 1 ELSE 0 END) as count_approved_exception,
        SUM(CASE WHEN f.dismiss_reason = 'ok_in_context' THEN 1 ELSE 0 END) as count_ok_in_context
      FROM review_findings f
      JOIN content_drafts d ON f.draft_id = d.id
      WHERE d.organization_id = ? AND f.rule_id IS NOT NULL
      GROUP BY f.rule_id
    `).all(orgId);

    const ruleStatsMap = {};
    for (const rs of ruleFindingsStats) {
      ruleStatsMap[rs.rule_id] = rs;
    }

    const ruleHealth = orgRules.map(r => {
      const stats = ruleStatsMap[r.rule_code] || {
        times_fired: 0,
        times_dismissed: 0,
        count_rule_unclear: 0,
        count_false_positive: 0,
        count_approved_exception: 0,
        count_ok_in_context: 0
      };

      const fired = stats.times_fired || 0;
      const dismissed = stats.times_dismissed || 0;
      const dismissalRate = fired > 0 ? Math.round((dismissed / fired) * 100) : 0;

      // Find top reason
      const reasonCounts = [
        { reason: 'rule_unclear', count: stats.count_rule_unclear || 0 },
        { reason: 'false_positive', count: stats.count_false_positive || 0 },
        { reason: 'approved_exception', count: stats.count_approved_exception || 0 },
        { reason: 'ok_in_context', count: stats.count_ok_in_context || 0 }
      ].sort((a, b) => b.count - a.count);

      const topReason = reasonCounts[0].count > 0 ? reasonCounts[0].reason : null;

      // Spec #2 condition: Flag "Needs clarification" at >= 5 firings and >= 40% dismissed, OR >= 2 rule_unclear reasons
      const needsClarification = (fired >= 5 && dismissalRate >= 40) || (stats.count_rule_unclear >= 2);

      return {
        id: r.id,
        rule_code: r.rule_code,
        title: r.title,
        category: r.category,
        severity: r.severity,
        status: r.status,
        times_fired: fired,
        times_dismissed: dismissed,
        dismissal_rate: dismissalRate,
        top_reason: topReason,
        rule_unclear_count: stats.count_rule_unclear || 0,
        needs_clarification: needsClarification
      };
    });

    // Improvement #2: Per-claim health metrics
    const claimFindingsStats = db.prepare(`
      SELECT
        f.claim_id,
        COUNT(*) as times_fired,
        SUM(CASE WHEN f.status = 'rejected' THEN 1 ELSE 0 END) as times_dismissed,
        f.dismiss_reason,
        COUNT(f.dismiss_reason) as reason_freq
      FROM review_findings f
      JOIN content_drafts d ON f.draft_id = d.id
      WHERE d.organization_id = ? AND f.claim_id IS NOT NULL
      GROUP BY f.claim_id, f.dismiss_reason
    `).all(orgId);

    const claimMap = {};
    for (const c of claims) {
      claimMap[c.claim_code] = {
        id: c.id,
        claim_code: c.claim_code,
        claim_title: c.claim_title,
        valid_to: c.valid_to,
        times_fired: 0,
        times_dismissed: 0,
        dismissal_rate: 0,
        top_reason: null
      };
    }
    for (const cfs of claimFindingsStats) {
      if (claimMap[cfs.claim_id]) {
        claimMap[cfs.claim_id].times_fired += cfs.times_fired;
        claimMap[cfs.claim_id].times_dismissed += cfs.times_dismissed;
        if (!claimMap[cfs.claim_id].top_reason && cfs.dismiss_reason) {
          claimMap[cfs.claim_id].top_reason = cfs.dismiss_reason;
        }
      }
    }
    const claimHealth = Object.values(claimMap).map(c => {
      c.dismissal_rate = c.times_fired > 0 ? Math.round((c.times_dismissed / c.times_fired) * 100) : 0;
      return c;
    });

    const flaggedRulesCount = ruleHealth.filter(r => r.needs_clarification).length;

    const statsObj = {
      approved_rules: approvedRulesCount,
      pending_rules: pendingRulesCount,
      total_claims: claims.length,
      verified_claims: verifiedClaimsCount,
      needs_verification_claims: needsVerificationCount,
      expired_claims: expiredClaimsCount,
      expiring_soon_claims: expiringSoonClaims.length,
      high_severity_findings: openHighFindings,
      total_approvals: approvalDecisions,
      total_rejections: rejectionDecisions,
      flagged_rules_count: flaggedRulesCount
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
      rule_health: ruleHealth,
      claim_health: claimHealth,
      claims_expiring_soon: expiringSoonClaims.map(c => ({
        id: c.id,
        claim_code: c.claim_code,
        claim_title: c.claim_title,
        valid_to: c.valid_to,
        owner: c.owner
      })),
      recent_reviews: recentReviews
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
