# BrandProof — Architectural Decisions & Open Questions

**Document Version:** 1.0.0-PLANNING  
**Lifecycle Status:** Phase 0 — Technical Architecture Decision Records (ADR)  

---

## 1. Architectural Decision Records (ADRs)

### ADR-01: Modular Monolith Architecture
- **Context:** Deciding between microservices vs modular monolith for backend architecture.
- **Decision:** Build as a Modular Monolith in FastAPI (`api/`, `services/`, `db/`, `core/`).
- **Rationale:** Microservices add significant deployment overhead, distributed tracing complexity, and network latency that jeopardize delivery during a high-speed hackathon. FastAPI provides clean dependency injection and asynchronous request handling within a single process.
- **Alternatives Considered:** 
  - *Microservices (Separate Ingestion, ML, Auth services):* Rejected due to deployment friction and RPC overhead.
  - *Serverless Functions (AWS Lambda / Cloud Run):* Cold starts create unpredictable latency during live judge demonstrations.

### ADR-02: Dual-Dialect Storage Strategy (SQLite Dev -> PostgreSQL Prod)
- **Context:** Workspace inspection revealed PostgreSQL is not installed locally on the host machine.
- **Decision:** Use SQLAlchemy 2.0 ORM with dual-dialect abstraction: SQLite with in-memory numpy cosine similarity for zero-dependency local development; PostgreSQL 16 with `pgvector` extension for cloud production.
- **Rationale:** Guarantees 100% immediate developer setup without Docker or external DB installation barriers on Windows, while preserving a frictionless path to enterprise scale.
- **Alternatives Considered:**
  - *Mandatory Local Docker PostgreSQL:* High friction; may fail if Docker Desktop is uninstalled or hypervisor is disabled.
  - *Pure Cloud Supabase / Neon DB:* Requires continuous internet connection and active database credentials during local tests.

### ADR-03: Hybrid Retrieval (BM25 + Dense Cosine)
- **Context:** Claim verification requires matching exact numerical specifications (e.g. "48 hours", "$79/mo") as well as conceptual statements.
- **Decision:** Implement Reciprocal Rank Fusion combining BM25 keyword matching with dense vector embeddings.
- **Rationale:** Pure vector embeddings frequently fail on numbers (e.g., confusing "48 hours" with "72 hours" because both share the same semantic context of "battery duration"). BM25 guarantees exact numerical matching.
- **Alternatives Considered:**
  - *Dense Semantic Search Only:* Fails on numerical precision and exact model names.
  - *Pure Full-Text Search (Elasticsearch):* Fails on paraphrased marketing copy and synonyms.

### ADR-04: Deterministic Mathematical Risk Scoring vs. LLM "Vibe" Scoring
- **Context:** Deciding how to assign risk tiers (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) to drafts.
- **Decision:** Calculate risk using an explicit weighted formula based on verified finding categories.
- **Rationale:** LLMs produce non-deterministic, fluctuating scores that cannot be legally defended in enterprise audits. Formulaic scoring is explainable, transparent, and reproducible.
- **Alternatives Considered:**
  - *Prompting the LLM "On a scale of 1-100, rate the risk":* Highly susceptible to prompt injection, temperature variance, and hallucination.

### ADR-05: Strict Boundary Between Absence of Evidence and Falsity
- **Context:** How to classify a claim when no relevant document exists in the Knowledge Base.
- **Decision:** Classify strictly as `UNSUPPORTED_CLAIM` (requires human check). Never mark as `FACTUAL_CONTRADICTION`.
- **Rationale:** Conflating absence of evidence with falsity produces high false-positive rates and erodes user trust. A brand might have launched a new feature that hasn't been uploaded to BrandProof yet.

---

## 2. Unresolved Questions & Assumptions

| # | Question / Assumption | Current Working Assumption | Impact If Assumption Changes | Action / Mitigation |
| :-: | :--- | :--- | :--- | :--- |
| **Q1** | **LLM API Provider & Key Availability** | Assume developer will provide OpenAI, Anthropic, or Gemini API key via `.env`. | System cannot perform contextual NLI or claim extraction without LLM. | Built-in offline mock provider and deterministic fallback mode ensures core workflow runs even with missing keys. |
| **Q2** | **Target Hackathon Build Window** | Assume standard 48-hour hackathon build window. | Phase roadmap may need compression if build window is shorter. | Clear P0 (MVP) vs P1/P2/P3 priority tiers allow immediate scoping adjustment. |
| **Q3** | **External Authoritative Web Search** | Restricted web search vs. internal Knowledge Base only. | Unbounded web search introduces hallucinated/poisoned external citations. | MVP strictly scopes verification to internal approved documents; external verification deferred to P3. |
| **Q4** | **Deployment Target Environment** | Local demonstration with optional Vercel / Render cloud deployment. | Cloud deployment constraints may differ from local Windows host. | Self-contained, portable codebase with unified `.env` configuration. |

---

## 3. High-Priority Technical Risks & Mitigations

```mermaid
quadrantChart
    title Risk Impact vs Likelihood
    x-axis Low Likelihood --> High Likelihood
    y-axis Low Impact --> High Impact
    quadrant-1 High Priority (Immediate Mitigation)
    quadrant-2 Monitor Closely
    quadrant-3 Low Priority
    quadrant-4 Medium Priority (Automated Guardrails)
    
    "LLM API Latency Spike (>10s)": [0.65, 0.75]
    "Cross-Tenant Data Leakage": [0.20, 0.95]
    "Adversarial Prompt Injection": [0.55, 0.70]
    "Windows Execution Policy Friction": [0.70, 0.35]
    "SQLite Vector Search Scale Ceiling": [0.30, 0.40]
```

1. **LLM API Latency Spike:** Mitigation: Asynchronous job queue, deterministic pre-filtering (bypasses LLM for exact keyword matches), and client-side optimistic UI updates.
2. **Cross-Tenant Data Leakage:** Mitigation: Strict tenant scoping middleware at database session level; automated integration test suite asserting zero cross-tenant query capability.
3. **Prompt Injection in Uploaded Files:** Mitigation: System prompt boundary isolation, Pydantic schema validation, and treating all parsed document text strictly as passive data parameters.
4. **PowerShell Script Execution Restriction:** Discovered during workspace inspection (`npm.ps1` restricted). Mitigation: Standardized execution using `cmd.exe /c npm` or `npm.cmd`.
