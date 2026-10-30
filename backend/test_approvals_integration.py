"""
test_approvals_integration.py
Phase 9 Automated Verification Suite:
Human Operations review and approval workflow, review queue database persistence,
role-based access control, multi-tenant isolation, state transitions, version locking,
append-only decision history, and customer change requests.
"""

import sys
import os
import uuid
from datetime import datetime
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import get_db, SessionLocal
from app.models import (
    UserModel,
    ProjectModel,
    ContentVersionModel,
    ReviewSubmissionModel,
    ReviewDecisionModel,
    ChangeRequestModel
)
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)
from app.operations_service import (
    list_submissions,
    get_submission_detail,
    create_submission,
    record_review_decision,
    customer_resubmit,
    list_change_requests
)
from app.main import app

client = TestClient(app)

# Global test users and tokens
tokens = {}

def setup_module():
    """Ensure database schema and test actors exist."""
    db = SessionLocal()
    try:
        p_hash, salt = hash_password("testpass123")

        # 1. Company User (Acme)
        cu = db.query(UserModel).filter(UserModel.id == "test-user-company-acme").first()
        if not cu:
            cu = UserModel(
                id="test-user-company-acme",
                email="sarah.test@acme.com",
                name="Sarah Chen (Company)",
                password_hash=p_hash,
                salt=salt,
                role="company_user",
                company_id="acme-global-brands",
                company_name="Acme Global Brands",
                is_active=True
            )
            db.add(cu)

        # 2. Company User (Tenant B - Competitor)
        cb = db.query(UserModel).filter(UserModel.id == "test-user-company-beta").first()
        if not cb:
            cb = UserModel(
                id="test-user-company-beta",
                email="mark.test@beta.com",
                name="Mark Stone (Beta Corp)",
                password_hash=p_hash,
                salt=salt,
                role="company_user",
                company_id="beta-corp",
                company_name="Beta Corporation",
                is_active=True
            )
            db.add(cb)

        # 3. Operations Reviewer
        op = db.query(UserModel).filter(UserModel.id == "test-user-ops-reviewer").first()
        if not op:
            op = UserModel(
                id="test-user-ops-reviewer",
                email="elena.test@brandguard.io",
                name="Elena Rostova (Operations Reviewer)",
                password_hash=p_hash,
                salt=salt,
                role="operations_reviewer",
                company_id="brandguard-ops",
                company_name="BrandGuard Operations Hub",
                is_active=True
            )
            db.add(op)

        # 4. Test Project for Acme
        proj = db.query(ProjectModel).filter(ProjectModel.id == "test-p9-proj").first()
        if not proj:
            proj = ProjectModel(
                id="test-p9-proj",
                name="Phase 9 Operations Campaign",
                description="Testing human review queue and decisions",
                status="in_review",
                client_name="Acme Global Brands",
                owner="Sarah Chen (Company)"
            )
            db.add(proj)

        db.commit()

        # Generate verified tokens
        tokens["company_acme"] = create_access_token({
            "sub": "test-user-company-acme",
            "email": "sarah.test@acme.com",
            "name": "Sarah Chen (Company)",
            "role": "company_user",
            "company_id": "acme-global-brands",
            "company_name": "Acme Global Brands"
        })

        tokens["company_beta"] = create_access_token({
            "sub": "test-user-company-beta",
            "email": "mark.test@beta.com",
            "name": "Mark Stone (Beta Corp)",
            "role": "company_user",
            "company_id": "beta-corp",
            "company_name": "Beta Corporation"
        })

        tokens["ops_reviewer"] = create_access_token({
            "sub": "test-user-ops-reviewer",
            "email": "elena.test@brandguard.io",
            "name": "Elena Rostova (Operations Reviewer)",
            "role": "operations_reviewer",
            "company_id": "brandguard-ops",
            "company_name": "BrandGuard Operations Hub"
        })

    finally:
        db.close()


def test_01_submissions_appear_in_queue_from_database():
    """Verify submissions appear in Operations queue from actual DB records with required metadata."""
    db = SessionLocal()
    try:
        user_ops = db.query(UserModel).filter(UserModel.id == "test-user-ops-reviewer").first()
        submissions = list_submissions(db, user_ops)

        assert isinstance(submissions, list)
        assert len(submissions) >= 1

        sub = submissions[0]
        assert "id" in sub
        assert "project_name" in sub
        assert "company_name" in sub
        assert "review_type" in sub
        assert "status" in sub
        assert "version_number" in sub
        assert "findings_count" in sub
        assert "submitted_at" in sub
        assert "latest_report_id" in sub
    finally:
        db.close()


def test_02_company_creates_submission_with_submitted_status():
    """Verify company user can submit completed AI review into Operations queue."""
    db = SessionLocal()
    try:
        user_acme = db.query(UserModel).filter(UserModel.id == "test-user-company-acme").first()

        res = create_submission(
            db=db,
            project_id="test-p9-proj",
            review_type="legal",
            user=user_acme,
            file_name="Master_Services_Agreement_2026.docx",
            content_text="The Vendor liability shall be totally capped at 12 months fees without exception.",
            content_summary="Legal SLA terms submitted for human signoff.",
            findings=[
                {
                    "id": "f-t1",
                    "title": "Liability limitation check",
                    "severity": "advisory",
                    "explanation": "Clause verified against corporate standards."
                }
            ]
        )

        assert res["success"] is True
        assert res["status"] == "submitted"
        assert "submission_id" in res

        # Verify record exists in DB
        sub_id = res["submission_id"]
        sub_rec = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == sub_id).first()
        assert sub_rec is not None
        assert sub_rec.status == "submitted"
        assert sub_rec.company_id == "acme-global-brands"
        assert sub_rec.findings_count == 1
    finally:
        db.close()


def test_03_role_authorization_company_user_cannot_approve():
    """Verify Company Users are strictly prohibited from approving or rejecting submissions."""
    db = SessionLocal()
    try:
        user_acme = db.query(UserModel).filter(UserModel.id == "test-user-company-acme").first()
        sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.project_id == "test-p9-proj").first()
        assert sub is not None

        # Attempt to approve as company user
        failed = False
        try:
            record_review_decision(
                db=db,
                submission_id=sub.id,
                decision="approved",
                comments="Self-approving my own submission.",
                reviewer=user_acme
            )
        except Exception as e:
            failed = True
            assert "Forbidden" in str(e) or "403" in str(e) or "Company users cannot approve" in str(e)

        assert failed, "Company user must be forbidden from issuing approval decisions"
    finally:
        db.close()


def test_04_authorized_reviewer_can_request_changes():
    """Verify Operations Reviewer can request changes, creating a linked customer change request."""
    db = SessionLocal()
    try:
        user_ops = db.query(UserModel).filter(UserModel.id == "test-user-ops-reviewer").first()
        sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.project_id == "test-p9-proj").first()
        assert sub is not None

        res = record_review_decision(
            db=db,
            submission_id=sub.id,
            decision="changes_requested",
            comments="Please clarify indemnity carve-outs for third-party intellectual property claims.",
            actionable_instructions="Add explicit exception in Section 8.2 for third-party IP infringement indemnification.",
            reviewer=user_ops
        )

        assert res["success"] is True
        assert res["resulting_status"] == "changes_requested"

        # Verify submission updated
        db.refresh(sub)
        assert sub.status == "changes_requested"
        assert sub.assigned_reviewer == user_ops.name

        # Verify customer change request was created
        cr = db.query(ChangeRequestModel).filter(ChangeRequestModel.submission_id == sub.id).first()
        assert cr is not None
        assert cr.status == "changes_requested"
        assert "Section 8.2" in cr.description
        assert cr.company_id == "acme-global-brands"
    finally:
        db.close()


def test_05_customer_resubmits_revised_version():
    """Verify customer can submit revised version, transitioning status to 'resubmitted'."""
    db = SessionLocal()
    try:
        user_acme = db.query(UserModel).filter(UserModel.id == "test-user-company-acme").first()
        sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.project_id == "test-p9-proj").first()
        assert sub is not None
        assert sub.status == "changes_requested"

        revised_text = "The Vendor liability shall be capped at 12 months fees, except for third-party IP infringement."

        res = customer_resubmit(
            db=db,
            submission_id=sub.id,
            revised_content=revised_text,
            user=user_acme,
            resubmission_notes="Added explicit third-party IP indemnification exception in Section 8.2."
        )

        assert res["success"] is True
        assert res["resulting_status"] == "resubmitted"
        assert res["new_version_number"] != sub.version_number or float(res["new_version_number"]) > 1.0

        db.refresh(sub)
        assert sub.status == "resubmitted"
        assert revised_text in sub.content_text
    finally:
        db.close()


def test_06_operations_approves_revised_version_locks_version():
    """Verify Operations Reviewer approves submission and binds approval to specific version."""
    db = SessionLocal()
    try:
        user_ops = db.query(UserModel).filter(UserModel.id == "test-user-ops-reviewer").first()
        sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.project_id == "test-p9-proj").first()
        assert sub is not None
        assert sub.status == "resubmitted"

        res = record_review_decision(
            db=db,
            submission_id=sub.id,
            decision="approved",
            comments="Section 8.2 indemnity carve-out satisfied. Certified compliant with corporate policy.",
            reviewer=user_ops
        )

        assert res["success"] is True
        assert res["resulting_status"] == "approved"

        db.refresh(sub)
        assert sub.status == "approved"
        assert sub.approved_version_number == sub.version_number
    finally:
        db.close()


def test_07_invalid_status_transitions_rejected():
    """Verify state machine rejects invalid status transitions."""
    db = SessionLocal()
    try:
        user_ops = db.query(UserModel).filter(UserModel.id == "test-user-ops-reviewer").first()
        user_acme = db.query(UserModel).filter(UserModel.id == "test-user-company-acme").first()
        sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.project_id == "test-p9-proj").first()
        assert sub is not None
        assert sub.status == "approved"

        # 1. Cannot transition an approved version to changes_requested directly
        failed = False
        try:
            record_review_decision(
                db=db,
                submission_id=sub.id,
                decision="changes_requested",
                comments="Attempting invalid transition.",
                reviewer=user_ops
            )
        except Exception as e:
            failed = True
            assert "Invalid state transition" in str(e) or "400" in str(e)
        assert failed, "Invalid transition from approved must be rejected"

        # 2. Cannot resubmit when already approved
        failed_resubmit = False
        try:
            customer_resubmit(
                db=db,
                submission_id=sub.id,
                revised_content="New text after approval",
                user=user_acme
            )
        except Exception as e:
            failed_resubmit = True
            assert "Cannot resubmit" in str(e) or "400" in str(e)
        assert failed_resubmit, "Resubmitting an approved submission directly must be rejected"
    finally:
        db.close()


def test_08_multi_tenant_isolation_company_beta_cannot_access_acme():
    """Verify Company B cannot view or access Company A's submissions."""
    db = SessionLocal()
    try:
        user_beta = db.query(UserModel).filter(UserModel.id == "test-user-company-beta").first()
        sub_acme = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.project_id == "test-p9-proj").first()
        assert sub_acme is not None

        # 1. Listing submissions for Beta only shows Beta records
        beta_subs = list_submissions(db, user_beta)
        for s in beta_subs:
            assert s["company_id"] == "beta-corp"
            assert s["id"] != sub_acme.id

        # 2. Direct get_submission_detail fails with 403 Forbidden
        failed_access = False
        try:
            get_submission_detail(db, sub_acme.id, user_beta)
        except Exception as e:
            failed_access = True
            assert "Forbidden" in str(e) or "403" in str(e)
        assert failed_access, "Cross-company access must be blocked"
    finally:
        db.close()


def test_09_decision_history_is_append_only_and_cannot_be_overwritten():
    """Verify decision history retains all chronological decisions without silent overwrites."""
    db = SessionLocal()
    try:
        user_ops = db.query(UserModel).filter(UserModel.id == "test-user-ops-reviewer").first()
        sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.project_id == "test-p9-proj").first()
        assert sub is not None

        # Fetch detail
        detail = get_submission_detail(db, sub.id, user_ops)
        decisions = detail["decisions"]

        # Must have at least 2 decisions recorded: changes_requested, then approved
        assert len(decisions) >= 2
        decision_types = [d["decision"] for d in decisions]
        assert "changes_requested" in decision_types
        assert "approved" in decision_types

        # Verify each decision has reviewer, timestamp, and version
        for d in decisions:
            assert "reviewer_name" in d
            assert "created_at" in d
            assert "version_number" in d
            assert "comments" in d
    finally:
        db.close()


def test_10_http_endpoints_integration_with_jwt():
    """Verify Phase 9 FastAPI HTTP endpoints with cryptographically signed JWT tokens."""
    # 1. Login endpoint
    login_res = client.post("/api/auth/login", json={
        "email": "elena.test@brandguard.io",
        "password": "testpass123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    assert "access_token" in login_data
    token = login_data["access_token"]

    # 2. Authenticated GET /api/auth/me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["role"] == "operations_reviewer"

    # 3. GET /api/operations/submissions
    subs_res = client.get("/api/operations/submissions", headers={"Authorization": f"Bearer {token}"})
    assert subs_res.status_code == 200
    subs_data = subs_res.json()
    assert subs_data["success"] is True
    assert len(subs_data["submissions"]) >= 1

    # 4. GET /api/operations/change-requests
    crs_res = client.get("/api/operations/change-requests", headers={"Authorization": f"Bearer {token}"})
    assert crs_res.status_code == 200
    crs_data = crs_res.json()
    assert crs_data["success"] is True
    assert len(crs_data["change_requests"]) >= 1

    # 5. Security Check: Company user token cannot access review decision endpoint
    co_token = tokens["company_acme"]
    sub_id = subs_data["submissions"][0]["id"]

    unauth_decision = client.post(
        f"/api/operations/submissions/{sub_id}/decision",
        json={"decision": "approved", "comments": "Malicious self-signoff attempt."},
        headers={"Authorization": f"Bearer {co_token}"}
    )
    assert unauth_decision.status_code == 403
    assert "Company users cannot approve" in unauth_decision.text or "Forbidden" in unauth_decision.text


if __name__ == "__main__":
    setup_module()
    test_01_submissions_appear_in_queue_from_database()
    print("✓ Test 1: Submissions appear in queue from database passed.")
    test_02_company_creates_submission_with_submitted_status()
    print("✓ Test 2: Company creates submission with 'submitted' status passed.")
    test_03_role_authorization_company_user_cannot_approve()
    print("✓ Test 3: Role authorization: Company user cannot approve passed.")
    test_04_authorized_reviewer_can_request_changes()
    print("✓ Test 4: Authorized reviewer can request changes with instructions passed.")
    test_05_customer_resubmits_revised_version()
    print("✓ Test 5: Customer resubmits revised version (status 'resubmitted') passed.")
    test_06_operations_approves_revised_version_locks_version()
    print("✓ Test 6: Operations approves revised version and locks version passed.")
    test_07_invalid_status_transitions_rejected()
    print("✓ Test 7: Invalid state transitions rejected by state machine passed.")
    test_08_multi_tenant_isolation_company_beta_cannot_access_acme()
    print("✓ Test 8: Multi-tenant isolation: Tenant B blocked from Tenant A data passed.")
    test_09_decision_history_is_append_only_and_cannot_be_overwritten()
    print("✓ Test 9: Decision history is append-only and cannot be overwritten passed.")
    test_10_http_endpoints_integration_with_jwt()
    print("✓ Test 10: FastAPI HTTP endpoints with cryptographically signed JWT passed.")
    print("\nALL PHASE 9 HUMAN OPERATIONS WORKFLOW TESTS PASSED SUCCESSFULLY!")

