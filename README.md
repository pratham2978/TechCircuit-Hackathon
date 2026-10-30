<div align="center">

# 🛡️ BrandGuard Governance Ledger
### Enterprise Content Verification, RAG Grounding & Brand Passport Ledger

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Groq Cloud](https://img.shields.io/badge/Groq-Llama%203.3%20%2F%20GPT--OSS-F55036?style=flat)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

*An enterprise-grade B2B governance platform combining Retrieval-Augmented Generation (RAG), strict multi-department approval pipelines, and RFC 8032 Ed25519 cryptographic Brand Passports to verify advertising claims, legal terms, and brand integrity before publication.*

</div>

---

## 📌 Table of Contents
- [Executive Overview](#-executive-overview)
- [Key Capabilities](#-key-capabilities)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Review Engines & Governance Tools](#-review-engines--governance-tools)
- [Cryptographic Brand Passports](#-cryptographic-brand-passports)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
  - [Environment Variables (.env)](#3-environment-variables-env)
- [API Reference](#-api-reference)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security & Compliance](#-security--compliance)
- [License](#-license)

---

## 🏢 Executive Overview

In regulated enterprises, marketing collateral, broadcast commercials, and customer-facing contracts routinely fail compliance audits due to:
1. **Unsubstantiated Promotional Claims** (e.g., claiming *"70% off across all tiers"* when the authorized ledger limits the discount to annual plans).
2. **Absolute SLA Violations** (e.g., promising unqualified *"100% uptime with zero outages"* in customer agreements).
3. **Regulatory Non-Disclosure** (e.g., omitting mandatory European EEA Standard Contractual Clauses or on-screen legal disclaimers).
4. **Visual & Design Inconsistencies** (e.g., unapproved hex tokens, WCAG AA contrast failures, or encroaching on logo clear-spaces).

**BrandGuard** solves this by establishing a single source of truth—the **Governance Ledger**. All submissions are audited by an AI pipeline powered by **Groq / Llama / Gemini**, cross-referenced with active company policies via **dynamic RAG**, passed through a **Human Operations Review Queue**, and permanently certified using **cryptographically signed Brand Passports**.

---

## 🚀 Key Capabilities

- **⚡ Live AI Review Engine (Groq / Gemini)**: Zero-latency multi-clause compliance checks using high-throughput LLMs with structured JSON schema outputs.
- **📚 Grounded Policy Retrieval (RAG)**: Injects active policy documents, approved claims, and corporate guidelines into prompts, ensuring zero hallucinated citations.
- **🔐 RFC 8032 Ed25519 Cryptographic Passports**: Digitally signs certified deliverables with asymmetric key pairs and SHA-256 byte hashes, generating tamper-proof audit certificates.
- **🛡️ Multi-Tenant Zero-Trust Isolation**: Company Workspaces and BrandGuard Operations Teams are strictly isolated, protecting proprietary collateral.
- **👔 Enterprise UI Design System**: Built to the standards of Stripe Dashboard, Linear, and IBM Carbon—clean light-mode default, neutral charcoal dark-mode, tabular numerics, and full WCAG AA accessibility.
- **📄 Publication-Grade PDF & JSON Export**: Generates printable ReportLab certificates with QR codes, tamper verification logs, and machine-readable audit envelopes.

---

## 🏗️ Architecture & Tech Stack

```mermaid
graph TD
    Client["Client Workspace / Author"] -->|Uploads Collateral| Frontend["React 19 + TypeScript SPA"]
    Frontend -->|REST APIs + Multipart| Backend["FastAPI Backend (Python 3.11+)"]
    
    subgraph Backend Services
        RAG["RAG Retrieval Engine"] -->|Query Policies & Claims| DB[(PostgreSQL / SQLite)]
        RAG -->|Grounding Context| LLM["Groq Cloud LLM Engine (Llama 3.3 / GPT-OSS)"]
        Backend -->|Review Analysis| LLM
        Backend -->|Issue Audit Proof| Crypto["Ed25519 Signing Engine"]
    end
    
    Backend -->|Persist Audit Trail| DB
    Crypto -->|Sealed Brand Passport| Frontend
    Backend -->|Generate PDF Certificate| ReportLab["ReportLab PDF Generator"]
```

### Core Technologies
| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, React Router v7, Lucide Icons, Pure CSS Tokens (IBM Plex Sans) |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, PyPDF, ReportLab |
| **Database** | PostgreSQL with `psycopg3` (supports automatic SQLite fallback for zero-dependency demos) |
| **AI / LLM** | Groq Cloud (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`), Google Gemini Flash (fallback) |
| **Cryptography** | RFC 8032 Ed25519 asymmetric signatures, SHA-256 canonical hashing |

---

## 🔍 Review Engines & Governance Tools

BrandGuard organizes governance into five specialized review engines:

| Tool | Target Content | Key Governance Checks |
|---|---|---|
| **⚖️ Legal Review** | Contracts, Master Service Agreements (MSAs), SLAs, Terms of Service | Prohibits unqualified 100% uptime guarantees (Rule `SLA-ABS-01`), validates EEA Standard Contractual Clauses (`REG-EEA-04`), enforces liability limitations. |
| **🏷️ Promotions & Claims** | Ad copy, campaign announcements, discount banners | Cross-references discounts and promo windows against the authorized claim ledger (`PROMO-TERMS-01`), verifies conspicuous terms. |
| **✍️ Brand Content** | Blog posts, marketing copy, manuscripts | Enforces corporate tone, eliminates unbacked superlatives (`BRAND-RULE-101`), suggests 1-click evidence corrections. |
| **🎨 Image & Design** | Visual banners, display assets, packaging | Audits brand palette tokens, enforces WCAG 2.1 AA text-to-background contrast (min 4.5:1), checks 16px logo clear-space. |
| **🎬 Video Review** | Commercials, bumpers, social video | Verifies lower-third legal super titles meet minimum 4.0s read times (`VIDEO-SUPER-01`) and mandates spoken audio disclosures. |

---

## 📜 Cryptographic Brand Passports

Once collateral passes review and receives sign-off in the Operations Queue, BrandGuard seals it with an immutable **Brand Passport**:

```json
{
  "passport_number": "PASSPORT-2026-ACME-0842",
  "project_id": "proj-101",
  "file_name": "Campaign_Brief_Q4.docx",
  "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "guideline_version": "2026.1",
  "authorized_by": "Operations Lead (reviewer-01)",
  "issued_at": "2026-10-30T21:44:27Z",
  "status": "VERIFIED",
  "signature_algorithm": "ed25519",
  "ed25519_signature": "7d9b23f8a4...c014e7a2"
}
```

- **Independent Verifier**: Anyone can verify passport integrity without database access by re-computing the SHA-256 hash of the deliverable and testing the Ed25519 public signature.
- **Revocation Ledger**: Immediate on-chain / ledger invalidation if a campaign is cancelled or violated post-launch.

---

## 📂 Project Directory Structure

```text
TechCircuit/
├── backend/
│   ├── app/
│   │   ├── config.py             # Environment configuration & directory setup
│   │   ├── database.py           # SQLAlchemy database session & engine
│   │   ├── models.py             # PostgreSQL relational models & ledger tables
│   │   ├── gemini_service.py     # Groq & Gemini LLM compliance auditor & chat
│   │   ├── provider_verifier.py  # Health check & key validation
│   │   ├── rag_service.py        # Dynamic governance retrieval & policy grounding
│   │   ├── version_service.py    # Manuscript versioning & audit logs
│   │   └── main.py               # FastAPI routers & endpoints
│   ├── requirements.txt          # Python dependencies
│   ├── test_ai_integration.py    # Automated test suite for AI review
│   └── .env                      # Server configuration (ignored by git)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # BrandLogo, Modal, Buttons
│   │   │   └── review/           # ChatReviewInterface, Image & Video review
│   │   ├── context/              # DemoContext (Multi-tenant & theme state)
│   │   ├── layouts/              # AppLayout (Sidebar, Topbar, Drawers)
│   │   ├── pages/
│   │   │   ├── app/              # Dashboard, Approvals, Passports, Projects
│   │   │   ├── auth/             # Login & Tenant Selection
│   │   │   └── marketing/        # Public Landing Page & Feature Showcase
│   │   ├── services/api.ts       # Typed backend REST client
│   │   ├── types/                # Global TypeScript definitions
│   │   └── index.css             # Enterprise Design Token System (IBM Plex Sans)
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: v18.0.0 or higher (npm v9+)
- **PostgreSQL**: v14+ (Optional; defaults to SQLite if unconfigured)
- **Groq API Key**: Obtain a free, fast API key from [Groq Console](https://console.groq.com/)

---

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend will run at: **`http://localhost:5173`**

---

### 3. Environment Variables (`.env`)

Create a `.env` file in the `backend/` directory:

```ini
PORT=8000
NODE_ENV=development

# PostgreSQL Database (Created in pgAdmin or psql)
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/Brandguard

# Groq Cloud API Key (for high-speed AI audits)
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# (Optional) Google Gemini Fallback
# GEMINI_API_KEY=AIzaSy...
# GEMINI_MODEL=gemini-2.0-flash

# Storage & File Limits
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=50

# CORS
FRONTEND_ORIGIN=http://localhost:5173

# JWT Secret for Session Signing
BRANDGUARD_AUTH_SECRET=brandguard-governance-signing-secret-key-32b-prod
```

Now start the backend server:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at: **`http://localhost:8000/docs`**

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/config-status` | `GET` | Health check, active AI provider verification, and DB status |
| `/api/reviews/analyze` | `POST` | Execute AI review on text or manuscript with RAG grounding |
| `/api/reviews/upload-and-analyze` | `POST` | Multipart upload for documents, images, and videos |
| `/api/reviews/chat` | `POST` | Multi-turn contextual follow-up chat with review assistant |
| `/api/passports` | `GET` | List all certified Brand Passports with filters |
| `/api/passports/issue` | `POST` | Issue and cryptographically seal an approved submission |
| `/api/passports/{id}/verify` | `POST` | Perform live cryptographic SHA-256 and Ed25519 verification |
| `/api/passports/{id}/export/{format}` | `GET` | Download ReportLab PDF certificate or canonical JSON audit proof |
| `/api/operations/submissions` | `GET` | Retrieve Human Operations Review Queue items |
| `/api/operations/submissions/{id}/decision` | `POST` | Record binding approval, rejection, or revision requests |

---

## 🧪 Testing & Quality Assurance

The platform includes comprehensive test coverage for AI review pipelines, database constraints, and cryptographic integrity:

```bash
cd backend

# Test live AI integration & provider fallback
python test_ai_integration.py

# Test RAG context injection
python test_rag_integration.py

# Test cryptographic Brand Passport verification
python test_passport_integration.py

# Test PDF report generation
python test_pdf_report_integration.py
```

---

## 🛡️ Security & Compliance

- **Zero-Trust Multi-Tenancy**: Client manuscript contents and proprietary policies are isolated by strict tenant boundaries (`company_id`).
- **Cryptographic Non-Repudiation**: Decisions signed with asymmetric Ed25519 keys cannot be forged or backdated.
- **Redaction of Sensitive Keys**: Secret API keys are masked (`gsk_Qi...Sr0S`) across all telemetry, logs, and public endpoints.
- **WCAG 2.1 AA Compliant**: High contrast typography, full keyboard navigability, and `prefers-reduced-motion` compliance.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
