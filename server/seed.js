const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

function seedDatabase() {
  const db = getDb();

  // 1. Seed Organizations
  const orgCount = db.prepare('SELECT COUNT(*) as count FROM organizations').get().count;
  let org1Id = 1;
  let org2Id = 2;

  if (orgCount === 0) {
    const insOrg = db.prepare('INSERT INTO organizations (name, slug) VALUES (?, ?)');
    const r1 = insOrg.run('Inkloom AI Inc.', 'inkloom');
    const r2 = insOrg.run('Nexus Corp', 'nexus');
    org1Id = r1.lastInsertRowid;
    org2Id = r2.lastInsertRowid;
  }

  // 2. Seed Users with securely hashed passwords
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const passHash1 = bcrypt.hashSync('BrandGuard2026!', salt);
    const passHash2 = bcrypt.hashSync('Nexus2026!', salt);

    const insUser = db.prepare(`
      INSERT OR IGNORE INTO users (organization_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Inkloom AI BrandGuard users
    insUser.run(org1Id, 'Alex Vance (Administrator)', 'admin@brandguard.ai', passHash1, 'admin');
    insUser.run(org1Id, 'Alex Vance (Administrator)', 'admin@inkloom.ai', passHash1, 'admin');
    insUser.run(org1Id, 'Marcus Sterling (Brand Manager)', 'manager@brandguard.ai', passHash1, 'brand_manager');
    insUser.run(org1Id, 'Marcus Sterling (Brand Manager)', 'manager@inkloom.ai', passHash1, 'brand_manager');
    insUser.run(org1Id, 'Elena Rostova (Compliance Reviewer)', 'reviewer@brandguard.ai', passHash1, 'reviewer');
    insUser.run(org1Id, 'Elena Rostova (Compliance Reviewer)', 'reviewer@inkloom.ai', passHash1, 'reviewer');
    insUser.run(org1Id, 'Sam Taylor (Content Creator)', 'creator@brandguard.ai', passHash1, 'creator');
    insUser.run(org1Id, 'Sam Taylor (Content Creator)', 'creator@inkloom.ai', passHash1, 'creator');

    // Nexus Corp isolated tenant users
    insUser.run(org2Id, 'Morgan Reed (Nexus Creator)', 'nexus@nexuscorp.com', passHash2, 'creator');
    insUser.run(org2Id, 'Nexus Administrator', 'admin@nexuscorp.com', passHash2, 'admin');
  }

  // 3. Seed Brand Workspaces
  const wsCount = db.prepare('SELECT COUNT(*) as count FROM workspaces').get().count;
  let ws1Id = 1;
  if (wsCount === 0) {
    const insWs = db.prepare(`
      INSERT INTO workspaces (organization_id, name, description, industry, preferred_tone, approved_terminology, prohibited_terminology, brand_colors, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `);
    const r1 = insWs.run(
      org1Id,
      'Inkloom AI Master Brand',
      'Primary corporate brand guidelines, vocabulary, and claim substantiation.',
      'AI & Creative Technology',
      'Professional, Authoritative, Modest, Transparent',
      'BrandGuard, Inkloom AI, cost-effective, precision rate',
      'cheap, 100% guaranteed, flawless, miracle',
      '#27231e, #f7f4ee, #c6f432, #22d3ee',
      'Alex Vance'
    );
    insWs.run(
      org2Id,
      'Nexus Corp Internal Brand',
      'Nexus Corporation corporate communications.',
      'Enterprise Software',
      'Formal, Direct',
      'Nexus Enterprise',
      'untested, unverified',
      '#111827, #3b82f6',
      'Morgan Reed'
    );
    ws1Id = r1.lastInsertRowid;
  }

  // 4. Seed Guideline Document
  const docCount = db.prepare('SELECT COUNT(*) as count FROM guideline_documents').get().count;
  let sampleDocId = 1;
  if (docCount === 0) {
    const sampleGuidelineText = `
INKLOOM AI BRAND GOVERNANCE MANUAL (v2.4)

1.0 BRAND IDENTITY & TERMINOLOGY
Our primary brand name is "BrandGuard" (capital B, capital G, one word). Never spell as "Brandguard" or "Brand Guard".
The parent company is "Inkloom AI" (capital I, capital A, capital I). Do not use "Inkloom.ai" or "inkloom".

2.0 PROHIBITED LANGUAGE & VOCABULARY
We do not describe our product as "cheap" or "budget". Always use "cost-effective" or "accessible".
Never use the phrase "100% guaranteed" or "flawless security". Absolute guarantees violate our compliance policy.
Do not use aggressive competitor attacks or disparaging terms like "inferior rivals".

3.0 TONE OF VOICE & MESSAGING
BrandGuard speaks with clarity, authority, and modesty.
Avoid hyperbole, buzzwords, and street slang (e.g. "gonna", "fire", "super hyped").
Maintain an empowering yet rigorously factual tone.

4.0 CLAIMS & FACTUAL SUBSTANTIATION
Any statistical performance or clinical claim must be verified in the Claim Ledger.
Unsubstantiated claims like "99% accuracy" or "industry's fastest" are prohibited unless certified evidence is active.
Expired evidence must be renewed before campaign launch.

5.0 MANDATORY LEGAL DISCLAIMERS
All promotional campaigns offering trial audits must include the required wording: "Terms and conditions apply. Free trial subject to fair use."
    `.trim();

    const insertDoc = db.prepare(`
      INSERT INTO guideline_documents (organization_id, workspace_id, filename, original_name, mime_type, file_size, extracted_text, page_count, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const docResult = insertDoc.run(
      org1Id,
      ws1Id,
      'Inkloom_Brand_Governance_Manual_v2.4.pdf',
      'Inkloom Brand Governance Manual v2.4.pdf',
      'application/pdf',
      128400,
      sampleGuidelineText,
      5,
      'Alex Vance'
    );
    sampleDocId = docResult.lastInsertRowid;
  }

  // 5. Seed Authoritative Brand Rules
  const rulesCount = db.prepare('SELECT COUNT(*) as count FROM brand_rules').get().count;
  if (rulesCount === 0) {
    const insertRule = db.prepare(`
      INSERT INTO brand_rules (
        organization_id, workspace_id, rule_code, category, title, description, rule_type,
        pattern_or_phrase, replacement_or_guidance, severity,
        source_document_id, source_reference, source_excerpt, status, extraction_method, created_by, approved_by, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertRule.run(
      org1Id, ws1Id, 'RULE-001', 'prohibited_phrase', 'Prohibited Term: "cheap"',
      'Do not describe the service as "cheap". Use "cost-effective" or "accessible".',
      'prohibited_term', 'cheap', 'cost-effective', 'High',
      sampleDocId, 'Section 2.0 - Prohibited Language',
      'We do not describe our product as "cheap" or "budget". Always use "cost-effective" or "accessible".',
      'approved', 'deterministic_pattern', 'Alex Vance', 'Marcus Sterling'
    );

    insertRule.run(
      org1Id, ws1Id, 'RULE-002', 'terminology', 'Brand Wordmark Casing',
      'The wordmark must be capitalized as "BrandGuard", not "Brandguard" or "Brand Guard".',
      'deterministic_term', 'Brandguard', 'BrandGuard', 'Medium',
      sampleDocId, 'Section 1.0 - Brand Identity',
      'Our primary brand name is "BrandGuard" (capital B, capital G, one word). Never spell as "Brandguard" or "Brand Guard".',
      'approved', 'deterministic_pattern', 'Alex Vance', 'Marcus Sterling'
    );

    insertRule.run(
      org1Id, ws1Id, 'RULE-003', 'prohibited_phrase', 'Prohibited Hyperbole: "100% guaranteed"',
      'Never claim 100% guarantees or absolute invulnerability.',
      'prohibited_term', '100% guaranteed', 'proven and dependable', 'High',
      sampleDocId, 'Section 2.0 - Prohibited Language',
      'Never use the phrase "100% guaranteed" or "flawless security". Absolute guarantees violate our compliance policy.',
      'approved', 'deterministic_pattern', 'Alex Vance', 'Marcus Sterling'
    );

    insertRule.run(
      org1Id, ws1Id, 'RULE-004', 'legal_disclaimer', 'Mandatory Promotional Disclaimer',
      'Promotional and trial materials must include terms and conditions disclosure.',
      'required_phrase', 'Terms and conditions apply.', 'Terms and conditions apply.', 'High',
      sampleDocId, 'Section 5.0 - Mandatory Legal Disclaimers',
      'All promotional campaigns offering trial audits must include the required wording: "Terms and conditions apply. Free trial subject to fair use."',
      'approved', 'deterministic_pattern', 'Alex Vance', 'Marcus Sterling'
    );

    insertRule.run(
      org1Id, ws1Id, 'RULE-005', 'tone', 'Conversational Headline Brevity',
      'Headlines should not exceed 10 words for social media posts.',
      'ai_guideline', null, 'Keep social media headlines concise and under 10 words.', 'Low',
      sampleDocId, 'Section 3.0 - Tone of Voice',
      'Maintain an empowering yet rigorously factual tone.',
      'candidate', 'heuristic_section', 'AI Compiler', null
    );
  }

  // 6. Seed Claim Ledger & Evidence
  const claimCount = db.prepare('SELECT COUNT(*) as count FROM claim_ledger').get().count;
  if (claimCount === 0) {
    const insertClaim = db.prepare(`
      INSERT INTO claim_ledger (
        organization_id, workspace_id, claim_code, claim_title, claim_text, category, approval_status,
        owner, reviewer, valid_from, valid_to, created_by, approved_by, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertEvidence = db.prepare(`
      INSERT INTO claim_evidence (
        claim_id, title, source_name, source_url, supporting_excerpt, doc_reference, evidence_date, expiration_date, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Claim 1: Active Verified Claim
    const c1 = insertClaim.run(
      org1Id, ws1Id, 'CLM-101', 'Detection Accuracy Rate',
      '99.4% brand compliance detection rate', 'Performance', 'approved',
      'Data Science Team', 'Marcus Sterling', '2026-01-01', '2027-12-31',
      'Marcus Sterling', 'Marcus Sterling'
    );
    insertEvidence.run(
      c1.lastInsertRowid,
      'Q3 2026 Benchmark Compliance Study',
      'Inkloom Analytics Lab Study (n=450 creatives)',
      'https://analytics.inkloom.ai/reports/q3-2026-compliance',
      'Overall accuracy measured across 450 creative assets demonstrated 99.42% precision against active brand rules.',
      'Doc ID #REP-2026-994, Table 3.2, p. 14',
      '2026-01-15',
      '2027-12-31',
      'VERIFIED'
    );

    // Claim 2: Expired Evidence Claim
    const c2 = insertClaim.run(
      org1Id, ws1Id, 'CLM-102', 'Growth Leader 2024',
      '#1 fastest growing creative guardrail tool', 'Market Share', 'approved',
      'Marketing Analytics', 'Marcus Sterling', '2024-01-01', '2024-12-31',
      'Marcus Sterling', 'Marcus Sterling'
    );
    insertEvidence.run(
      c2.lastInsertRowid,
      '2024 SaaS Market Growth Survey',
      'SaaS Growth Index 2024',
      'https://saasgrowthindex.org/2024/report',
      'Ranked #1 in growth percentage in the brand safety tooling category for CY 2024.',
      'Annual Market Report 2024, Section 4.2',
      '2024-01-10',
      '2024-12-31',
      'EXPIRED'
    );

    // Claim 3: Unbacked / Needs Verification Claim
    insertClaim.run(
      org1Id, ws1Id, 'CLM-103', 'Efficiency Claim',
      'Cuts brand review cycles by 80%', 'Productivity', 'needs_verification',
      'Sales Operations', null, null, null,
      'Sam Taylor', null
    );
  }

  // 7. Seed Initial Brand Assets
  const assetCount = db.prepare('SELECT COUNT(*) as count FROM brand_assets').get().count;
  if (assetCount === 0) {
    const insAsset = db.prepare(`
      INSERT INTO brand_assets (organization_id, workspace_id, asset_type, name, file_path, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insAsset.run(
      org1Id, ws1Id, 'logo', 'Primary Wordmark', '/assets/brandguard-wordmark.svg',
      JSON.stringify({ clear_space_min_px: 16, approved_colors: ['#27231e', '#f7f4ee'], min_height_px: 24 })
    );
    insAsset.run(
      org1Id, ws1Id, 'color_palette', 'Brand Primary & Accents', null,
      JSON.stringify({ primary: '#27231e', background: '#f7f4ee', lime_accent: '#c6f432', cyan_accent: '#22d3ee' })
    );
  }

  // 8. Seed Initial Content Draft
  const draftCount = db.prepare('SELECT COUNT(*) as count FROM content_drafts').get().count;
  let seededDraftId = 1;
  if (draftCount === 0) {
    const samplePost = `Meet Brandguard, the cheap way to protect your brand! Our tool offers 100% guaranteed error prevention and is the #1 fastest growing creative guardrail tool in the world. Cuts brand review cycles by 80%. Try it now!`;
    const draftRes = db.prepare(`
      INSERT INTO content_drafts (organization_id, workspace_id, title, content_type, content_text, channel, author_id, current_version, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'DRAFT')
    `).run(org1Id, ws1Id, 'Spring Launch Campaign Post', 'Social Media Post', samplePost, 'Instagram / LinkedIn', 'Sam Taylor');

    seededDraftId = draftRes.lastInsertRowid;
    db.prepare(`
      INSERT INTO content_revisions (draft_id, version_num, content_text, diff_summary, author_id)
      VALUES (?, 1, ?, 'Initial Draft', 'Sam Taylor')
    `).run(seededDraftId, samplePost);
  }

  // 9. Seed Guideline Health: Seed historical review findings so one rule is flagged on first load (Spec #2)
  // Flags "Needs clarification" on RULE-002 (≥ 5 firings and ≥ 40% dismissed, or ≥ 2 rule_unclear reasons)
  const findingsCount = db.prepare('SELECT COUNT(*) as count FROM review_findings').get().count;
  if (findingsCount === 0) {
    const insFinding = db.prepare(`
      INSERT INTO review_findings (
        review_id, draft_id, revision_id, category, severity, explanation,
        matched_text, start_offset, end_offset, rule_id, claim_id,
        evidence_reference, suggested_correction, verification_status, status,
        dismiss_reason, dismiss_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 day'))
    `);

    // 6 firings for RULE-002, 3 dismissed (2 rule_unclear, 1 ok_in_context) -> 50% dismissal rate & 2 rule_unclear -> FLAGGED
    insFinding.run(
      1, seededDraftId, 1, 'Brand Identity', 'MEDIUM',
      'Wordmark capitalization violation: "Brandguard"',
      'Brandguard', 5, 15, 'RULE-002', null,
      'Section 1.0 - Brand Identity', 'BrandGuard', 'HIGH',
      'rejected', 'rule_unclear', 'Rule does not clarify if social handles are exempt'
    );
    insFinding.run(
      1, seededDraftId, 1, 'Brand Identity', 'MEDIUM',
      'Wordmark capitalization violation: "Brandguard"',
      'Brandguard', 5, 15, 'RULE-002', null,
      'Section 1.0 - Brand Identity', 'BrandGuard', 'HIGH',
      'rejected', 'rule_unclear', 'Unclear whether lowercase is permissible in code/urls'
    );
    insFinding.run(
      1, seededDraftId, 1, 'Brand Identity', 'MEDIUM',
      'Wordmark capitalization violation: "Brandguard"',
      'Brandguard', 5, 15, 'RULE-002', null,
      'Section 1.0 - Brand Identity', 'BrandGuard', 'HIGH',
      'rejected', 'ok_in_context', 'Approved for casual meme format'
    );
    insFinding.run(
      1, seededDraftId, 1, 'Brand Identity', 'MEDIUM',
      'Wordmark capitalization violation: "Brandguard"',
      'Brandguard', 5, 15, 'RULE-002', null,
      'Section 1.0 - Brand Identity', 'BrandGuard', 'HIGH',
      'resolved', null, null
    );
    insFinding.run(
      1, seededDraftId, 1, 'Brand Identity', 'MEDIUM',
      'Wordmark capitalization violation: "Brandguard"',
      'Brandguard', 5, 15, 'RULE-002', null,
      'Section 1.0 - Brand Identity', 'BrandGuard', 'HIGH',
      'open', null, null
    );
    insFinding.run(
      1, seededDraftId, 1, 'Brand Identity', 'MEDIUM',
      'Wordmark capitalization violation: "Brandguard"',
      'Brandguard', 5, 15, 'RULE-002', null,
      'Section 1.0 - Brand Identity', 'BrandGuard', 'HIGH',
      'open', null, null
    );
  }
}

module.exports = { seedDatabase };
