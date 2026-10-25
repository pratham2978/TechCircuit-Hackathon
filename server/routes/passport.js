const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate } = require('../auth');
const { getModelMetrics } = require('../ml-service');
const { getContrastRatio } = require('../accessibility');

router.use(authenticate);

// GET /api/passport - Brand Passport data compiled from database
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const orgId = req.organizationId;
    const workspaceId = req.query.workspace_id || 1;

    const workspace = db.prepare(`
      SELECT * FROM workspaces WHERE id = ? AND organization_id = ?
    `).get(workspaceId, orgId) || db.prepare(`
      SELECT * FROM workspaces WHERE organization_id = ? LIMIT 1
    `).get(orgId);

    const approvedRules = db.prepare(`
      SELECT rule_code, category, title, description, rule_type, pattern_or_phrase, replacement_or_guidance, severity, source_reference
      FROM brand_rules
      WHERE organization_id = ? AND status = 'approved'
      ORDER BY id ASC
    `).all(orgId);

    const approvedClaims = db.prepare(`
      SELECT c.claim_code, c.claim_title, c.claim_text, c.category, c.owner, c.valid_from, c.valid_to,
             e.title as evidence_title, e.source_name, e.doc_reference, e.verification_status
      FROM claim_ledger c
      LEFT JOIN claim_evidence e ON c.id = e.claim_id
      WHERE c.organization_id = ? AND c.approval_status = 'approved'
      ORDER BY c.id ASC
    `).all(orgId);

    const assets = db.prepare(`
      SELECT * FROM brand_assets
      WHERE organization_id = ?
      ORDER BY id ASC
    `).all(orgId);

    // Compute WCAG contrast ratios for brand color palette
    const evaluatedAssets = assets.map(a => {
      const parsed = a.metadata_json ? JSON.parse(a.metadata_json) : {};
      if (a.asset_type === 'color_palette' && parsed.primary && parsed.background) {
        const ratio = getContrastRatio(parsed.primary, parsed.background);
        parsed.wcag_contrast_ratio = ratio ? Math.round(ratio * 100) / 100 : null;
        parsed.wcag_aa_compliant = ratio ? ratio >= 4.5 : false;
      }
      return { ...a, metadata: parsed };
    });

    const mlMetrics = getModelMetrics();

    const pendingApprovalsCount = db.prepare(`
      SELECT COUNT(*) as count FROM brand_rules WHERE organization_id = ? AND status = 'candidate'
    `).get(orgId).count;

    const openIssuesCount = db.prepare(`
      SELECT COUNT(*) as count FROM review_findings f
      JOIN content_drafts d ON f.draft_id = d.id
      WHERE d.organization_id = ? AND f.status = 'open'
    `).get(orgId).count;

    res.json({
      success: true,
      passport: {
        organization: req.organization.name,
        workspace: workspace ? {
          name: workspace.name,
          description: workspace.description,
          industry: workspace.industry,
          preferred_tone: workspace.preferred_tone,
          approved_terminology: workspace.approved_terminology,
          prohibited_terminology: workspace.prohibited_terminology,
          brand_colors: workspace.brand_colors
        } : null,
        approved_rules: approvedRules,
        approved_claims: approvedClaims,
        approved_guidelines: db.prepare(`
          SELECT original_name as filename,
            (SELECT COUNT(*) FROM brand_rules WHERE source_document_id = d.id) as extracted_rules_count
          FROM guideline_documents d
          WHERE organization_id = ?
        `).all(orgId),
        brand_assets: evaluatedAssets,
        local_ml_model: mlMetrics ? {
          name: mlMetrics.model_name,
          architecture: mlMetrics.architecture,
          accuracy: mlMetrics.accuracy,
          precision: mlMetrics.precision_macro,
          recall: mlMetrics.recall_macro,
          f1: mlMetrics.f1_macro
        } : null,
        governance_status: {
          pending_rule_approvals: pendingApprovalsCount,
          open_compliance_issues: openIssuesCount
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/passport/contrast - Compute WCAG 2.1 contrast ratio
router.post('/contrast', (req, res) => {
  const { foreground_hex, background_hex } = req.body;
  if (!foreground_hex || !background_hex) {
    return res.status(400).json({ success: false, error: 'Both foreground_hex and background_hex are required.' });
  }

  const ratio = getContrastRatio(foreground_hex, background_hex);
  if (ratio === null || isNaN(ratio)) {
    return res.status(400).json({ success: false, error: 'Invalid hex color codes.' });
  }

  const rounded = Math.round(ratio * 100) / 100;
  res.json({
    success: true,
    contrast_ratio: rounded,
    wcag_aa: rounded >= 4.5,
    wcag_aaa: rounded >= 7.0,
    wcag_aa_large: rounded >= 3.0
  });
});

module.exports = router;
