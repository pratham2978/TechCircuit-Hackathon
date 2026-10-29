# BrandGuard by Inkloom AI

> **Complete Brand-Governance & Compliance Platform for Enterprise Organizations**
> Built with 100% local deterministic algorithms, local machine learning, persistent SQLite database, and multi-tenant isolation. Zero external AI APIs or cloud keys required.

---

## ⚖️ Legal & Compliance Disclaimer

> **Important:** BrandGuard is an automated brand governance, editorial guidelines, and compliance review tool. **BrandGuard does not provide legal advice.** All corporate communications, promotional offers, and marketing claims remain subject to human review and legal sign-off by qualified counsel before public release.

---

## 🌟 Core Features & System Architecture

1. **Teammate Homepage Preservation**: The original landing page (`public/index.html`) is preserved intact with custom CRT analog TV canvas animations, mascot, and dark/light modes.
2. **Multi-Tenant Authentication & RBAC**: Real bcrypt password hashing, session tokens, and strict organization data isolation across four roles:
   - **Admin**: Organization administration and user management.
   - **Brand Manager**: Workspaces, guideline ingestion, rule approval, and claim ledger management.
   - **Creator**: Multi-channel content drafting, revision history, and compliance checks.
   - **Reviewer**: Findings inspection, editorial guidance, and approval with Manager Policy Exceptions.
3. **Constitution Compiler**: Deterministic ingestion of PDF & DOCX guideline documents, extracting candidate rules with exact source citations and modal obligation patterns (`must`, `never`, `avoid`).
4. **Claim Ledger & Evidence**: Authoritative repository for marketing claims with expiration dates, substantiation citations, and unbacked claim alerts.
5. **Local Machine Learning**: Scikit-learn TF-IDF + Logistic Regression tone classifier trained on enterprise copy styles (`Professional`, `Informal`, `Exaggerated`, `Urgent`, `Empowering`) with 100.0% accuracy on the 10-sample stratified held-out test set (2 samples per class — see `ml/reports/evaluation_metrics.json`).
6. **Content Studio & Review Engine**: Real-time compliance scans, side-by-side diff previews, suggested replacements, and versioned revisions.
7. **Guideline Health Dashboard**: Live analytics computed directly from SQLite records.
8. **Brand Passport & WCAG 2.1 Accessibility**: Compiled brand identity summary and interactive relative luminance contrast ratio calculator.
9. **Tamper-Evident Audit Trail**: Immutable logging of all governance actions.

---

## 🎯 Round 3 Committed Improvements

| # | Improvement | Status | Description |
|---|---|---|---|
| **#1** | **Evidence-Linked Claim Verification with Expiry** | ✅ Built & Tested | Real-time evaluation of marketing claims: `EXPIRED`, `EXPIRING_SOON` (within 30 days), `VERIFIED`, and `NEEDS_VERIFICATION`. Surfaced in findings with structured evidence cards (Claim ID, source study, page ref, owner, valid-to date). |
| **#2** | **Guideline Health Driven by Reviewer Overrides** | ✅ Built & Tested | Reviewers must provide documented dismissal reasons (`false_positive`, `rule_unclear`, `approved_exception`, `ok_in_context`). Health analytics track firings, dismissals, and confusion rates, automatically flagging rules needing clarification (≥5 firings & ≥40% dismissed, or ≥2 `rule_unclear` flags) with direct editor links. |
| **#3** | **Explainable Image & Accessibility Checks** | ✅ Built & Tested | Upload PNG, JPG, or WebP creatives (up to 5 MB); resizes to 64×64, clusters pixels into top 5 dominant colors, and computes CIELAB color distance from brand palette tokens. Enforces WCAG 2.1 Guideline 1.1.1 (mandatory alt text) and Guideline 1.4.3 (4.5:1 text contrast). |

---

## 🛠️ Reliability & Robustness Fixes (Round 3)

1. **Span-Accurate Replacement**: Accepting findings applies corrections at exact text offsets (`start_offset`/`end_offset`) on the live draft, preventing multi-replacement collisions.
2. **409 Conflict Prevention**: Duplicate clicks on already resolved findings or workflow decisions safely return `409 Conflict` without corrupting version counters.
3. **Graceful ML Degradation**: If Python is absent, the system flags `status: 'unavailable'` and displays a clear warning pill while deterministic rules and claim checks complete smoothly.
4. **Wider Claim Detection Regex**: Pattern coverage includes numeric multipliers (`N×`/`Nx`), ordinal ranks (`#1`–`#5`), superlatives (`best`, `fastest`, `only...that`), and absolute claims (`flawless`, `seamless`, `zero`).
5. **Harmonized Accuracy Reporting**: Reports true performance metrics on held-out test sets with transparent small-dataset caveats.
6. **Relative GitHub Documentation**: Fully portable Markdown paths avoiding absolute filesystem dependencies.
7. **Idempotent Bootstrapping**: SQLite auto-seeds default workspaces, rules, claims, and test users on every server boot.
8. **Sanitized Error Handling**: Express global error handler classifies responses (400/401/403/404/409/500) and hides internal stack traces from production responses.

---

## 🗺️ Product Roadmap

> *Note on Round 3 Scope: Per competition guidelines ("You are not starting anything new and you are not changing direction — you are finishing what you already submitted"), the core build finishes the Node.js + Express + SQLite stack. The architectures below represent the vetted technical designs for subsequent versions.*

### Phase 2: Grounded LLM Review (Designed, Not Built)
*Designed architecture to add generative synthesis while preserving deterministic fact-checking:*
- **Deterministic Core Preserved**: Code still decides facts, date expirations, and regulatory rules; the local LLM only reads retrieved records, explains nuances, and drafts minimal intent-preserving rewrites.
- **Hybrid Retrieval**: Vector similarity + BM25 keyword matching across approved rules and claims, filtered per tenant organization (top 3–5 records).
- **Constrained JSON Generation**: Model returns structured JSON (`supports` / `contradicts` / `unrelated`, explanation, cited IDs). Any cited ID not in the retrieved context set is discarded.
- **Untrusted Input Protection**: Content is isolated as untrusted data to defend against prompt injection; all AI inference is logged in the Brand Passport and tamper-evident audit trail.
- **Versioned Cache**: Keyed on content hash + knowledge-base version so updated claims never serve stale evaluation results.
- **Evaluation Benchmark**: 40–60 labeled enterprise sentences measuring retrieval hit rate at Top 3, judgment accuracy, and false-positive rates.

### Phase 3: B2B Enterprise Platform
- **Self-Service Onboarding**: Illustrative plans and assisted corporate workspace creation.
- **Tiered Change Control**: Minor copy edits handled by client managers; major guideline amendments routed through an auditable Change Request queue.
- **Compliance Rule Packs**: Pre-configured regulatory packages (FTC advertising disclosures, FINRA compliance, GDPR privacy notices) with client legal sign-off.
- **Enterprise Storage & Stack**: Migration path to Postgres + pgvector, S3-compatible object storage with antivirus scanning, SAML/SSO authentication, and centralized billing.

### Future Horizons
- **Native CMS & Workspace Plugins**: Direct publishing integrations after final approval; plugins for Google Docs, Slack, and Figma.
- **Multilingual Brand Governance**: Multi-language guideline parsing and localized claim substantiation.
- **Fine-Tuned Client Tone Models**: Domain-specific classification models trained exclusively on a client's historical approved copy.

---

## 🔒 Security & Data Isolation Architecture

- **Multi-Tenant Isolation**: Every SQL query is parameterized and strictly scoped by `organization_id`. Tenant cross-talk is prevented at the database and middleware layers.
- **Role-Based Access Control (RBAC)**: Enforced via cryptographic session tokens. Non-privileged roles (e.g. Creators) cannot approve rules or grant policy exceptions.
- **Audit Logging**: Every action (logins, rule creations, candidate approvals, finding dismissals, workflow decisions) is recorded in the `audit_events` ledger.
- **Local-Only Processing**: No document content, draft copy, or creative images are transmitted to external servers or third-party cloud APIs.

---

## ⚡ Hosting & Free-Tier Cold Starts

> **Render / Free-Tier Note:** On free cloud hosting tiers, applications spin down after periods of inactivity. A cold start may take **~30–40 seconds** on the very first HTTP request while the container initializes. Once awake, response times are immediate. SQLite database records auto-seed on every boot.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Local Python Environment (For ML & Palette Checks)
```bash
pip install -r requirements.txt
```

### 3. Start Application
```bash
npm start
```
The server will start on **`http://localhost:3000`**.

- **Landing Page**: `http://localhost:3000/`
- **BrandGuard Workspace**: `http://localhost:3000/brandguard`
- **System Health**: `http://localhost:3000/api/health`

---

## 🧪 Automated Test Suite

Run the full end-to-end sequential test suite covering Phases 0 through 9:
```bash
npm test
```
*Executes all 20 automated integration tests including multi-tenancy, PDF compilation, claim expiration, local ML inference, workflow approvals, finding rejection validation with reasons, 409 conflict checks, 64×64 image palette Lab distance verification, WCAG accessibility checks, and SQLite persistence.*

---

## 👥 Pre-Seeded Demo Credentials

All seeded accounts use password: **`BrandGuard2026!`**

| Organization | Role | Email |
| :--- | :--- | :--- |
| **Inkloom AI** | Admin | `admin@inkloom.ai` |
| **Inkloom AI** | Brand Manager | `manager@inkloom.ai` |
| **Inkloom AI** | Creator | `creator@inkloom.ai` |
| **Inkloom AI** | Reviewer | `reviewer@inkloom.ai` |
| **Nexus Corp** *(Isolated Tenant)* | Admin | `admin@nexuscorp.com` |

*(Use the top demo bar in the BrandGuard UI to switch personas with one click).*

---

## 📚 Documentation

- [PROGRESS.md](PROGRESS.md) — Implementation progress and phase-by-phase test log.
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — Step-by-step 5-minute hackathon demonstration script.
- [DISCLOSURE.md](DISCLOSURE.md) — Technical, ethical, and local ML evaluation disclosures.