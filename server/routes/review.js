const express = require('express');
const router = express.Router();
const { getDb, logAudit } = require('../db');
const { authenticate } = require('../auth');
const { executeContentReview } = require('../review-engine');

router.use(authenticate);

// POST /api/review/run - Execute two-stage BrandGuard content review
router.post('/run', async (req, res) => {
  const { draft_id, content_text, content, workspace_id } = req.body;
  const db = getDb();
  const wsId = workspace_id || 1;

  let textToReview = content_text || content;
  let targetDraftId = draft_id;
  let revisionId = 1;

  try {
    if (draft_id) {
      const draft = db.prepare('SELECT * FROM content_drafts WHERE id = ? AND organization_id = ?').get(draft_id, req.organizationId);
      if (draft) {
        textToReview = content_text || content || draft.content_text;
        revisionId = draft.current_version;
      } else {
        return res.status(404).json({ success: false, error: 'Draft not found in your organization.' });
      }
    } else {
      const insertDraft = db.prepare(`
        INSERT INTO content_drafts (organization_id, workspace_id, title, content_type, content_text, author_id, status)
        VALUES (?, ?, 'Campaign Copy', 'Social Media Post', ?, ?, 'DRAFT')
      `);
      const r = insertDraft.run(req.organizationId, wsId, textToReview, req.user.name);
      targetDraftId = r.lastInsertRowid;

      const revRes = db.prepare(`
        INSERT INTO content_revisions (draft_id, version_num, content_text, diff_summary, author_id)
        VALUES (?, 1, ?, 'Initial Draft', ?)
      `).run(targetDraftId, textToReview, req.user.name);
      revisionId = revRes.lastInsertRowid;
    }

    if (!textToReview || !textToReview.trim()) {
      return res.status(400).json({ success: false, error: 'Content text to review cannot be empty.' });
    }

    // Execute full review pipeline (Deterministic rules + Claim matching + Local ML tone)
    const reviewResult = await executeContentReview(
      targetDraftId,
      revisionId,
      textToReview,
      req.organizationId,
      wsId
    );

    logAudit('REVIEW_EXECUTED', 'content_drafts', targetDraftId, req.user, {
      totalFindings: reviewResult.findings.length,
      highSeverity: reviewResult.summary.high,
      predictedTone: reviewResult.ml_prediction.predicted_tone
    }, req.organizationId);

    res.json({
      success: true,
      draft_id: targetDraftId,
      revision_id: revisionId,
      findings: reviewResult.findings,
      summary: reviewResult.summary,
      ml_tone: reviewResult.ml_prediction,
      tone_prediction: reviewResult.ml_prediction,
      engine: 'BrandGuard Local Deterministic & ML Governance Engine'
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/review/findings/:id/accept - Accept suggestion & record revision
router.post('/findings/:id/accept', (req, res) => {
  const db = getDb();
  try {
    const finding = db.prepare(`
      SELECT f.*, d.organization_id, d.content_text, d.current_version
      FROM review_findings f
      JOIN content_drafts d ON f.draft_id = d.id
      WHERE f.id = ? AND d.organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!finding) {
      return res.status(404).json({ success: false, error: 'Finding not found in your organization.' });
    }

    // Fix 2: 409 Conflict guard — reject duplicate / already-processed clicks
    if (finding.status !== 'open') {
      return res.status(409).json({
        success: false,
        error: `Finding #${finding.id} is already "${finding.status}". No further action needed.`,
        current_status: finding.status
      });
    }

    if (!finding.matched_text || finding.start_offset == null || finding.end_offset == null) {
      return res.status(400).json({ success: false, error: 'This finding does not have a span-based correction.' });
    }

    // Fix 1: Apply correction to CURRENT draft text at the correct span offset
    const currentText = finding.content_text;
    const { start_offset, end_offset, matched_text } = finding;

    // Stale detection: verify the matched text still exists at the recorded offset
    const slice = currentText.slice(start_offset, end_offset);
    let newContent;
    const replacement = finding.suggested_correction || '[approved alternative]';

    if (slice.toLowerCase() === matched_text.toLowerCase()) {
      // Exact span match — apply surgically
      newContent = currentText.slice(0, start_offset) + replacement + currentText.slice(end_offset);
    } else {
      // Offset is stale (earlier edits shifted text) — try a full-string replace as fallback
      const idx = currentText.indexOf(matched_text);
      if (idx !== -1) {
        newContent = currentText.slice(0, idx) + replacement + currentText.slice(idx + matched_text.length);
      } else {
        return res.status(409).json({
          success: false,
          error: `The matched text "${matched_text}" is no longer present in the draft (already fixed or overwritten). Re-run the scan to get fresh findings.`,
          current_status: 'stale'
        });
      }
    }

    const nextVersion = finding.current_version + 1;

    db.prepare(`
      UPDATE content_drafts SET
        content_text = ?,
        current_version = ?,
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `).run(newContent, nextVersion, finding.draft_id, req.organizationId);

    db.prepare(`
      INSERT INTO content_revisions (draft_id, version_num, content_text, diff_summary, author_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      finding.draft_id,
      nextVersion,
      newContent,
      `Accepted suggestion from finding #${finding.id}: "${finding.category}"`,
      req.user.name
    );

    db.prepare("UPDATE review_findings SET status = 'accepted' WHERE id = ?").run(req.params.id);

    logAudit('SUGGESTION_ACCEPTED', 'review_findings', req.params.id, req.user, {
      draft_id: finding.draft_id,
      version: nextVersion
    }, req.organizationId);

    res.json({
      success: true,
      draft_id: finding.draft_id,
      version: nextVersion,
      content_text: newContent,
      message: `Suggestion applied. Updated to revision v${nextVersion}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/review/findings/:id/edit - Edit suggestion & record revision
router.post('/findings/:id/edit', (req, res) => {
  const { edited_text } = req.body;
  const db = getDb();

  if (!edited_text || !edited_text.trim()) {
    return res.status(400).json({ success: false, error: 'Edited correction text cannot be empty.' });
  }

  try {
    const finding = db.prepare(`
      SELECT f.*, d.organization_id, d.content_text, d.current_version
      FROM review_findings f
      JOIN content_drafts d ON f.draft_id = d.id
      WHERE f.id = ? AND d.organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!finding) {
      return res.status(404).json({ success: false, error: 'Finding not found in your organization.' });
    }

    // Fix 2: 409 Conflict guard — reject duplicate / already-processed clicks
    if (finding.status !== 'open') {
      return res.status(409).json({
        success: false,
        error: `Finding #${finding.id} is already "${finding.status}". No further action needed.`,
        current_status: finding.status
      });
    }

    const nextVersion = finding.current_version + 1;

    db.prepare(`
      UPDATE content_drafts SET
        content_text = ?,
        current_version = ?,
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `).run(edited_text, nextVersion, finding.draft_id, req.organizationId);

    db.prepare(`
      INSERT INTO content_revisions (draft_id, version_num, content_text, diff_summary, author_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      finding.draft_id,
      nextVersion,
      edited_text,
      `Custom edited resolution for finding #${finding.id}`,
      req.user.name
    );

    db.prepare(`
      UPDATE review_findings SET
        suggested_correction = ?,
        status = 'edited'
      WHERE id = ?
    `).run(edited_text, req.params.id);

    logAudit('SUGGESTION_EDITED', 'review_findings', req.params.id, req.user, {
      draft_id: finding.draft_id,
      version: nextVersion
    }, req.organizationId);

    res.json({
      success: true,
      draft_id: finding.draft_id,
      version: nextVersion,
      content_text: edited_text,
      message: `Custom correction applied. Updated to revision v${nextVersion}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/review/findings/:id/reject - Dismiss finding (requires valid dismiss_reason)
router.post('/findings/:id/reject', (req, res) => {
  const { dismiss_reason, dismiss_note } = req.body;
  const db = getDb();

  const VALID_DISMISS_REASONS = ['false_positive', 'rule_unclear', 'approved_exception', 'ok_in_context'];
  if (!dismiss_reason || !VALID_DISMISS_REASONS.includes(dismiss_reason)) {
    return res.status(400).json({
      success: false,
      error: `A valid dismissal reason is required. Allowed values: ${VALID_DISMISS_REASONS.join(', ')}.`
    });
  }

  try {
    const finding = db.prepare(`
      SELECT f.*, d.organization_id
      FROM review_findings f
      JOIN content_drafts d ON f.draft_id = d.id
      WHERE f.id = ? AND d.organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!finding) {
      return res.status(404).json({ success: false, error: 'Finding not found in your organization.' });
    }

    // Fix 2: 409 Conflict guard
    if (finding.status !== 'open') {
      return res.status(409).json({
        success: false,
        error: `Finding #${finding.id} is already "${finding.status}". Cannot dismiss again.`,
        current_status: finding.status
      });
    }

    db.prepare(`
      UPDATE review_findings SET
        status = 'rejected',
        dismiss_reason = ?,
        dismiss_note = ?
      WHERE id = ?
    `).run(dismiss_reason, dismiss_note || null, req.params.id);

    logAudit('FINDING_DISMISSED', 'review_findings', req.params.id, req.user, {
      draft_id: finding.draft_id,
      rule_id: finding.rule_id,
      claim_id: finding.claim_id,
      dismiss_reason,
      dismiss_note
    }, req.organizationId);

    res.json({
      success: true,
      message: `Finding #${finding.id} dismissed with reason "${dismiss_reason}".`,
      dismiss_reason,
      dismiss_note: dismiss_note || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/review/submit - Submit content for reviewer governance
router.post('/submit', (req, res) => {
  const { draft_id } = req.body;
  const db = getDb();

  try {
    const draft = db.prepare('SELECT * FROM content_drafts WHERE id = ? AND organization_id = ?').get(draft_id, req.organizationId);
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found in your organization.' });
    }

    db.prepare(`
      UPDATE content_drafts SET
        status = 'SUBMITTED',
        submitted_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? AND organization_id = ?
    `).run(draft_id, req.organizationId);

    logAudit('CONTENT_SUBMITTED', 'content_drafts', draft_id, req.user, {
      title: draft.title,
      version: draft.current_version
    }, req.organizationId);

    res.json({
      success: true,
      message: 'Content submitted for review and placed in the Reviewer Queue.',
      status: 'SUBMITTED'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
