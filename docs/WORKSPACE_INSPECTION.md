# BrandProof — Workspace Inspection Report

**Inspection Timestamp:** 2026-10-24T15:06:00+05:30  
**Inspector:** Senior Software Architect & Lead Technical Auditor  
**Target Workspace:** `c:\Users\Praveen\Documents\Hackathon Project\Inkloom AI`

---

## 1. Executive Summary

A comprehensive workspace audit was conducted prior to system design. The target workspace directory is **completely empty** (0 files, 0 directories, uninitialized Git repository). No pre-existing application code, configurations, database connections, or API secrets exist in the directory.

This allows us to design a clean, modular, and greenfield architecture for **BrandProof** without legacy technical debt, while adhering strictly to hackathon integrity and the planning-first mandate.

---

## 2. Environment & System Audit Findings

| Audit Dimension | Finding | Technical Implication & Action |
| :--- | :--- | :--- |
| **Workspace Contents** | 0 files, 0 folders (clean slate) | Propose canonical folder structure (`frontend/`, `backend/`, `docs/`, `tests/`, `eval/`). |
| **Python Runtime** | Python 3.15.1 installed (`C:\Program Files\Python315\python.exe`) | Fast modern runtime. Pydantic v2, FastAPI, SQLAlchemy 2.0 compatible. Virtual environment (`venv`) will be established in Phase 1. |
| **Node / JavaScript** | Node.js v24.22.1 installed; npm v11.19.1 installed | Modern Node engine. Note: PowerShell execution policy restricts `npm.ps1`; commands must run via `cmd.exe /c npm` or `npm.cmd`. |
| **Git Tooling** | `git` executable not in current system PATH | Version control tracking should be initialized via IDE integration or configured when Git binary is linked. |
| **Database Engines** | MySQL 8.0 on PATH; PostgreSQL/pgvector not installed locally; SQLite natively supported by Python | **Architectural Decision:** Utilize SQLAlchemy with an abstraction layer supporting **SQLite (development/hackathon zero-dependency)** and **PostgreSQL + pgvector (production deployment)**. Semantic search will support hybrid in-memory/cosine indexing fallback for local execution. |
| **Pre-existing Secrets** | None found in workspace. No `.env` files present. | All future credentials (LLM API keys, JWT secrets) will use `.env.template` patterns without hardcoding. |
| **Frontend Framework** | None installed | Recommend React + TypeScript + Vite + Tailwind/Vanilla CSS tokens in Phase 1. |
| **Backend Framework** | None installed | Recommend FastAPI + Pydantic v2 + SQLAlchemy 2.0 in Phase 1. |

---

## 3. Directory Layout Recommendation

Since the repository is greenfield, the following structured layout is planned for Phase 1 onwards:

```
Inkloom AI/
├── README.md                      # Primary project overview & planning portal
├── docs/                          # Master architectural & planning documents (Phases 0-9)
│   ├── WORKSPACE_INSPECTION.md
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── API_SPECIFICATION.md
│   ├── AI_AND_DATA_STRATEGY.md
│   ├── SECURITY_AND_PRIVACY.md
│   ├── TESTING_AND_EVALUATION.md
│   ├── RESEARCH_AND_VALIDATION.md
│   ├── DEVELOPMENT_ROADMAP.md
│   ├── DEMO_AND_SUBMISSION_PLAN.md
│   └── DECISIONS_AND_OPEN_QUESTIONS.md
├── backend/                       # Python FastAPI Backend (Phase 1+)
│   ├── app/
│   │   ├── api/                   # REST routing by domain
│   │   ├── core/                  # Security, config, telemetry
│   │   ├── db/                    # Models, migrations, session management
│   │   ├── services/              # Ingestion, claim extraction, verification engine
│   │   └── schemas/               # Strict Pydantic contracts
│   ├── requirements.txt
│   └── tests/                     # Backend unit, integration, and security tests
├── frontend/                      # React + TypeScript + Vite (Phase 1+)
│   ├── src/
│   │   ├── components/            # Reusable UI primitives & brand widgets
│   │   ├── pages/                 # Submission, Review Workspace, Evidence Ledger, Analytics
│   │   ├── services/              # Type-safe API client
│   │   └── types/                 # Shared data contracts
│   ├── package.json
│   └── vite.config.ts
└── eval/                          # Ground-truth benchmark datasets & verification scripts
    ├── test_claims.json
    └── run_eval.py
```

---

## 4. Preservation & Hackathon Integrity Confirmation

- **No existing code was overwritten, modified, or deleted.**
- **No production code or dependencies have been installed.**
- **Workspace is preserved in pure planning mode awaiting explicit user approval.**
