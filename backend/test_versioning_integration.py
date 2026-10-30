"""
test_versioning_integration.py
Phase 8 Automated Verification Suite:
AI-suggested corrections, persistent versioning, original-vs-revised comparisons,
text diff calculation, rejection audit trails, multi-tenant isolation, and media integrity.
"""

import sys
import os
import uuid
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import get_db, SessionLocal
from app.models import (
    Base,
    ProjectModel,
    ProjectFileModel,
    ContentVersionModel,
    CorrectionRecordModel,
    BrandRuleModel,
    ApprovedClaimModel
)
from app.version_service import (
    compute_text_diff,
    get_or_create_initial_version,
    get_latest_version,
    accept_and_persist_correction,
    reject_and_record_correction,
    list_project_versions,
    compare_project_versions,
    generate_ai_correction
)
from app.main import app

client = TestClient(app)

def setup_module():
    """Ensure test project exists in database."""
    db = SessionLocal()
    try:
        # Check or create test project
        proj = db.query(ProjectModel).filter(ProjectModel.id == "test-p8-proj").first()
        if not proj:
            proj = ProjectModel(
                id="test-p8-proj",
                name="Phase 8 Compliance Campaign",
                description="Testing persistent versioning and diffs",
                status="in_review",
                client_name="Acme Global Brands",
                owner="Brand Specialist"
            )
            db.add(proj)

        # Check or create test project file
        p_file = db.query(ProjectFileModel).filter(ProjectFileModel.id == "file-p8-test").first()
        if not p_file:
            p_file = ProjectFileModel(
                id="file-p8-test",
                project_id="test-p8-proj",
                review_type="legal",
                name="Vendor_Master_Services_Agreement.pdf",
                file_type="pdf",
                original_text="The Vendor liability shall be totally unlimited under all circumstances without exception.",
                current_text="The Vendor liability shall be totally unlimited under all circumstances without exception.",
                version="1.0"
            )
            db.add(p_file)

        db.commit()
    finally:
        db.close()


def test_01_text_diff_computation():
    """Verify word-level diff correctly flags additions (+), deletions (-), and unchanged segments."""
    original = "The Vendor liability shall be totally unlimited under all circumstances."
    revised = "The Vendor aggregate liability shall be capped at fees paid under all circumstances."

    diff_result = compute_text_diff(original, revised)

    assert "segments" in diff_result
    assert "additions_count" in diff_result
    assert "deletions_count" in diff_result
    assert diff_result["additions_count"] > 0
    assert diff_result["deletions_count"] > 0

    types = [seg["type"] for seg in diff_result["segments"]]
    assert "added" in types
    assert "deleted" in types
    assert "unchanged" in types

    # Verify unchanged tokens match
    unchanged_texts = " ".join(s["text"] for s in diff_result["segments"] if s["type"] == "unchanged")
    assert "The Vendor" in unchanged_texts
    assert "under all circumstances." in unchanged_texts


def test_02_baseline_version_initialization_and_idempotency():
    """Verify initial version v1.0 is created with immutable baseline and is idempotent."""
    db = SessionLocal()
    try:
        # Clean existing test versions for clean run
        db.query(CorrectionRecordModel).filter(CorrectionRecordModel.project_id == "test-p8-proj").delete()
        db.query(ContentVersionModel).filter(ContentVersionModel.project_id == "test-p8-proj").delete()
        db.commit()

        v1 = get_or_create_initial_version(
            db,
            project_id="test-p8-proj",
            review_type="legal",
            company_id="acme-global-brands",
            fallback_text="The Vendor liability shall be totally unlimited under all circumstances."
        )

        assert v1 is not None
        assert v1.version_number == "1.0"
        assert v1.parent_version_id is None
        assert v1.change_source == "initial"
        assert v1.project_id == "test-p8-proj"
        assert v1.review_type == "legal"

        # Test idempotency - second call must return existing v1 without duplicating
        v1_again = get_or_create_initial_version(
            db,
            project_id="test-p8-proj",
            review_type="legal",
            company_id="acme-global-brands"
        )
        assert v1_again.id == v1.id
        assert v1_again.version_number == "1.0"

        versions = list_project_versions(db, "test-p8-proj", "legal", "acme-global-brands")
        assert len(versions) == 1
    finally:
        db.close()


def test_03_generate_ai_correction_without_auto_accept():
    """Verify AI-suggested correction drafts compliant text without mutating content or creating versions."""
    db = SessionLocal()
    try:
        finding = {
            "id": "find-unlimited-liability",
            "title": "Unlimited Liability Clause",
            "explanation": "Vendor agreements must cap liability at total contract value or 12 months fees paid.",
            "ruleReference": "RULE-LEG-001 (Liability Cap Mandate)",
            "severity": "critical",
            "original_text_span": "The Vendor liability shall be totally unlimited under all circumstances."
        }

        suggestion = generate_ai_correction(
            db=db,
            finding=finding,
            content="The Vendor liability shall be totally unlimited under all circumstances.",
            review_type="legal",
            company_id="acme-global-brands"
        )

        assert suggestion is not None
        assert "suggestedCorrection" in suggestion
        assert len(suggestion["suggestedCorrection"]) > 0
        assert "explanation" in suggestion

        # CRITICAL ACCEPTANCE CHECK: Generating a correction must NOT create a new version or mutate v1.0
        latest_ver = get_latest_version(db, "test-p8-proj", "legal", "acme-global-brands")
        assert latest_ver.version_number == "1.0"

        corrections = db.query(CorrectionRecordModel).filter(
            CorrectionRecordModel.project_id == "test-p8-proj",
            CorrectionRecordModel.finding_id == "find-unlimited-liability"
        ).all()
        assert len(corrections) == 0  # No record created on generation alone
    finally:
        db.close()


def test_04_accept_correction_creates_v1_1_and_preserves_v1_0():
    """Verify accepting a correction increments version to 1.1, preserves v1.0, and updates records."""
    db = SessionLocal()
    try:
        original_span = "The Vendor liability shall be totally unlimited under all circumstances without exception."
        correction = "The Vendor liability shall be capped at 12 months of paid fees under all circumstances."

        res = accept_and_persist_correction(
            db=db,
            project_id="test-p8-proj",
            review_type="legal",
            finding_id="find-unlimited-liability",
            original_text_span=original_span,
            correction_text=correction,
            is_user_edited=False,
            rule_reference="RULE-LEG-001",
            explanation="Added standard 12-month fee limitation clause.",
            company_id="acme-global-brands",
            author="Brand Legal Specialist"
        )

        assert res["success"] is True
        assert res["new_version"] == "1.1"
        assert res["finding_status"] == "accepted"

        # Check versions list: now has 2 versions (1.0 and 1.1)
        versions = list_project_versions(db, "test-p8-proj", "legal", "acme-global-brands")
        assert len(versions) == 2

        v1_0 = next(v for v in versions if v["version_number"] == "1.0")
        v1_1 = next(v for v in versions if v["version_number"] == "1.1")

        # CRITICAL IMMUTABILITY CHECK: Original v1.0 must remain intact
        assert v1_0["content_text"] != v1_1["content_text"]
        assert v1_1["parent_version_id"] == v1_0["id"]
        assert v1_1["status"] == "current"
        assert v1_0["status"] == "superseded"
        assert correction in v1_1["content_text"]

        # Check CorrectionRecordModel was created and linked
        record = db.query(CorrectionRecordModel).filter(
            CorrectionRecordModel.finding_id == "find-unlimited-liability"
        ).first()
        assert record is not None
        assert record.status == "accepted"
        assert record.resulting_version_id == v1_1["id"]
    finally:
        db.close()


def test_05_reject_correction_records_dismissal_without_version_mutation():
    """Verify rejecting a finding records dismissal reason without modifying content or creating versions."""
    db = SessionLocal()
    try:
        # Snapshot version count before rejection
        versions_before = list_project_versions(db, "test-p8-proj", "legal", "acme-global-brands")
        count_before = len(versions_before)
        latest_before = get_latest_version(db, "test-p8-proj", "legal", "acme-global-brands")

        res = reject_and_record_correction(
            db=db,
            project_id="test-p8-proj",
            review_type="legal",
            finding_id="find-jurisdiction-exception",
            dismissal_reason="legal_approved_exception",
            dismissal_note="General Counsel pre-approved Irish governing law for EMEA vendor.",
            original_text_span="Governing law shall be Ireland.",
            ai_suggestion="Governing law shall be Delaware.",
            rule_reference="RULE-LEG-004",
            company_id="acme-global-brands"
        )

        assert res["success"] is True
        assert res["finding_status"] == "rejected"
        assert res["dismissal_reason"] == "legal_approved_exception"

        # CRITICAL REJECTION CONTRACT: No new version created, content remains unchanged
        versions_after = list_project_versions(db, "test-p8-proj", "legal", "acme-global-brands")
        assert len(versions_after) == count_before

        latest_after = get_latest_version(db, "test-p8-proj", "legal", "acme-global-brands")
        assert latest_after.id == latest_before.id
        assert latest_after.version_number == latest_before.version_number
        assert latest_after.content_text == latest_before.content_text

        # Correction record is stored with rejected status
        rec = db.query(CorrectionRecordModel).filter(
            CorrectionRecordModel.finding_id == "find-jurisdiction-exception"
        ).first()
        assert rec is not None
        assert rec.status == "rejected"
        assert rec.dismissal_reason == "legal_approved_exception"
        assert "EMEA vendor" in rec.dismissal_note
    finally:
        db.close()


def test_06_compare_project_versions_structured_diff():
    """Verify compare_project_versions returns structured additions, deletions, and addressed findings."""
    db = SessionLocal()
    try:
        comparison = compare_project_versions(
            db=db,
            project_id="test-p8-proj",
            review_type="legal",
            company_id="acme-global-brands"
        )

        assert comparison is not None
        assert comparison["from_version"]["version_number"] == "1.0"
        assert comparison["to_version"]["version_number"] == "1.1"
        assert "diff" in comparison
        assert comparison["diff"]["additions_count"] > 0
        assert comparison["diff"]["deletions_count"] > 0
        assert len(comparison["diff"]["segments"]) > 0

        # Verify addressed findings mapping
        assert len(comparison["addressed_findings"]) >= 1
        finding_item = comparison["addressed_findings"][0]
        assert finding_item["finding_id"] == "find-unlimited-liability"
        assert finding_item["status"] == "accepted"
    finally:
        db.close()


def test_07_media_comparison_reporting_integrity():
    """Verify image and video comparison honestly reports capabilities without false automation claims."""
    db = SessionLocal()
    try:
        # 1. Image review versioning
        get_or_create_initial_version(
            db,
            project_id="test-p8-proj",
            review_type="images",
            company_id="acme-global-brands",
            fallback_text="Hero banner graphic: 1200x630, primary color #0F172A."
        )

        img_comp = compare_project_versions(
            db=db,
            project_id="test-p8-proj",
            review_type="images",
            company_id="acme-global-brands"
        )
        assert img_comp["media_comparison"]["media_type"] == "image"
        # Does NOT claim image file edit when only text notes were recorded
        assert img_comp["media_comparison"]["has_revised_media_file"] is False
        assert "media_editing_pipeline_note" in img_comp["media_comparison"]

        # 2. Video review versioning
        get_or_create_initial_version(
            db,
            project_id="test-p8-proj",
            review_type="videos",
            company_id="acme-global-brands",
            fallback_text="Promo video clip 30s: disclaimer timestamp 00:04."
        )

        vid_comp = compare_project_versions(
            db=db,
            project_id="test-p8-proj",
            review_type="videos",
            company_id="acme-global-brands"
        )
        assert vid_comp["media_comparison"]["media_type"] == "video"
        assert vid_comp["media_comparison"]["has_revised_media_file"] is False
        assert "video" in vid_comp["media_comparison"]["media_editing_pipeline_note"].lower()
    finally:
        db.close()


def test_08_multi_tenant_isolation():
    """Verify tenant isolation: Tenant B cannot compare or access Tenant A's versions."""
    db = SessionLocal()
    try:
        # Retrieve v1 created under acme-global-brands
        v1 = get_latest_version(db, "test-p8-proj", "legal", "acme-global-brands")
        assert v1 is not None

        # Cross-tenant query attempt with different company_id
        failed = False
        try:
            compare_project_versions(
                db=db,
                project_id="test-p8-proj",
                review_type="legal",
                from_version_id=v1.id,
                company_id="competitor-brand-corp"
            )
        except Exception as e:
            failed = True
            assert "not found" in str(e).lower() or "unauthorized" in str(e).lower()
        assert failed, "Expected multi-tenant authorization error for cross-tenant access"
    finally:
        db.close()


def test_09_api_endpoints_integration():
    """Verify all Phase 8 HTTP endpoints via FastAPI TestClient."""
    # 1. Suggest correction
    sug_res = client.post(
        "/api/reviews/suggest-correction",
        json={
            "finding": {
                "id": "f-claim-70",
                "title": "70% Faster without citation",
                "explanation": "Superlative speed claim lacks third-party benchmark.",
                "ruleReference": "RULE-CLM-002",
                "severity": "critical"
            },
            "content": "Our solution is 70% faster than all legacy platforms.",
            "review_type": "promotions",
            "company_id": "acme-global-brands"
        }
    )
    assert sug_res.status_code == 200
    sug_data = sug_res.json()
    assert sug_data["success"] is True
    assert len(sug_data["suggestedCorrection"]) > 0

    # 2. Get version history
    hist_res = client.get("/api/versions/test-p8-proj/legal?company_id=acme-global-brands")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["success"] is True
    assert len(hist_data["versions"]) >= 2

    # 3. Get latest version
    latest_res = client.get("/api/versions/test-p8-proj/legal/latest?company_id=acme-global-brands")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert latest_data["success"] is True
    assert latest_data["version"]["version_number"] == "1.1"

    # 4. Compare versions via HTTP
    comp_res = client.get("/api/versions/test-p8-proj/legal/compare?company_id=acme-global-brands")
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["success"] is True
    assert "comparison" in comp_data
    assert comp_data["comparison"]["from_version"]["version_number"] == "1.0"
    assert comp_data["comparison"]["to_version"]["version_number"] == "1.1"
    assert "diff" in comp_data["comparison"]
    assert len(comp_data["comparison"]["diff"]["segments"]) > 0


if __name__ == "__main__":
    setup_module()
    test_01_text_diff_computation()
    print("✓ Test 1: Word-level text diff passed.")
    test_02_baseline_version_initialization_and_idempotency()
    print("✓ Test 2: Baseline v1.0 initialization and idempotency passed.")
    test_03_generate_ai_correction_without_auto_accept()
    print("✓ Test 3: AI-suggested correction generation without auto-accept passed.")
    test_04_accept_correction_creates_v1_1_and_preserves_v1_0()
    print("✓ Test 4: Accept correction creates v1.1 and preserves immutable v1.0 passed.")
    test_05_reject_correction_records_dismissal_without_version_mutation()
    print("✓ Test 5: Reject correction records dismissal without version mutation passed.")
    test_06_compare_project_versions_structured_diff()
    print("✓ Test 6: Compare project versions structured additions/deletions diff passed.")
    test_07_media_comparison_reporting_integrity()
    print("✓ Test 7: Media comparison reporting integrity passed.")
    test_08_multi_tenant_isolation()
    print("✓ Test 8: Multi-tenant isolation enforcement passed.")
    test_09_api_endpoints_integration()
    print("✓ Test 9: FastAPI Phase 8 endpoint integration passed.")
    print("\nALL PHASE 8 TESTS PASSED SUCCESSFULLY!")
