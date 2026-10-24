# BrandProof — REST API Specification

**Document Version:** 1.0.0-PLANNING  
**Lifecycle Status:** Phase 0 — API Contract Baseline  
**Base URL:** `/api/v1`  
**Authentication Scheme:** Bearer JWT Token (`Authorization: Bearer <token>`)

---

## 1. Global Standards & Error Format

All error responses return a standardized RFC 7807 problem details JSON:
```json
{
  "type": "https://brandproof.ai/errors/forbidden-action",
  "title": "Forbidden Action",
  "status": 403,
  "detail": "Creators cannot approve their own content submissions.",
  "instance": "/api/v1/submissions/sub-123/approvals",
  "code": "ERR_CREATOR_SELF_APPROVAL"
}
```

Standard HTTP Status Codes:
- `200 OK` / `201 Created`: Successful synchronous execution.
- `202 Accepted`: Asynchronous review job initiated.
- `400 Bad Request`: Malformed payload or invalid state transition.
- `401 Unauthorized`: Missing or expired JWT token.
- `403 Forbidden`: Insufficient role or cross-tenant access attempt.
- `404 Not Found`: Resource does not exist within the tenant scope.
- `422 Unprocessable Entity`: Pydantic schema validation failure.
- `500 Internal Server Error`: Unhandled server exception.

---

## 2. API Endpoints by Domain

### 2.1 Authentication & Tenant Context

#### `POST /auth/login`
- **Purpose:** Authenticate user and issue scoped JWT token.
- **Role:** Public (No token required)
- **Request Body:**
  ```json
  {
    "email": "jordan@acme.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "usr-123",
      "email": "jordan@acme.com",
      "full_name": "Jordan Smith",
      "role": "BRAND_REVIEWER",
      "organization_id": "org-456",
      "organization_name": "Acme Corp"
    }
  }
  ```

#### `GET /auth/me`
- **Purpose:** Fetch current authenticated user profile and permissions.
- **Role:** Any Authenticated User

---

### 2.2 Brand Knowledge Base & Policy Management

#### `POST /knowledge/guidelines/upload`
- **Purpose:** Upload brand manual (PDF/DOCX/MD) for rule extraction.
- **Role:** `ADMIN`, `BRAND_REVIEWER`
- **Payload:** `multipart/form-data` (`file: UploadFile`, `title: string`)
- **Async Execution:** Yes (`202 Accepted` returning job ID).

#### `POST /knowledge/policies/compile` (Signature Improvement B)
- **Purpose:** Execute Brand Policy Compiler on an uploaded guideline to extract candidate rules.
- **Role:** `ADMIN`, `BRAND_REVIEWER`
- **Request Body:**
  ```json
  {
    "guideline_id": "gdl-123",
    "categories": ["TONE", "TERMINOLOGY", "LEGAL_DISCLOSURE"]
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "guideline_id": "gdl-123",
    "candidate_policies": [
      {
        "code": "POL-TERM-01",
        "title": "Use Official Platform Terminology",
        "category": "TERMINOLOGY",
        "rule_type": "DETERMINISTIC_REGEX",
        "is_mandatory": true,
        "source_passage": "Our platform must always be written as BrandProof with camel case.",
        "rule_config": {
          "forbidden_patterns": ["brandproof", "Brandproof", "BRANDPROOF"],
          "replacement": "BrandProof"
        }
      }
    ]
  }
  ```

#### `POST /knowledge/policies/{id}/approve`
- **Purpose:** Activate a compiled policy version.
- **Role:** `ADMIN`
- **Request Body:**
  ```json
  {
    "version_number": 1,
    "is_mandatory": true,
    "notes": "Approved for corporate release"
  }
  ```
- **Response `200 OK`:** Returns activated `PolicyVersionResponse`.

#### `GET /knowledge/facts`
- **Purpose:** Query the Approved Fact Registry with optional text search and status filter.
- **Role:** All Authenticated Users
- **Query Params:** `query: string`, `status: ACTIVE|ALL`, `limit: int`, `offset: int`

#### `POST /knowledge/facts`
- **Purpose:** Register a new authoritative product/company fact.
- **Role:** `ADMIN`, `COMPLIANCE_REVIEWER`
- **Request Body:**
  ```json
  {
    "subject": "Battery Backup",
    "statement": "BrandProof hardware delivers 48 hours of battery backup under normal usage.",
    "numerical_value": 48.0,
    "unit": "hours",
    "effective_date": "2026-01-01",
    "expiration_date": null,
    "source_reference": "Hardware Spec Sheet v3.1, p. 12"
  }
  ```

---

### 2.3 Content Submission & Evidence Ledger Engine

#### `POST /submissions`
- **Purpose:** Submit raw text, markdown, or file for brand governance review.
- **Role:** `CREATOR`, `REVIEWER`, `ADMIN`
- **Request Body:**
  ```json
  {
    "title": "Q3 Enterprise Product Announcement",
    "channel": "BLOG",
    "raw_content": "Our new platform delivers 72 hours of uninterrupted battery life...",
    "content_format": "TEXT"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "submission_id": "sub-101",
    "version_id": "subver-201",
    "version_number": 1,
    "title": "Q3 Enterprise Product Announcement",
    "status": "UNDER_REVIEW",
    "created_at": "2026-10-24T15:10:00Z"
  }
  ```

#### `POST /submissions/{id}/analyze` (Signature Improvement A & C)
- **Purpose:** Trigger the complete governance scan: claim extraction, Evidence Ledger verification, policy checking, and risk scoring.
- **Role:** `CREATOR`, `REVIEWER`, `ADMIN`
- **Response `200 OK`:**
  ```json
  {
    "submission_id": "sub-101",
    "version_number": 1,
    "risk_score": 65,
    "risk_tier": "HIGH",
    "routing_requirement": "MANDATORY_COMPLIANCE_REVIEW",
    "summary": {
      "total_claims_extracted": 4,
      "violations_count": 2,
      "unsupported_claims_count": 1
    },
    "findings": [
      {
        "id": "fnd-001",
        "issue_category": "FACTUAL_CONTRADICTION",
        "severity": "CRITICAL",
        "char_start": 26,
        "char_end": 34,
        "flagged_text": "72 hours",
        "explanation": "Claim states 72 hours, but official engineering specs verify only 48 hours.",
        "suggested_correction": "48 hours",
        "confidence_score": 0.98,
        "status": "OPEN",
        "evidence": {
          "approved_fact_id": "fct-555",
          "relationship_type": "CONTRADICTS",
          "similarity_score": 0.94,
          "source_attribution": "Hardware Spec Sheet v3.1, p. 12",
          "evidence_snippet": "BrandProof hardware delivers 48 hours of battery backup under normal usage."
        }
      }
    ]
  }
  ```

---

### 2.4 Human Review & Approval Workflow

#### `POST /submissions/{id}/findings/{finding_id}/decision`
- **Purpose:** Accept, dismiss, or override an individual finding.
- **Role:** `BRAND_REVIEWER`, `COMPLIANCE_REVIEWER`, `ADMIN`
- **Request Body:**
  ```json
  {
    "decision": "ACCEPTED", // "ACCEPTED", "DISMISSED", "OVERRIDDEN"
    "reviewer_comment": "Correction applied directly in text."
  }
  ```

#### `POST /submissions/{id}/review/decision`
- **Purpose:** Submit final editorial/compliance verdict on the submission.
- **Role:** `BRAND_REVIEWER`, `COMPLIANCE_REVIEWER`, `ADMIN`
- **Request Body:**
  ```json
  {
    "decision": "CHANGES_REQUESTED", // "APPROVED", "CHANGES_REQUESTED", "REJECTED"
    "notes": "Please correct the battery claim to 48 hours before publication."
  }
  ```
- **Validation Rule:** Creators attempting to call this endpoint receive `403 Forbidden`. If risk tier is `HIGH` or `CRITICAL`, only a `COMPLIANCE_REVIEWER` or `ADMIN` can execute `APPROVED`.

#### `POST /submissions/{id}/revisions`
- **Purpose:** Submit an updated version of a draft incorporating requested changes.
- **Role:** `CREATOR`, `ADMIN`
- **Request Body:**
  ```json
  {
    "revised_content": "Our new platform delivers 48 hours of uninterrupted battery life..."
  }
  ```
- **Response `201 Created`:** Creates `version_number: 2` and triggers automated re-scan.

---

### 2.5 Governance Analytics & Continuous Learning (Signature Improvement C)

#### `GET /analytics/overview`
- **Purpose:** Retrieve tenant brand governance health metrics.
- **Role:** `ADMIN`, `REVIEWER`
- **Response `200 OK`:**
  ```json
  {
    "total_submissions_scanned": 142,
    "avg_turnaround_time_hours": 3.4,
    "compliance_pass_rate": 0.78,
    "top_violation_categories": [
      {"category": "UNSUPPORTED_CLAIM", "count": 48},
      {"category": "TERMINOLOGY", "count": 32},
      {"category": "FACTUAL_CONTRADICTION", "count": 14}
    ]
  }
  ```

#### `GET /analytics/learning/recommendations`
- **Purpose:** Retrieve policy ambiguity clusters and recommended brand guideline amendments.
- **Role:** `ADMIN`
- **Response `200 OK`:**
  ```json
  {
    "clusters": [
      {
        "cluster_id": "cls-01",
        "policy_code": "POL-TONE-02",
        "override_frequency": 0.42,
        "sample_disputes": [
          "Creator argued conversational tone was permitted in social post."
        ],
        "suggested_amendment": "Clarify that casual tone is allowed for LinkedIn, while formal tone remains mandatory for Whitepapers."
      }
    ]
  }
  ```

---

### 2.6 Health & Telemetry

#### `GET /health`
- **Purpose:** Liveness and readiness probe for deployment orchestration.
- **Role:** Public
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-24T15:10:00Z",
    "version": "1.0.0",
    "database": "connected",
    "ai_engine": "online"
  }
  ```
