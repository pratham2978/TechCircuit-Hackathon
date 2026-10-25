# BrandGuard by Inkloom AI — Hackathon Demonstration Script

This document provides a concise, step-by-step walkthrough for demonstrating BrandGuard during hackathon judging. All steps are backed by real, local, database-connected software with zero external AI inference dependencies.

---

## Pre-Demo Checklist

1. **Start the BrandGuard Server:**
   ```bash
   npm start
   ```
   Server will run at `http://localhost:3000`.

2. **Verify Local ML Model & Database:**
   - Health check: `http://localhost:3000/api/health`
   - Should report: `status: ok`, `local_ml_engine: { name: 'ToneClassifier_TFIDF_LogReg', accuracy: 0.8, status: 'active_local_inference' }`.

---

## 5-Minute Demonstration Walkthrough

### Step 1: Teammate Homepage Preservation (15 seconds)
1. Open `http://localhost:3000/` in the browser.
2. Show the judges the original teammate landing page:
   - Analog TV canvas static animation.
   - Mascot and interactive creative slider.
   - Preserved branding, typography (`Bricolage Grotesque`), and dark/light theme.
3. Click the **"BrandGuard Review"** button in the navbar or navigate to `http://localhost:3000/brandguard`.

---

### Step 2: Multi-Tenant Authentication & Role Switching (30 seconds)
1. In the top status bar, notice the live indicators:
   - `DB: SQLite Sync (Local Persistent)`
   - `Local ML: scikit-learn (TF-IDF + LogReg)`
   - `Org: Inkloom AI`
2. Point out the **Demo Quick Switcher**:
   - Click `Admin` -> Role badge updates to `ADMIN`.
   - Click `Brand Manager` -> Role badge updates to `BRAND-MANAGER`.
   - Click `Creator` -> Role badge updates to `CREATOR`.
   - Click `Reviewer` -> Role badge updates to `REVIEWER`.
   - Click `Nexus Corp` -> Demonstrates multi-tenant isolation (switches to a completely separate organization with isolated workspaces and zero data leakage).
3. Switch back to `Brand Manager`.

---

### Step 3: Guideline Ingestion & Constitution Compiler (60 seconds)
1. Navigate to the **"Workspaces & Guidelines"** tab.
2. Click **"Download Sample PDF"** (or use `public/sample-brand-guidelines.pdf`).
3. Under *Upload Brand Guideline Document*, choose the PDF file and click **"⚡ Ingest & Compile Rules"**.
4. Highlight the deterministic Constitution Compiler in action:
   - Scans text for modal obligation keywords (`must`, `must not`, `never`, `always`, `avoid`).
   - Categorizes candidate rules (e.g., Tone of Voice, Terminology, Approved Messaging).
   - Preserves exact source excerpt and page/section references.
5. Click **"Review Candidate Rules →"** to switch to the **"Rule Governance"** tab.
6. Notice extracted candidate rules start in `pending` status.
7. Click **"✅ Approve Rule"** on a candidate rule to make it authoritative policy.

---

### Step 4: Claim Ledger & Evidence Verification (45 seconds)
1. Navigate to the **"Claim Ledger"** tab.
2. Show the table of marketing claims:
   - Green `VERIFIED` claim: has attached evidence citation ("Q3 Customer Benchmark Study").
   - Yellow `NEEDS_VERIFICATION` claim: marketing assertion without substantiation.
   - Red `EXPIRED` claim: validity date in the past.
3. Click **"+ Add Marketing Claim"** to demonstrate adding a new claim with citation and validity expiration date.

---

### Step 5: Content Studio & Local ML Compliance Engine (90 seconds)
1. Switch role to **"Creator"** using the top quick switch bar.
2. Navigate to the **"Content Studio & Review"** tab.
3. Inspect the draft copy containing deliberate compliance issues:
   > *"BrandGuard by Inkloom AI is the best cheap solution that provides 100% guaranteed flawless compliance and cuts review turnaround by 80% without any setup."*
4. Click **"🛡️ Run Deep Compliance Review"**.
5. Observe the results generated 100% locally:
   - **Local ML Tone Analysis Badge**: Predicts copy tone (e.g. `Exaggerated` or `Informal`) with confidence score and version tag using genuine local scikit-learn model.
   - **High-Severity Finding**: Prohibited term `"cheap"` flagged with rule citation and suggested replacement `"cost-effective"`.
   - **High-Severity Finding**: Prohibited term `"100% guaranteed"` flagged with rule citation.
   - **Claim Substantiation Finding**: Unverified claim `"cuts review turnaround by 80%"` flagged with evidence requirement.
6. Click **"Accept Suggestion"** on the `"cheap"` finding:
   - The editor automatically replaces the term with `"cost-effective"`.
   - A side-by-side **Revision Diff** appears below showing deletions in red and insertions in green.
   - The draft revision increments to `v2`.
7. Click **"🚀 Submit for Reviewer Approval"**.

---

### Step 6: Reviewer Workflow & Manager Policy Exception (45 seconds)
1. Switch role to **"Reviewer"** (or **"Brand Manager"**).
2. Navigate to the **"Reviewer Queue"** tab.
3. Click **"Evaluate →"** on the submitted draft.
4. Review the copy and flagged issues.
5. Demonstrate the **Manager Policy Exception**:
   - Check *"Grant Brand Manager Policy Exception"*.
   - Enter rationale: *"Legal approved for limited Q4 pilot campaign #204"*.
   - Click **"✅ Approve for Publishing"**.
6. The submission is permanently marked `APPROVED` and logged to the audit trail.

---

### Step 7: Guideline Health Dashboard & WCAG Accessibility (30 seconds)
1. Navigate to the **"Health Dashboard"** tab:
   - Metrics updated automatically from real SQLite queries.
   - Approval ratio, verified claims count, and recent review history table reflect the live actions just performed.
2. Navigate to the **"Brand Passport & WCAG"** tab:
   - View the compiled brand summary.
   - Show the interactive **WCAG 2.1 Contrast Checker**: test `#c6f432` on `#27231e` (Passes AA & AAA with high contrast ratio).

---

### Step 8: Security & Governance Audit Trail (15 seconds)
1. Navigate to the **"Audit Trail"** tab.
2. Show the immutable log of events:
   - `RULE_APPROVED`
   - `CONTENT_SUBMITTED`
   - `WORKFLOW_DECISION` with manager exception rationale.
3. Conclude by emphasizing: **100% local, persistent, explainable, zero cloud API keys, and fully compliant.**
