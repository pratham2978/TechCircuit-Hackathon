const { getDb } = require('./db');
const { matchClaims } = require('./claim-matching');
const { predictTone } = require('./ml-service');
const { scanHtmlImagesForAlt } = require('./image-checks');

async function executeContentReview(draftId, revisionId, contentText, organizationId, workspaceId) {
  const db = getDb();

  // 1. Load active approved rules
  const approvedRules = db.prepare(`
    SELECT * FROM brand_rules
    WHERE organization_id = ? AND workspace_id = ? AND status = 'approved'
  `).all(organizationId, workspaceId);

  // 2. Load approved claims
  const approvedClaims = db.prepare(`
    SELECT c.*,
      (SELECT source_name FROM claim_evidence WHERE claim_id = c.id LIMIT 1) as evidence_source,
      (SELECT doc_reference FROM claim_evidence WHERE claim_id = c.id LIMIT 1) as source_reference
    FROM claim_ledger c
    WHERE c.organization_id = ? AND c.workspace_id = ?
  `).all(organizationId, workspaceId);

  const findings = [];
  let findingCount = 1;

  // 3. Deterministic Rule Checks (Terminology, Prohibited Phrases, Disclaimers)
  for (const rule of approvedRules) {
    const pattern = rule.pattern_or_phrase?.trim();
    const replacement = rule.replacement_or_guidance?.trim();

    if (rule.rule_type === 'prohibited_term' && pattern) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let m;

      while ((m = regex.exec(contentText)) !== null) {
        const matched = m[0];
        const start = m.index;
        const end = start + matched.length;

        findings.push({
          finding_code: `RULE-FIND-${findingCount++}`,
          category: rule.category || 'Prohibited Terminology',
          severity: (rule.severity || 'HIGH').toUpperCase(),
          explanation: `The phrase "${matched}" is prohibited under brand rule ${rule.rule_code} (${rule.title}). Guidance: ${rule.description}`,
          matched_text: matched,
          start_offset: start,
          end_offset: end,
          rule_id: rule.rule_code,
          claim_id: null,
          evidence_reference: rule.source_reference || 'Authoritative Brand Guidelines',
          suggested_correction: contentText.slice(0, start) + (replacement || '[approved alternative]') + contentText.slice(end),
          verification_status: 'HIGH'
        });
      }
    } else if (rule.rule_type === 'deterministic_term' && pattern) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let m;

      while ((m = regex.exec(contentText)) !== null) {
        const matched = m[0];
        if (replacement && matched !== replacement) {
          const start = m.index;
          const end = start + matched.length;

          findings.push({
            finding_code: `RULE-FIND-${findingCount++}`,
            category: rule.category || 'Required Terminology',
            severity: (rule.severity || 'MEDIUM').toUpperCase(),
            explanation: `Found "${matched}", but brand policy requires authoritative casing "${replacement}" per ${rule.rule_code}.`,
            matched_text: matched,
            start_offset: start,
            end_offset: end,
            rule_id: rule.rule_code,
            claim_id: null,
            evidence_reference: rule.source_reference || 'Brand Governance Manual',
            suggested_correction: contentText.slice(0, start) + replacement + contentText.slice(end),
            verification_status: 'HIGH'
          });
        }
      }
    } else if (rule.rule_type === 'required_phrase' && pattern) {
      if (!contentText.toLowerCase().includes(pattern.toLowerCase())) {
        findings.push({
          finding_code: `RULE-FIND-${findingCount++}`,
          category: rule.category || 'Legal Disclaimers',
          severity: (rule.severity || 'HIGH').toUpperCase(),
          explanation: `Mandatory disclaimer is missing: "${pattern}" per rule ${rule.rule_code}.`,
          matched_text: null,
          start_offset: null,
          end_offset: null,
          rule_id: rule.rule_code,
          claim_id: null,
          evidence_reference: rule.source_reference || 'Compliance Disclaimers',
          suggested_correction: `${contentText.trim()}\n\n*${pattern}*`,
          verification_status: 'HIGH'
        });
      }
    }
  }

  // 4. Deterministic Claim Verification
  const claimFindings = matchClaims(contentText, approvedClaims);
  for (const cf of claimFindings) {
    findings.push({
      finding_code: cf.finding_id,
      category: cf.category,
      severity: cf.severity,
      explanation: cf.explanation,
      matched_text: cf.matched_text,
      start_offset: cf.start_offset,
      end_offset: cf.end_offset,
      rule_id: null,
      claim_id: cf.claim_id,
      evidence_reference: cf.evidence_reference,
      suggested_correction: cf.suggested_correction,
      verification_status: cf.verification_status
    });
  }

  // 5. Genuine Local ML Classification (Tone & Emotion)
  const mlResult = await predictTone(contentText);

  // Fix 3: Only emit a tone finding if ML is available AND the tone violates policy
  if (mlResult.status !== 'unavailable') {
    const ws = db.prepare('SELECT preferred_tone FROM workspaces WHERE id = ?').get(workspaceId);
    const preferredTone = ws?.preferred_tone?.toLowerCase() || 'professional';

    if (mlResult.predicted_tone === 'Exaggerated' && preferredTone.includes('modest')) {
      findings.push({
        finding_code: `ML-TONE-${findingCount++}`,
        category: 'Tone of Voice',
        severity: 'MEDIUM',
        explanation: `Local ML tone model classified copy as "${mlResult.predicted_tone}" (confidence: ${Math.round(mlResult.confidence * 100)}%). Brand policy requires measured, modest tone.`,
        matched_text: null,
        start_offset: null,
        end_offset: null,
        rule_id: null,
        claim_id: null,
        evidence_reference: `ML Model (${mlResult.model_version})`,
        suggested_correction: 'Refine hyperbolic phrasing to measured, factual value statements.',
        verification_status: 'ML_PREDICTED'
      });
    } else if (mlResult.predicted_tone === 'Informal' && preferredTone.includes('professional')) {
      findings.push({
        finding_code: `ML-TONE-${findingCount++}`,
        category: 'Tone of Voice',
        severity: 'MEDIUM',
        explanation: `Local ML tone model classified copy as "${mlResult.predicted_tone}" (confidence: ${Math.round(mlResult.confidence * 100)}%). Brand policy requires professional communications.`,
        matched_text: null,
        start_offset: null,
        end_offset: null,
        rule_id: null,
        claim_id: null,
        evidence_reference: `ML Model (${mlResult.model_version})`,
        suggested_correction: 'Remove colloquial slang and adopt standard business vocabulary.',
        verification_status: 'ML_PREDICTED'
      });
    }
  }

  // 5b. Accessibility Checks (WCAG 1.1.1 Non-text Content: HTML <img> tags missing alt)
  const htmlImgFindings = scanHtmlImagesForAlt(contentText);
  for (const hf of htmlImgFindings) {
    findings.push({
      finding_code: hf.finding_id,
      category: hf.category,
      severity: hf.severity,
      explanation: hf.explanation,
      matched_text: hf.matched_text,
      start_offset: null,
      end_offset: null,
      rule_id: hf.rule_id,
      claim_id: null,
      evidence_reference: hf.evidence_reference,
      suggested_correction: hf.suggested_correction,
      verification_status: hf.verification_status
    });
  }

  // 6. Persist Review Record
  const insertRev = db.prepare(`
    INSERT INTO reviews (draft_id, revision_id, stage, status, ml_tone_predicted, ml_confidence)
    VALUES (?, ?, 'FULL_REVIEW', 'COMPLETED', ?, ?)
  `);
  const revRes = insertRev.run(draftId, revisionId, mlResult.predicted_tone, mlResult.confidence);
  const reviewId = revRes.lastInsertRowid;

  // Persist findings linked to this review and revision
  db.prepare('DELETE FROM review_findings WHERE draft_id = ? AND revision_id = ?').run(draftId, revisionId);

  const insertFinding = db.prepare(`
    INSERT INTO review_findings (
      review_id, draft_id, revision_id, category, severity, explanation,
      matched_text, start_offset, end_offset, rule_id, claim_id,
      evidence_reference, suggested_correction, verification_status, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
  `);

  for (const f of findings) {
    insertFinding.run(
      reviewId,
      draftId,
      revisionId,
      f.category,
      f.severity,
      f.explanation,
      f.matched_text ?? null,
      f.start_offset ?? null,
      f.end_offset ?? null,
      f.rule_id ?? null,
      f.claim_id ?? null,
      f.evidence_reference ?? null,
      f.suggested_correction ?? null,
      f.verification_status || 'HIGH'
    );
  }

  const savedFindings = db.prepare('SELECT * FROM review_findings WHERE review_id = ? ORDER BY id ASC').all(reviewId);

  return {
    review_id: reviewId,
    draft_id: draftId,
    revision_id: revisionId,
    ml_prediction: mlResult,
    findings: savedFindings,
    summary: {
      total: savedFindings.length,
      high: savedFindings.filter(f => f.severity === 'HIGH').length,
      medium: savedFindings.filter(f => f.severity === 'MEDIUM').length,
      low: savedFindings.filter(f => f.severity === 'LOW').length,
      info: savedFindings.filter(f => f.severity === 'INFO').length
    }
  };
}

module.exports = {
  executeContentReview
};
