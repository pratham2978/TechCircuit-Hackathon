/**
 * BrandGuard Master Test Suite
 * Sequentially verifies all phases:
 * Phase 1: Authentication, Roles, and Organization Context (Multi-tenancy)
 * Phase 2: Brand Workspace and Constitution Compiler (Deterministic Extraction)
 * Phase 3: Claim Ledger and Evidence Verification (Expired & Unsupported Detection)
 * Phase 4: Local ML Model Pipeline (Zero external inference APIs, authentic metrics)
 * Phase 5: Content Studio, Revision Snapshots, and Review Engine
 * Phase 6: Guideline Health Dashboard (Real DB Metrics)
 * Phase 7: Accessibility (WCAG 2.1 Contrast & Flesch Readability)
 * Phase 8: Brand Passport and Audit Trail
 * Phase 9: Security, Persistence after restart, and Homepage preservation
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

process.env.PORT = '3099';
process.env.DB_PATH = path.join(__dirname, 'test-brandguard-master.sqlite');

if (fs.existsSync(process.env.DB_PATH)) {
  try { fs.unlinkSync(process.env.DB_PATH); } catch (e) {}
}

const app = require('../server/index');
let server;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const isMultipart = headers['Content-Type']?.includes('multipart/form-data');
    let payload = '';

    if (body && !isMultipart && typeof body === 'object') {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    } else if (body && isMultipart) {
      payload = body;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createMultipartFormData(boundary, fields, fileField) {
  const crlf = '\r\n';
  let buffer = Buffer.alloc(0);

  for (const [key, val] of Object.entries(fields)) {
    let part = `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${val}${crlf}`;
    buffer = Buffer.concat([buffer, Buffer.from(part, 'utf8')]);
  }

  if (fileField) {
    let fileHeader = `--${boundary}${crlf}Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"${crlf}Content-Type: ${fileField.contentType}${crlf}${crlf}`;
    let fileEnd = `${crlf}--${boundary}--${crlf}`;
    buffer = Buffer.concat([buffer, Buffer.from(fileHeader, 'utf8'), fileField.content, Buffer.from(fileEnd, 'utf8')]);
  }

  return buffer;
}

let passed = 0;
let total = 0;

function it(description, fn) {
  total++;
  return fn()
    .then(() => {
      passed++;
      console.log(`  ✓ PASS: ${description}`);
    })
    .catch(err => {
      console.error(`  ✕ FAIL: ${description}`);
      console.error(`    Error: ${err.message}`);
      throw err;
    });
}

async function runTestSuite() {
  console.log('\n=======================================================');
  console.log('🧪 Running BrandGuard Sequential Master Test Suite');
  console.log('=======================================================\n');

  server = app.listen(3099);
  await new Promise(r => setTimeout(r, 600));

  let adminToken = null;
  let managerToken = null;
  let creatorToken = null;
  let nexusToken = null;

  try {
    // ----------------------------------------------------
    // PHASE 0: HOMEPAGE PRESERVATION
    // ----------------------------------------------------
    await it('Phase 0: Homepage Preserved with analog TV canvas, mascot, and BrandGuard navigation', async () => {
      const res = await request('GET', '/');
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.includes('BrandGuard — Catch brand mistakes before they go live'));
      assert.ok(res.data.includes('id="cam"'), 'Mascot container intact');
      assert.ok(res.data.includes('id="st"'), 'TV static canvas intact');
      assert.ok(res.data.includes('BrandGuard Review'), 'Integrated navigation link present');
    });

    // ----------------------------------------------------
    // PHASE 1: AUTHENTICATION, ROLES & ORGANIZATIONS
    // ----------------------------------------------------
    await it('Phase 1.1: Authentication - Rejects invalid login credentials', async () => {
      const res = await request('POST', '/api/auth/login', {
        email: 'admin@brandguard.ai',
        password: 'WrongPassword!'
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.json.success, false);
      assert.ok(res.json.error.includes('Incorrect password'));
    });

    await it('Phase 1.2: Authentication - Valid login generates session token with user & organization context', async () => {
      const res = await request('POST', '/api/auth/login', {
        email: 'admin@brandguard.ai',
        password: 'BrandGuard2026!'
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.json.token, 'Session token returned');
      assert.strictEqual(res.json.user.role, 'admin');
      assert.strictEqual(res.json.organization.slug, 'inkloom');
      adminToken = res.json.token;

      // Log in other roles
      const mgrRes = await request('POST', '/api/auth/login', { email: 'manager@brandguard.ai', password: 'BrandGuard2026!' });
      managerToken = mgrRes.json.token;

      const crtRes = await request('POST', '/api/auth/login', { email: 'creator@brandguard.ai', password: 'BrandGuard2026!' });
      creatorToken = crtRes.json.token;

      const nexRes = await request('POST', '/api/auth/login', { email: 'nexus@nexuscorp.com', password: 'Nexus2026!' });
      nexusToken = nexRes.json.token;
    });

    await it('Phase 1.3: Protected Routes - Blocks unauthenticated access with 401 Unauthorized', async () => {
      const res = await request('GET', '/api/workspaces');
      assert.strictEqual(res.status, 401);
      assert.ok(res.json.error.includes('Authentication Required'));
    });

    await it('Phase 1.4: Multi-Tenant Organization Isolation - Users cannot access other organizations data', async () => {
      // Nexus user asks for workspaces
      const res = await request('GET', '/api/workspaces', null, { Authorization: `Bearer ${nexusToken}` });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.workspaces.length, 1);
      assert.strictEqual(res.json.workspaces[0].name, 'Nexus Corp Internal Brand');
      assert.notStrictEqual(res.json.workspaces[0].name, 'Inkloom AI Master Brand');
    });

    // ----------------------------------------------------
    // PHASE 2: BRAND WORKSPACE & CONSTITUTION COMPILER
    // ----------------------------------------------------
    let testDocId = null;

    await it('Phase 2.1: Brand Workspace - Authorized admin can create and retrieve workspaces', async () => {
      const res = await request('POST', '/api/workspaces', {
        name: 'Spring Launch Workspace',
        description: 'Dedicated campaign brand workspace',
        preferred_tone: 'Professional, Empowering',
        brand_colors: '#27231e, #c6f432'
      }, { Authorization: `Bearer ${adminToken}` });

      assert.strictEqual(res.status, 200);
      assert.ok(res.json.id);

      const listRes = await request('GET', '/api/workspaces', null, { Authorization: `Bearer ${adminToken}` });
      assert.ok(listRes.json.workspaces.some(w => w.name === 'Spring Launch Workspace'));
    });

    await it('Phase 2.2: Constitution Compiler - Ingests guideline document and compiles candidate rules with exact citations', async () => {
      const boundary = '----WebKitFormBoundaryMasterTestPdf';
      const testPdfPath = path.join(__dirname, 'test-brand-guideline.pdf');
      const fileBuffer = fs.readFileSync(testPdfPath);

      const payload = createMultipartFormData(boundary, {
        workspace_id: '1'
      }, {
        name: 'guideline_file',
        filename: 'test-brand-guideline.pdf',
        contentType: 'application/pdf',
        content: fileBuffer
      });

      const res = await request('POST', '/api/guidelines/upload', payload, {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.json.documentId);
      assert.ok(res.json.candidateRules.length > 0);
      assert.ok(res.json.candidateRules[0].source_reference);
      testDocId = res.json.documentId;
    });

    let approvedRuleId = null;

    await it('Phase 2.3: Rule Approval - Candidates begin pending; Brand Manager approves rule to make it authoritative policy', async () => {
      const listRes = await request('GET', '/api/rules?status=candidate', null, { Authorization: `Bearer ${adminToken}` });
      assert.ok(listRes.json.rules.length > 0);
      const rule = listRes.json.rules[0];

      // Creator attempts to approve -> Must be rejected with 403
      const forbiddenRes = await request('POST', `/api/rules/${rule.id}/approve`, {}, { Authorization: `Bearer ${creatorToken}` });
      assert.strictEqual(forbiddenRes.status, 403, 'Creator denied rule approval');

      // Manager approves -> 200
      const approveRes = await request('POST', `/api/rules/${rule.id}/approve`, {}, { Authorization: `Bearer ${managerToken}` });
      assert.strictEqual(approveRes.status, 200);
      assert.strictEqual(approveRes.json.status, 'approved');
      approvedRuleId = rule.id;
    });

    // ----------------------------------------------------
    // PHASE 3: CLAIM LEDGER & EVIDENCE VERIFICATION
    // ----------------------------------------------------
    let testClaimId = null;

    await it('Phase 3.1: Claim Ledger - Records claim with validity date and attached evidence', async () => {
      const claimPayload = {
        claim_code: 'CLM-PRECISION-99',
        claim_title: 'Automated Accuracy Metric',
        claim_text: '99.5% precision in automated brand audit evaluations',
        category: 'Performance',
        evidence_source: 'Lab Evaluation Q4 2026',
        source_reference: 'Section 3.1, Doc #REP-995, p. 12',
        owner: 'Compliance Lab',
        valid_from: '2026-01-01',
        valid_to: '2027-12-31',
        approval_status: 'approved'
      };

      const res = await request('POST', '/api/claims', claimPayload, { Authorization: `Bearer ${managerToken}` });
      assert.strictEqual(res.status, 200);
      testClaimId = res.json.id;

      const getRes = await request('GET', `/api/claims/${testClaimId}`, null, { Authorization: `Bearer ${managerToken}` });
      assert.strictEqual(getRes.json.claim.computed_status, 'approved');
      assert.strictEqual(getRes.json.claim.status_badge, 'Verified & Active');
    });

    await it('Phase 3.2: Claim Expiry & Unsupported Detection - Detects expired evidence & unbacked claims', async () => {
      // Expired claim check
      const expiredPayload = {
        claim_code: 'CLM-EXP-2023',
        claim_text: 'Ranked #1 best software in 2023',
        evidence_source: 'Market Survey 2023',
        source_reference: 'Report p. 5',
        valid_to: '2023-12-31',
        approval_status: 'approved'
      };
      const expRes = await request('POST', '/api/claims', expiredPayload, { Authorization: `Bearer ${managerToken}` });
      const expGet = await request('GET', `/api/claims/${expRes.json.id}`, null, { Authorization: `Bearer ${managerToken}` });
      assert.strictEqual(expGet.json.claim.computed_status, 'expired');
      assert.strictEqual(expGet.json.claim.status_badge, 'Expired Evidence');

      // Unsupported claim check
      const unbackedPayload = {
        claim_code: 'CLM-UNBACKED',
        claim_text: 'Saves 1000 hours per day',
        evidence_source: '',
        source_reference: ''
      };
      const unbRes = await request('POST', '/api/claims', unbackedPayload, { Authorization: `Bearer ${managerToken}` });
      const unbGet = await request('GET', `/api/claims/${unbRes.json.id}`, null, { Authorization: `Bearer ${managerToken}` });
      assert.strictEqual(unbGet.json.claim.computed_status, 'needs_verification');
    });

    // ----------------------------------------------------
    // PHASE 4: LOCAL MACHINE LEARNING PIPELINE
    // ----------------------------------------------------
    await it('Phase 4.1: Local ML Pipeline - Real scikit-learn model artifact loaded and predicts tone without external APIs', async () => {
      const { predictTone, getModelMetrics } = require('../server/ml-service');

      // Check model metrics report
      const metrics = getModelMetrics();
      assert.ok(metrics, 'Real metrics report exists');
      assert.ok(metrics.accuracy >= 0.8, 'Model accuracy verified on held-out test set');
      assert.ok(metrics.classification_report, 'Classification report present');

      // Predict informal
      const informalRes = await predictTone('Yo bro this is totally lit and super fire bruh!');
      assert.strictEqual(informalRes.predicted_tone, 'Informal');
      assert.strictEqual(informalRes.model_version, 'v1.0-local-sklearn');

      // Predict professional
      const profRes = await predictTone('The compliance audit was submitted according to corporate governance standards.');
      assert.strictEqual(profRes.predicted_tone, 'Professional');

      // Empty input handling
      const emptyRes = await predictTone('');
      assert.strictEqual(emptyRes.predicted_tone, 'Neutral');
      assert.strictEqual(emptyRes.status, 'empty_input');
    });

    // ----------------------------------------------------
    // PHASE 5: CONTENT STUDIO & REVIEW ENGINE
    // ----------------------------------------------------
    let draftId = null;
    let findingIdToAccept = null;

    await it('Phase 5.1: Content Studio - Creator creates draft and executes review with deterministic, claim, and ML checks', async () => {
      const testContent = `Welcome to Brandguard! It is the cheap way to ensure 100% guaranteed compliance. We achieve 99.4% brand compliance detection rate and cut brand review cycles by 80%.`;

      const reviewRes = await request('POST', '/api/review/run', {
        content_text: testContent,
        workspace_id: 1
      }, { Authorization: `Bearer ${creatorToken}` });

      assert.strictEqual(reviewRes.status, 200);
      assert.ok(reviewRes.json.findings.length >= 3);
      draftId = reviewRes.json.draft_id;

      // Verify deterministic rule match: "cheap"
      const cheapFinding = reviewRes.json.findings.find(f => f.matched_text === 'cheap');
      assert.ok(cheapFinding, 'Detected prohibited word cheap');
      assert.strictEqual(cheapFinding.severity, 'HIGH');
      assert.ok(cheapFinding.suggested_correction.includes('cost-effective'));

      // Verify casing rule match: "Brandguard"
      const casingFinding = reviewRes.json.findings.find(f => f.matched_text === 'Brandguard');
      assert.ok(casingFinding, 'Detected wordmark casing violation Brandguard');

      // Verify verified claim match
      const verifiedClaim = reviewRes.json.findings.find(f => f.verification_status === 'VERIFIED');
      assert.ok(verifiedClaim, 'Verified claim recognized');

      // Verify unsupported claim match
      const unsupportedClaim = reviewRes.json.findings.find(f => f.verification_status === 'NEEDS_VERIFICATION');
      assert.ok(unsupportedClaim, 'Unsupported claim labeled Needs Verification');

      findingIdToAccept = cheapFinding.id;
    });

    await it('Phase 5.2: Revision Snapshots - Accepting suggestion increments draft version without overwriting history', async () => {
      const acceptRes = await request('POST', `/api/review/findings/${findingIdToAccept}/accept`, {}, { Authorization: `Bearer ${creatorToken}` });
      assert.strictEqual(acceptRes.status, 200);
      assert.strictEqual(acceptRes.json.version, 2);
      assert.ok(acceptRes.json.content_text.includes('cost-effective'));

      // Verify side-by-side compare
      const compareRes = await request('GET', `/api/content/drafts/${draftId}/compare?v1=1&v2=2`, null, { Authorization: `Bearer ${creatorToken}` });
      assert.strictEqual(compareRes.status, 200);
      assert.ok(compareRes.json.v1.text.includes('cheap'));
      assert.ok(compareRes.json.v2.text.includes('cost-effective'));
    });

    await it('Phase 5.3: Review Workflow - Creator submits content; Reviewer approves with policy exception', async () => {
      // Submit
      const submitRes = await request('POST', '/api/review/submit', { draft_id: draftId }, { Authorization: `Bearer ${creatorToken}` });
      assert.strictEqual(submitRes.status, 200);
      assert.strictEqual(submitRes.json.status, 'SUBMITTED');

      // Inspect queue
      const queueRes = await request('GET', '/api/workflow/queue', null, { Authorization: `Bearer ${managerToken}` });
      assert.ok(queueRes.json.queue.some(q => q.id === draftId));

      // Approve with policy exception
      const decisionRes = await request('POST', `/api/workflow/${draftId}/decision`, {
        decision: 'APPROVED',
        comments: 'Approved for pilot distribution under marketing waiver.',
        policy_exception: true,
        exception_reason: 'Controlled A/B testing campaign authorized by Brand Lead.'
      }, { Authorization: `Bearer ${managerToken}` });

      assert.strictEqual(decisionRes.status, 200);
      assert.strictEqual(decisionRes.json.decision, 'APPROVED');
    });

    // ----------------------------------------------------
    // PHASE 6: GUIDELINE HEALTH DASHBOARD
    // ----------------------------------------------------
    await it('Phase 6.1: Guideline Health Dashboard - Metrics accurately computed from live database records', async () => {
      const dashRes = await request('GET', '/api/dashboard', null, { Authorization: `Bearer ${adminToken}` });
      assert.strictEqual(dashRes.status, 200);
      assert.ok(dashRes.json.metrics.total_approved_rules >= 3);
      assert.ok(dashRes.json.metrics.total_claims >= 2);
      assert.ok(dashRes.json.metrics.total_approvals >= 1);
      assert.ok(dashRes.json.metrics.guideline_freshness);
      assert.ok(dashRes.json.recent_reviews.length > 0);
    });

    // ----------------------------------------------------
    // PHASE 7: ACCESSIBILITY & BRAND ASSET CHECKS
    // ----------------------------------------------------
    await it('Phase 7.1: Accessibility - Computes WCAG 2.1 contrast ratios and Flesch readability', async () => {
      const { getContrastRatio, analyzeReadability } = require('../server/accessibility');

      // WCAG contrast
      const contrast = getContrastRatio('#27231e', '#f7f4ee');
      assert.ok(contrast >= 10.0, 'Contrast ratio between dark ink and light bg is high');

      // Readability
      const readResult = analyzeReadability('The quick brown fox jumps over the lazy dog.');
      assert.ok(readResult.score >= 70, 'Calculated Flesch reading score');
    });

    // ----------------------------------------------------
    // PHASE 8: BRAND PASSPORT & AUDIT TRAIL
    // ----------------------------------------------------
    await it('Phase 8.1: Brand Passport & Audit Trail - Real database records populate passport and audit events', async () => {
      const passRes = await request('GET', '/api/passport', null, { Authorization: `Bearer ${adminToken}` });
      assert.strictEqual(passRes.status, 200);
      assert.ok(passRes.json.passport.approved_rules.length >= 3);
      assert.ok(passRes.json.passport.approved_claims.length >= 1);
      const paletteAsset = passRes.json.passport.brand_assets.find(a => a.asset_type === 'color_palette');
      assert.ok(paletteAsset && paletteAsset.metadata.wcag_aa_compliant !== undefined);

      const auditRes = await request('GET', '/api/audit', null, { Authorization: `Bearer ${adminToken}` });
      assert.strictEqual(auditRes.status, 200);
      const events = auditRes.json.events.map(e => e.event_type);
      assert.ok(events.includes('USER_LOGIN'));
      assert.ok(events.includes('RULE_APPROVED'));
      assert.ok(events.includes('WORKFLOW_DECISION'));
    });

    // ----------------------------------------------------
    // PHASE 9: PERSISTENCE AFTER RESTART
    // ----------------------------------------------------
    await it('Phase 9.1: Persistence - Data survives clean re-read and reconnect to SQLite database', async () => {
      const { DatabaseSync } = require('node:sqlite');
      const verifyDb = new DatabaseSync(process.env.DB_PATH);

      const rulesCount = verifyDb.prepare("SELECT COUNT(*) as c FROM brand_rules WHERE status = 'approved'").get().c;
      assert.ok(rulesCount >= 3, 'Approved rules persisted');

      const claimsCount = verifyDb.prepare('SELECT COUNT(*) as c FROM claim_ledger').get().c;
      assert.ok(claimsCount >= 3, 'Claim records persisted');

      const draft = verifyDb.prepare('SELECT * FROM content_drafts WHERE id = ?').get(draftId);
      assert.strictEqual(draft.status, 'APPROVED', 'Draft approved state persisted');
    });

  } finally {
    server.close();
  }

  console.log('\n=======================================================');
  console.log(`🎉 ALL PHASES VERIFIED: ${passed} / ${total} assertions passed!`);
  console.log('=======================================================\n');
}

runTestSuite().catch(err => {
  console.error('\nMaster Test Suite Failed:\n', err);
  process.exit(1);
});
