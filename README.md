# BrandGuard by Inkloom AI

> **Complete Brand-Governance & Compliance Platform for Enterprise Organizations**
> Built with 100% local deterministic algorithms, local machine learning, persistent SQLite database, and multi-tenant isolation. Zero external AI APIs or cloud keys required.

---

## Key Features

1. **Teammate Homepage Preservation**: The original landing page (`public/index.html`) is preserved intact with custom CRT canvas animations, mascot, and dark/light modes.
2. **Multi-Tenant Authentication & RBAC**: Real bcrypt password hashing, session tokens, and strict organization data isolation across four roles:
   - **Admin**: Organization administration and user management.
   - **Brand Manager**: Workspaces, guideline ingestion, rule approval, and claim ledger management.
   - **Creator**: Multi-channel content drafting, revision history, and compliance checks.
   - **Reviewer**: Findings inspection, editorial guidance, and approval with Manager Policy Exceptions.
3. **Constitution Compiler**: Deterministic ingestion of PDF & DOCX guideline documents, extracting candidate rules with exact source citations and modal obligation patterns (`must`, `never`, `avoid`).
4. **Claim Ledger & Evidence**: Authoritative repository for marketing claims with expiration dates, substantiation citations, and unbacked claim alerts.
5. **Local Machine Learning**: Scikit-learn TF-IDF + Logistic Regression tone classifier trained on enterprise copy styles (`Professional`, `Informal`, `Exaggerated`, `Urgent`, `Empowering`) with an authentic 80.0% test accuracy.
6. **Content Studio & Review Engine**: Real-time compliance scans, side-by-side diff previews, suggested replacements, and versioned revisions.
7. **Guideline Health Dashboard**: Live analytics computed directly from SQLite records.
8. **Brand Passport & WCAG 2.1 Accessibility**: Compiled brand identity summary and interactive relative luminance contrast ratio calculator.
9. **Tamper-Evident Audit Trail**: Immutable logging of all governance actions.

---

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Retrain Local ML Model (Optional)
The pre-trained model artifact is already generated in `ml/artifacts/tone_model.joblib`. To retrain:
```bash
python ml/train.py
```

### 3. Start Application
```bash
npm start
```
The application will start on **`http://localhost:3000`**.

- **Landing Page**: `http://localhost:3000/`
- **BrandGuard Workspace**: `http://localhost:3000/brandguard`
- **System Health**: `http://localhost:3000/api/health`

---

## Automated Test Suite

Run the full end-to-end sequential test suite covering Phases 0 through 9:
```bash
npm test
```
*Executes all 18 automated integration tests including authentication, multi-tenancy, PDF compilation, claim expiration, local ML inference, workflow approvals, WCAG math, and SQLite persistence.*

---

## Pre-Seeded Demo Credentials

All seeded accounts use password: **`password123`**

| Organization | Role | Email |
| :--- | :--- | :--- |
| **Inkloom AI** | Admin | `admin@inkloom.ai` |
| **Inkloom AI** | Brand Manager | `manager@inkloom.ai` |
| **Inkloom AI** | Creator | `creator@inkloom.ai` |
| **Inkloom AI** | Reviewer | `reviewer@inkloom.ai` |
| **Nexus Corp** *(Isolated Tenant)* | Admin | `admin@nexuscorp.com` |

*(Use the top demo bar in the BrandGuard UI to switch personas with one click).*

---

## Documentation

- [PROGRESS.md](file:///c:/Users/sahil/Downloads/TechCircuit-Hackathon-main%20(1)/TechCircuit-Hackathon-main/PROGRESS.md) — Implementation progress and phase-by-phase test log.
- [DEMO_SCRIPT.md](file:///c:/Users/sahil/Downloads/TechCircuit-Hackathon-main%20(1)/TechCircuit-Hackathon-main/DEMO_SCRIPT.md) — Step-by-step 5-minute hackathon demonstration script.
- [DISCLOSURE.md](file:///c:/Users/sahil/Downloads/TechCircuit-Hackathon-main%20(1)/TechCircuit-Hackathon-main/DISCLOSURE.md) — Technical, ethical, and local ML evaluation disclosures.