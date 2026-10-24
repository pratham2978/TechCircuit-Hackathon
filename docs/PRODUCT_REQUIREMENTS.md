# BrandProof — Product Requirements Document (PRD)

**Document Version:** 1.0.0-PLANNING  
**Lifecycle Status:** Phase 0 — Baseline Architecture  
**Target Delivery Window:** Hackathon Iteration (Round 1 Planning -> Round 2 Build -> Round 3 Finish)

---

## 1. System Overview & Problem Definition

Modern enterprises suffer from **Brand Entropy**: distributed teams, external copywriters, and generative AI tools create content faster than compliance and brand integrity teams can govern it. This leads to:
1. **Financial & Legal Liability:** Exaggerated promotional claims, missing statutory disclosures, or unverified performance statistics violate advertising standards (e.g., FTC guidelines).
2. **Erosion of Customer Trust:** Contradictions between sales copy and technical specifications undermine credibility.
3. **Identity Fragmentation:** Sub-optimal terminology, deprecated logos, off-brand tone, and unvetted visual assets diminish market equity.

**BrandProof** is an evidence-first brand-governance system that intercepts pre-publication content, verifies claims against an authoritative Knowledge Base, enforces compiled brand policies, and orchestrates human-in-the-loop review.

---

## 2. User Personas & Stakeholders

| Persona | Role | Primary Goals | Pain Points |
| :--- | :--- | :--- | :--- |
| **P1: Content Creator (Alex)** | Copywriter / Marketing Specialist | Quick feedback on drafts; guidance on correct tone and terminology; avoiding post-submission rejection. | Confusing brand guidelines; lack of visibility into authoritative product facts; arbitrary feedback. |
| **P2: Brand Reviewer (Jordan)** | Senior Brand Manager / Editor | Verify draft alignment with brand tone, approved messaging, and visual guidelines; propose clear edits. | Overwhelmed by high volume; tedious manual line-by-line verification; repetitive terminology errors. |
| **P3: Compliance Officer (Taylor)** | Legal / Regulatory Reviewer | Ensure every factual, numerical, and promotional claim is provably backed by approved source documentation. | Catching ungrounded claims; auditing historical approvals; lack of paper trail for regulatory defense. |
| **P4: Organization Admin (Morgan)** | VP Marketing / Head of Ops | Maintain the single source of truth (facts, policies, assets); monitor company-wide brand compliance trends. | Outdated PDFs sitting on shared drives; policy ambiguity; unable to identify systemic training gaps. |

---

## 3. Requirement Priority Classification

- **P0 (Critical / MVP):** Must be fully functional to achieve an end-to-end trustworthy review and approval workflow. Essential for hackathon demonstration.
- **P1 (High Priority / Differentiator):** Core competitive differentiator (e.g., Evidence Ledger, Policy Compiler, Risk Router). Delivered within build window.
- **P2 (Medium Priority / Post-MVP):** High-value capabilities (e.g., image OCR / visual asset check, advanced analytics) scheduled for Round 3 polish.
- **P3 (Future Release):** Enterprise scale items (e.g., CMS live webhooks, SSO/SAML, multi-region compliance) deferred beyond the hackathon.

---

## 4. Comprehensive Requirements Matrix

### 4.1 Organization, Multitenancy & Access Control (ORG)

#### REQ-ORG-01: Multi-Tenant Organization Isolation
- **Description:** Complete logical data isolation per organization. Every query, index lookup, and vector retrieval must be explicitly scoped by `organization_id`.
- **Stakeholder:** Morgan (Admin), Taylor (Compliance)
- **Business Justification:** Prevents cross-company data leakage of confidential product specs and brand manuals.
- **Priority:** P0 (MVP)
- **Dependencies:** Database Schema
- **Proposed Implementation:** Global SQLAlchemy session filter and tenant scoping middleware enforcing `organization_id` on all model operations.
- **Acceptance Criteria:** A user in Org A cannot view, query, or infer policies, documents, submissions, or findings from Org B (HTTP 403 / 404).
- **Testing Approach:** Integration test simulating simultaneous requests from Org A and Org B attempting cross-tenant reads and updates.
- **Security Implications:** Critical OWASP prevention against Broken Object Level Authorization (BOLA).

#### REQ-ORG-02: Role-Based Access Control (RBAC)
- **Description:** Implement four explicit organizational roles: `ADMIN`, `COMPLIANCE_REVIEWER`, `BRAND_REVIEWER`, and `CREATOR`.
- **Stakeholder:** All
- **Business Justification:** Separation of duties; prevents content authors from self-certifying compliance.
- **Priority:** P0 (MVP)
- **Dependencies:** User Authentication & JWT claims
- **Proposed Implementation:** FastAPI dependency injection `require_role(["ADMIN", ...])` validating token permissions.
- **Acceptance Criteria:** `CREATOR` can submit drafts and view own reviews; only `REVIEWER`/`ADMIN` can approve, reject, or edit active policies.
- **Testing Approach:** Role-permission matrix test checking 100% of API endpoints against unauthorized tokens.
- **Security Implications:** Prevents privilege escalation.

---

### 4.2 Brand Knowledge Base & Policy Management (KNOW)

#### REQ-KNOW-01: Approved Fact Registry
- **Description:** Authoritative CRUD registry of approved facts (numerical metrics, dates, certifications, pricing, and product specifications) linked to primary source provenance.
- **Stakeholder:** Morgan (Admin), Taylor (Compliance)
- **Business Justification:** Eliminates hallucinated facts; provides deterministic ground truth for the Evidence Ledger.
- **Priority:** P0 (MVP)
- **Dependencies:** REQ-ORG-01
- **Proposed Implementation:** Relational model with fields `claim_statement`, `numerical_value`, `unit`, `effective_date`, `expiration_date`, `source_doc_ref`, `status`.
- **Acceptance Criteria:** Every fact has a status (`DRAFT`, `ACTIVE`, `DEPRECATED`) and requires explicit approval before being used in verification.
- **Testing Approach:** Seed test facts; verify that inactive/deprecated facts are flagged as outdated during claim verification.
- **Security Implications:** Tamper-proofing; fact changes create auditable log entries.

#### REQ-KNOW-02: Brand Policy Compiler (Signature Improvement B)
- **Description:** Ingest natural-language brand manuals (PDF/Markdown/Text), extract candidate rules, classify into Deterministic (Lexical/Regex) vs. Contextual (LLM-evaluated), and version upon human sign-off.
- **Stakeholder:** Jordan (Brand Reviewer), Morgan (Admin)
- **Business Justification:** Solves the "50-page dead brand PDF" problem by transforming prose into executable governance logic.
- **Priority:** P1 (Build Phase - Improvement B)
- **Dependencies:** REQ-KNOW-01, Document Parsing Service
- **Proposed Implementation:** Two-pass parsing: structural rule extraction -> candidate rule schema generation -> Admin approval -> Versioned Policy DB.
- **Acceptance Criteria:** 
  1. Compiled policy contains exact source quote.
  2. Rule is categorized as `MANDATORY` or `ADVISORY`.
  3. No compiled policy becomes active without explicit Admin review and approval.
- **Testing Approach:** Ingest sample brand guideline; verify extracted rules match expected schema; test rule update bumps version number without breaking historical review associations.
- **Security Implications:** Prompt injection defense against malicious instructions inside uploaded brand PDFs.

#### REQ-KNOW-03: Terminology & Voice Dictionary
- **Description:** Structured registry of approved, discouraged, and prohibited terms, with mandatory alternatives, context notes, and tone parameters.
- **Stakeholder:** Jordan (Brand Reviewer)
- **Business Justification:** Fast, deterministic enforcement of brand naming conventions, capitalization, and tone adjectives.
- **Priority:** P0 (MVP)
- **Dependencies:** REQ-ORG-01
- **Proposed Implementation:** High-performance trie / regex matching combined with semantic embedding for synonymous context matching.
- **Acceptance Criteria:** Content containing prohibited terms is immediately flagged with 100% recall and suggested replacements.
- **Testing Approach:** Unit tests validating forbidden keyword detection, case sensitivity handling, and morphological variations.
- **Security Implications:** Minimal.

---

### 4.3 Content Ingestion & Multi-Format Parsing (INGEST)

#### REQ-INGEST-01: Multi-Format Document Ingestion
- **Description:** Ingest text, Markdown, PDF, and DOCX content for governance review.
- **Stakeholder:** Alex (Creator)
- **Business Justification:** Creators work in Word, Google Docs, CMS markdowns, and marketing briefs.
- **Priority:** P0 (MVP for Text, Markdown, PDF; P1 for DOCX)
- **Dependencies:** File Upload Service
- **Proposed Implementation:** PyMuPDF (`fitz`) for PDF extraction with layout bounding boxes; `python-docx` for document structure; standard UTF-8 stream parser for Markdown.
- **Acceptance Criteria:** File text is parsed cleanly with character offsets preserved for UI highlighting. Unsafe files are rejected before processing.
- **Testing Approach:** Test parser against corrupted PDFs, non-UTF8 text, nested tables, and standard copy.
- **Security Implications:** File bomb / ReDoS / malicious PDF payload defense; strict 10MB file size limit.

---

### 4.4 Automated Content Review & Evidence Ledger (REV)

#### REQ-REV-01: Atomic Claim Extraction & Classification
- **Description:** Automatically identify and extract discrete factual, promotional, comparative, and statistical claims from submitted content.
- **Stakeholder:** Taylor (Compliance), Alex (Creator)
- **Business Justification:** Dissects complex marketing copy into testable units, isolating subjective flair from auditable statements.
- **Priority:** P0 (MVP - Improvement A)
- **Dependencies:** REQ-INGEST-01
- **Proposed Implementation:** Structured LLM extraction using strict JSON schema with few-shot guidance; outputs list of `{claim_id, text, char_start, char_end, claim_type}`.
- **Acceptance Criteria:** Returns exact character offsets; does not omit numerical or superlatives claims.
- **Testing Approach:** Benchmark dataset evaluation measuring precision and recall on 20 standard marketing claims.
- **Security Implications:** Guardrails against prompt injection in submitted text attempting to bypass extraction.

#### REQ-REV-02: Evidence Ledger Verification Engine (Signature Improvement A)
- **Description:** Compare each extracted claim against the Approved Fact Registry and Knowledge Base. Classify into: `VERIFIED_SUPPORT`, `FACTUAL_CONTRADICTION`, `UNSUPPORTED_CLAIM`, `AMBIGUOUS_EVIDENCE`, `OUTDATED_FACT`, or `ADVISORY`.
- **Stakeholder:** Taylor (Compliance), Jordan (Brand Reviewer)
- **Business Justification:** Core competitive value. Replaces ungrounded LLM assertions with provable evidence trails.
- **Priority:** P0 (MVP - Improvement A)
- **Dependencies:** REQ-REV-01, REQ-KNOW-01
- **Proposed Implementation:** 
  1. Hybrid retrieval (BM25 keyword search + Dense Cosine vector retrieval) to pull top-K evidence chunks.
  2. NLI (Natural Language Inference) / structured verification comparing claim vs evidence.
  3. Strict evidence rules: if similarity < threshold, status = `UNSUPPORTED_CLAIM` (never hallucinate verification).
- **Acceptance Criteria:** 
  - Every finding has a citation snippet and source doc link.
  - Absence of evidence yields `UNSUPPORTED_CLAIM`, never marked as verified.
  - Direct contradiction triggers `HIGH` severity.
- **Testing Approach:** Automated evaluation against 30 ground-truth test cases (supported, contradicted, unsupported, outdated).
- **Security Implications:** Zero-data retention to external model providers where applicable; strict sanitization of retrieved snippets.

#### REQ-REV-03: Intent-Preserving Suggested Corrections
- **Description:** For every detected issue, generate a proposed rewrite that corrects the violation while strictly preserving the creator's persuasive intent without introducing new unverified claims.
- **Stakeholder:** Alex (Creator), Jordan (Reviewer)
- **Business Justification:** Accelerates turnaround time; copywriters can accept verified fixes with 1 click.
- **Priority:** P1 (Build Phase)
- **Dependencies:** REQ-REV-02
- **Proposed Implementation:** Structured correction generator that re-verifies its own output through the Evidence Ledger before presenting to the user.
- **Acceptance Criteria:** Proposed rewrite contains no new unsupported numerical or superlative claims. User can accept, reject, or edit the suggestion.
- **Testing Approach:** Regression test verifying that generated suggestions pass the Evidence Ledger with zero new flags.
- **Security Implications:** Model safety; prevents adversarial prompt injection in draft text from forcing offensive suggested rewrites.

---

### 4.5 Risk-Based Review & Workflow Orchestration (WORKFLOW)

#### REQ-WORK-01: Risk-Based Routing Engine (Signature Improvement C)
- **Description:** Compute a deterministic risk score (0-100) and risk tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) based on objective finding categories (e.g., Factual Contradiction = 35pts, Unsupported Claim = 25pts, Tone Mismatch = 5pts).
- **Stakeholder:** Taylor (Compliance), Jordan (Reviewer), Alex (Creator)
- **Business Justification:** Eliminates review bottlenecks by fast-tracking low-risk content while mandating multi-stakeholder approval for high-risk collateral.
- **Priority:** P1 (Build Phase - Improvement C)
- **Dependencies:** REQ-REV-02
- **Proposed Implementation:** Deterministic scoring algorithm with transparent factor breakdown (visible in UI).
- **Acceptance Criteria:** 
  - Submissions with Critical/High risk cannot be published without Compliance Reviewer sign-off.
  - Creators cannot self-approve.
- **Testing Approach:** Unit tests validating risk calculation across edge cases (all warnings, single critical error, zero errors).
- **Security Implications:** Enforces enterprise compliance gates; bypass attempts are logged in audit trail.

#### REQ-WORK-02: Human Review Workspace & Decision State Machine
- **Description:** Interactive workspace displaying side-by-side submitted document, highlighted annotations, evidence inspection cards, and decision controls (`APPROVE`, `REQUEST_CHANGES`, `REJECT`).
- **Stakeholder:** Jordan (Reviewer), Taylor (Compliance)
- **Business Justification:** Closes the loop from automated scanning to authorized human governance.
- **Priority:** P0 (MVP)
- **Dependencies:** REQ-WORK-01
- **Proposed Implementation:** Finite State Machine (FSM): `DRAFT` -> `UNDER_REVIEW` -> `CHANGES_REQUESTED` -> `REVISED` -> `APPROVED` / `REJECTED`.
- **Acceptance Criteria:** State transitions only permitted by authorized roles; invalid transitions return HTTP 400 with descriptive error.
- **Testing Approach:** End-to-end integration test validating the entire revision cycle (Submit -> Review -> Request Changes -> Resubmit -> Approve).
- **Security Implications:** Audit logging of every state change with reviewer ID and timestamp.

---

### 4.6 Visual Asset & Accessibility Evaluation (VISUAL)

#### REQ-VIS-01: Approved Brand Asset & Logo Verification
- **Description:** Detect presence of registered brand logos and assets in uploaded images or PDF pages; verify aspect ratio, minimum clear space, and deprecation status.
- **Stakeholder:** Jordan (Brand Reviewer)
- **Business Justification:** Prevents public use of deprecated sub-brand logos or distorted brand marks.
- **Priority:** P2 (Finish Phase / Round 3)
- **Dependencies:** REQ-INGEST-01
- **Proposed Implementation:** Perceptual hashing (pHash) and vision-model bounding box feature matching against registered asset library.
- **Acceptance Criteria:** Accurately flags deprecated logo variants; reports confidence level; highlights when visual check requires human confirmation.
- **Testing Approach:** Test suite of 10 test images (valid logo, deprecated logo, stretched aspect ratio, low contrast).
- **Security Implications:** Safe image decoding prevents memory overflow exploits (Decompression Bomb protection).

#### REQ-VIS-02: Accessibility & Contrast Scanning
- **Description:** Automated checks for WCAG 2.1 AA text-to-background contrast ratios and image alt-text presence in digital creative assets.
- **Stakeholder:** Jordan (Reviewer), Taylor (Compliance)
- **Business Justification:** Legal compliance (ADA/EAA) and ethical brand stewardship.
- **Priority:** P2 (Finish Phase / Round 3)
- **Dependencies:** REQ-INGEST-01
- **Proposed Implementation:** Deterministic luminance contrast calculation on rasterized text regions.
- **Acceptance Criteria:** Flags color contrast pairs below 4.5:1 for normal text and 3:1 for large text.
- **Testing Approach:** Synthetic image test cards with varying contrast gradients.
- **Security Implications:** Minimal.

---

### 4.7 Governance Analytics & Continuous Policy Learning (ANALYTICS)

#### REQ-ANA-01: Compliance & Violation Telemetry Dashboard
- **Description:** Real-time metrics on total submissions, violation distribution by category/severity, review turnaround times, and resolution rates.
- **Stakeholder:** Morgan (Admin)
- **Business Justification:** Gives leadership visibility into organizational brand health and compliance velocity.
- **Priority:** P1 (Build Phase)
- **Dependencies:** REQ-WORK-02
- **Proposed Implementation:** Aggregated SQL analytical queries with explicit tenant boundaries; zero fabricated numbers.
- **Acceptance Criteria:** All metrics reflect actual database records; zero mock numbers in production mode.
- **Testing Approach:** Seed known batch of submissions and verify dashboard counts match database aggregations exactly.
- **Security Implications:** Tenant-isolated analytics; cross-tenant statistical leakage prevented.

#### REQ-ANA-02: Policy Ambiguity & Governance Learning (Signature Improvement C)
- **Description:** Cluster recurring reviewer overrides, frequently triggered warnings, and creator disputes to identify brand guidelines that are vague, contradictory, or frequently misunderstood.
- **Stakeholder:** Morgan (Admin), Jordan (Brand Reviewer)
- **Business Justification:** Evolves brand guidelines from static dogma into living, optimized enterprise standards.
- **Priority:** P1 (Build Phase - Improvement C)
- **Dependencies:** REQ-ANA-01, REQ-KNOW-02
- **Proposed Implementation:** Semantic clustering of flagged findings where reviewers marked "false positive" or "policy unclear"; generates actionable policy amendment recommendations.
- **Acceptance Criteria:** Generates human-readable recommendation reports; **never** alters active policies automatically without Admin approval.
- **Testing Approach:** Feed 15 test review dispute records; verify the system detects the cluster and drafts a coherent policy clarification suggestion.
- **Security Implications:** Strict human gate; ensures AI cannot self-modify organizational governance rules.

---

## 5. Non-Functional Requirements (NFR)

| NFR ID | Category | Metric / Specification | Justification |
| :--- | :--- | :--- | :--- |
| **NFR-01** | **Performance** | End-to-end review of a 1,000-word draft in < 6.0 seconds | Copywriters require prompt feedback to prevent workflow abandonment. |
| **NFR-02** | **Traceability** | 100% of factual findings must include verifiable chunk ID and character span | Core product principle: No ungrounded or hallucinated compliance claims. |
| **NFR-03** | **Security** | Zero Cross-Tenant Data Access (100% test pass on tenant boundaries) | Enterprise data privacy for unreleased marketing and product collateral. |
| **NFR-04** | **Reliability** | Graceful degradation: If LLM API fails, deterministic regex & fact lookup still return results | Marketing workflows cannot halt completely during external cloud API downtime. |
| **NFR-05** | **Auditability** | Immutable audit log of all approvals, rejections, overrides, and policy changes | Essential for compliance defense and internal regulatory reporting. |
| **NFR-06** | **Usability** | WCAG 2.1 AA compliant UI; dual-coding (color + icon/label) for all severity badges | Usable by all internal staff without visual accessibility barriers. |
