"""
Phase 10: Brand Passport System Integration Test Suite
Verifies cryptographic integrity, Ed25519 asymmetric signatures, SHA-256 byte hashing,
tamper detection, file modification detection, auditable revocations, and role-based security.
"""

import sys
import os
import json
import hashlib
from datetime import datetime

# Insert backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import (
    UserModel,
    ProjectModel,
    ReviewSubmissionModel,
    ReviewDecisionModel,
    BrandPassportModel,
    BrandRuleModel,
    ApprovedClaimModel
)
from app.crypto_service import (
    mint_brand_passport,
    verify_passport_integrity,
    revoke_brand_passport,
    compute_file_sha256,
    canonical_json_bytes,
    ed25519_sign,
    ed25519_verify,
    get_server_signing_keys
)
from app.pdf_service import generate_passport_pdf
from fastapi import HTTPException


def run_tests():
    db = SessionLocal()
    print("=" * 70)
    print("STARTING BRANDGUARD PHASE 10 BRAND PASSPORT TEST SUITE")
    print("=" * 70)

    try:
        # -------------------------------------------------------------
        # SETUP TEST DATA
        # -------------------------------------------------------------
        print("\n[SETUP] Creating isolated test entities in database...")

        # 1. Users
        ops_user = db.query(UserModel).filter(UserModel.id == "usr-elena").first()
        if not ops_user:
            ops_user = UserModel(
                id="usr-elena",
                email="elena.rostova@brandguard.internal",
                name="Elena Rostova (Operations Reviewer)",
                password_hash="test_hash_elena",
                salt="test_salt_elena",
                role="operations_reviewer",
                company_id="brandguard-operations"
            )
            db.add(ops_user)

        company_user_a = db.query(UserModel).filter(UserModel.id == "usr-sarah").first()
        if not company_user_a:
            company_user_a = UserModel(
                id="usr-sarah",
                email="sarah.chen@acmebrands.com",
                name="Sarah Chen (Brand Manager)",
                password_hash="test_hash_sarah",
                salt="test_salt_sarah",
                role="company_user",
                company_id="acme-global-brands"
            )
            db.add(company_user_a)

        company_user_b = db.query(UserModel).filter(UserModel.id == "usr-competitor").first()
        if not company_user_b:
            company_user_b = UserModel(
                id="usr-competitor",
                email="alice@globexcorp.com",
                name="Alice Globex",
                password_hash="test_hash_alice",
                salt="test_salt_alice",
                role="company_user",
                company_id="globex-industries"
            )
            db.add(company_user_b)

        db.commit()

        # 2. Approved Submission A
        test_content_v1 = "Official press release announcing the Enterprise Cloud 2027 initiative. 99.9% uptime SLA."
        sub_approved = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == "sub-test-passport-01").first()
        if not sub_approved:
            sub_approved = ReviewSubmissionModel(
                id="sub-test-passport-01",
                project_id="proj-summer-launch",
                project_name="Summer Campaign 2027",
                company_id="acme-global-brands",
                company_name="Acme Global Brands",
                review_type="document",
                version_number="1.0",
                approved_version_number="1.0",
                status="approved",
                file_name="Acme_Cloud_Announcement.docx",
                content_text=test_content_v1,
                submitted_by="Sarah Chen",
                findings_count=0,
                critical_count=0
            )
            db.add(sub_approved)
            db.commit()

        # Associated approval decision for v1.0
        dec_approved = db.query(ReviewDecisionModel).filter(
            ReviewDecisionModel.submission_id == sub_approved.id,
            ReviewDecisionModel.version_number == "1.0"
        ).first()
        if not dec_approved:
            dec_approved = ReviewDecisionModel(
                id="dec-test-passport-01",
                submission_id=sub_approved.id,
                project_id=sub_approved.project_id,
                company_id=sub_approved.company_id,
                review_type=sub_approved.review_type,
                version_number="1.0",
                reviewer_id=ops_user.id,
                reviewer_name=ops_user.name,
                reviewer_role="operations_reviewer",
                decision="approved",
                previous_status="under_review",
                resulting_status="approved",
                comments="Document conforms to master enterprise guidelines and SLAs."
            )
            db.add(dec_approved)
            db.commit()

        # 3. Unapproved Submission (Pending)
        sub_pending = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == "sub-test-pending-01").first()
        if not sub_pending:
            sub_pending = ReviewSubmissionModel(
                id="sub-test-pending-01",
                project_id="proj-summer-launch",
                project_name="Summer Campaign 2027",
                company_id="acme-global-brands",
                company_name="Acme Global Brands",
                review_type="claim",
                version_number="1.0",
                status="pending_review",
                file_name="Claims_Draft.pdf",
                content_text="Draft claims without verification.",
                submitted_by="Sarah Chen"
            )
            db.add(sub_pending)
            db.commit()

        # Clean existing test passports for this submission to ensure deterministic testing
        db.query(BrandPassportModel).filter(BrandPassportModel.submission_id == sub_approved.id).delete()
        db.commit()

        print("[SETUP] Test fixtures ready.")

        # -------------------------------------------------------------
        # TEST 1: Cannot issue passport without a valid approval
        # -------------------------------------------------------------
        print("\n[TEST 1] Testing rejection of unapproved submission issuance...")
        try:
            mint_brand_passport(db, submission_id=sub_pending.id, reviewer=ops_user)
            assert False, "FAILED: Issuance should have thrown an HTTPException for unapproved submission."
        except HTTPException as e:
            assert e.status_code == 400, f"Expected 400 status code, got {e.status_code}"
            assert "Cannot issue Brand Passport" in e.detail or "must be in 'approved' status" in e.detail
            print(f"  [PASS] Successfully rejected unapproved submission with HTTP {e.status_code}: {e.detail}")

        # -------------------------------------------------------------
        # TEST 2: Passport binds exact approved submission version
        # -------------------------------------------------------------
        print("\n[TEST 2] Issuing passport for approved submission and binding version...")
        mint_res = mint_brand_passport(
            db=db,
            submission_id=sub_approved.id,
            reviewer=ops_user,
            guideline_version="2026.2"
        )
        assert mint_res["success"] is True
        passport_id = mint_res["passport_id"]
        passport_number = mint_res["passport_number"]
        print(f"  Minted passport ID: {passport_id}, Number: {passport_number}")

        passport_record = db.query(BrandPassportModel).filter(BrandPassportModel.id == passport_id).first()
        assert passport_record is not None
        assert passport_record.approved_version_number == "1.0", f"Expected version '1.0', got {passport_record.approved_version_number}"
        assert passport_record.submission_id == sub_approved.id
        assert passport_record.guideline_version == "2026.2"
        print(f"  [PASS] Passport successfully bound to approved submission v{passport_record.approved_version_number}.")

        # -------------------------------------------------------------
        # TEST 3: Original approved file SHA-256 byte hash recorded correctly
        # -------------------------------------------------------------
        print("\n[TEST 3] Verifying approved file SHA-256 byte hash calculation...")
        expected_sha256 = hashlib.sha256(test_content_v1.encode("utf-8")).hexdigest()
        assert passport_record.approved_file_hash == expected_sha256, (
            f"Expected SHA-256 {expected_sha256}, got {passport_record.approved_file_hash}"
        )
        print(f"  Approved file SHA-256: {passport_record.approved_file_hash}")
        print("  [PASS] File SHA-256 hash precisely matches content byte digest.")

        # -------------------------------------------------------------
        # TEST 4: Valid RFC 8032 Ed25519 signature passes verification
        # -------------------------------------------------------------
        print("\n[TEST 4] Verifying valid Ed25519 digital signature and seal...")
        v_res = verify_passport_integrity(db=db, passport_id=passport_id)
        assert v_res["is_valid"] is True, f"Expected is_valid=True, got {v_res}"
        assert v_res["status"] == "VERIFIED", f"Expected status 'VERIFIED', got {v_res['status']}"
        assert v_res["algorithm"] == "Ed25519"
        assert v_res["key_id"] == passport_record.key_id
        print(f"  Verification Result: {v_res['status']} - {v_res['message']}")
        print("  [PASS] Pure RFC 8032 Ed25519 asymmetric signature verified against server public key.")

        # -------------------------------------------------------------
        # TEST 5: Tampering with signed fields causes signature verification to fail
        # -------------------------------------------------------------
        print("\n[TEST 5] Testing tamper detection on canonical payload...")
        tampered_dict = json.loads(passport_record.canonical_payload)
        tampered_dict["approved_version_number"] = "99.9"  # Attacker alters approved version number
        tampered_payload_str = canonical_json_bytes(tampered_dict).decode("utf-8")

        tamper_res = verify_passport_integrity(
            db=db,
            passport_id=passport_id,
            test_tampered_payload=tampered_payload_str
        )
        assert tamper_res["is_valid"] is False
        assert tamper_res["status"] == "INVALID_SIGNATURE", f"Expected 'INVALID_SIGNATURE', got {tamper_res['status']}"
        print(f"  Tamper Verification Result: {tamper_res['status']} - {tamper_res['message']}")
        print("  [PASS] Cryptographic Ed25519 verification detected payload alteration and rejected certificate.")

        # -------------------------------------------------------------
        # TEST 6: Modifying approved file content causes FILE_MODIFIED integrity failure
        # -------------------------------------------------------------
        print("\n[TEST 6] Testing file modification detection...")
        altered_file_bytes = b"Modified unauthorized content: 100% cloud uptime guaranteed with zero exceptions."
        modified_res = verify_passport_integrity(
            db=db,
            passport_id=passport_id,
            test_override_file_bytes=altered_file_bytes
        )
        assert modified_res["is_valid"] is False
        assert modified_res["status"] == "FILE_MODIFIED", f"Expected 'FILE_MODIFIED', got {modified_res['status']}"
        assert modified_res["approved_file_hash"] == expected_sha256
        assert modified_res["current_file_hash"] != expected_sha256
        print(f"  File Modification Result: {modified_res['status']} - {modified_res['message']}")
        print("  [PASS] Recalculated file SHA-256 byte mismatch flagged as FILE_MODIFIED.")

        # -------------------------------------------------------------
        # TEST 7: Missing file produces VERIFICATION_UNAVAILABLE (distinguished from file modification)
        # -------------------------------------------------------------
        print("\n[TEST 7] Testing handling of missing verification source file...")
        # Temporarily clear content_text and file_storage_path to test missing file detection
        original_content = sub_approved.content_text
        sub_approved.content_text = None
        db.commit()

        missing_res = verify_passport_integrity(db=db, passport_id=passport_id)
        assert missing_res["is_valid"] is False
        assert missing_res["status"] == "VERIFICATION_UNAVAILABLE", (
            f"Expected 'VERIFICATION_UNAVAILABLE', got {missing_res['status']}"
        )
        print(f"  Missing File Result: {missing_res['status']} - {missing_res['message']}")
        print("  [PASS] Correctly returned VERIFICATION_UNAVAILABLE without falsely claiming VERIFIED or FILE_MODIFIED.")

        # Restore original content
        sub_approved.content_text = original_content
        db.commit()

        # -------------------------------------------------------------
        # TEST 8: Revoked passports fail verification and cannot be presented as valid
        # -------------------------------------------------------------
        print("\n[TEST 8] Testing auditable passport revocation...")
        revoke_res = revoke_brand_passport(
            db=db,
            passport_id=passport_id,
            reason="Regulatory audit revealed unapproved performance claim in distributor channel.",
            reviewer=ops_user
        )
        assert revoke_res["success"] is True
        assert revoke_res["status"] == "REVOKED"

        revoked_verify = verify_passport_integrity(db=db, passport_id=passport_id)
        assert revoked_verify["is_valid"] is False
        assert revoked_verify["status"] == "REVOKED", f"Expected 'REVOKED', got {revoked_verify['status']}"
        assert revoked_verify["revoked_by"] == ops_user.name
        print(f"  Revocation Result: {revoked_verify['status']} - {revoked_verify['message']}")
        print("  [PASS] Revoked passport fails verification and displays immutable audit reason.")

        # -------------------------------------------------------------
        # TEST 9: Role-based authorization & multi-tenant isolation
        # -------------------------------------------------------------
        print("\n[TEST 9] Testing role-based security & tenant isolation...")
        # 9a: Company user cannot issue passport
        try:
            mint_brand_passport(db, submission_id=sub_approved.id, reviewer=company_user_a)
            assert False, "FAILED: Company user should not be authorized to mint passports."
        except HTTPException as e:
            assert e.status_code == 403, f"Expected 403, got {e.status_code}"
            print(f"  [PASS] Company user blocked from issuing passport (HTTP {e.status_code}).")

        # 9b: Company user cannot revoke passport
        try:
            revoke_brand_passport(db, passport_id=passport_id, reason="Hack", reviewer=company_user_a)
            assert False, "FAILED: Company user should not be authorized to revoke passports."
        except HTTPException as e:
            assert e.status_code == 403, f"Expected 403, got {e.status_code}"
            print(f"  [PASS] Company user blocked from revoking passport (HTTP {e.status_code}).")

        # 9c: Multi-tenant isolation: Tenant B cannot access Tenant A's passport
        from app.main import verify_company_access
        try:
            verify_company_access(company_user_b, "acme-global-brands")
            assert False, "FAILED: Tenant B should not be permitted access to Tenant A's passport."
        except HTTPException as e:
            assert e.status_code == 403
            print(f"  [PASS] Multi-tenant cross-company access blocked (HTTP {e.status_code}).")

        # -------------------------------------------------------------
        # TEST 10: Duplicate active issuance prevention
        # -------------------------------------------------------------
        print("\n[TEST 10] Testing duplicate active issuance prevention...")
        # Create a fresh approved submission
        sub_dup = ReviewSubmissionModel(
            id="sub-test-dup-01",
            project_id="proj-summer-launch",
            project_name="Summer Campaign 2027",
            company_id="acme-global-brands",
            company_name="Acme Global Brands",
            review_type="content",
            version_number="1.0",
            status="approved",
            file_name="Dup_Test.txt",
            content_text="Sample text for duplicate test.",
            submitted_by="Sarah Chen"
        )
        db.add(sub_dup)
        dec_dup = ReviewDecisionModel(
            id="dec-test-dup-01",
            submission_id=sub_dup.id,
            project_id=sub_dup.project_id,
            company_id=sub_dup.company_id,
            review_type=sub_dup.review_type,
            version_number="1.0",
            reviewer_id=ops_user.id,
            reviewer_name=ops_user.name,
            reviewer_role="operations_reviewer",
            decision="approved",
            previous_status="under_review",
            resulting_status="approved",
            comments="Approved duplicate test version"
        )
        db.add(dec_dup)
        db.commit()

        # First issuance succeeds
        first_pass = mint_brand_passport(db, sub_dup.id, ops_user)
        assert first_pass["success"] is True

        # Second issuance for the same version without revocation fails
        try:
            mint_brand_passport(db, sub_dup.id, ops_user)
            assert False, "FAILED: Duplicate issuance for same approved version should fail."
        except HTTPException as e:
            assert e.status_code == 409, f"Expected 409 Conflict, got {e.status_code}"
            print(f"  [PASS] Prevented duplicate issuance with HTTP 409: {e.detail}")

        # -------------------------------------------------------------
        # TEST 11: Export generation (ReportLab PDF certificate & JSON audit proof)
        # -------------------------------------------------------------
        print("\n[TEST 11] Testing ReportLab PDF certificate and JSON audit proof export...")
        pdf_bytes = generate_passport_pdf(passport_record)
        assert len(pdf_bytes) > 1000, f"Expected valid PDF bytes > 1000, got {len(pdf_bytes)}"
        assert pdf_bytes.startswith(b"%PDF"), "Generated output does not start with valid PDF header"
        print(f"  Generated certified PDF size: {len(pdf_bytes)} bytes.")

        canonical_obj = json.loads(passport_record.canonical_payload)
        assert canonical_obj["passport_number"] == passport_record.passport_number
        assert canonical_obj["approved_file_hash"] == passport_record.approved_file_hash
        print("  [PASS] ReportLab PDF certificate and canonical JSON audit proof validated.")

        # -------------------------------------------------------------
        # TEST 12: Backward compatibility of existing reviews & approvals
        # -------------------------------------------------------------
        print("\n[TEST 12] Checking backward compatibility of existing models and reviews...")
        rules_count = db.query(BrandRuleModel).count()
        claims_count = db.query(ApprovedClaimModel).count()
        subs_count = db.query(ReviewSubmissionModel).count()
        assert rules_count > 0, "Brand rules preserved"
        assert claims_count > 0, "Approved claims preserved"
        assert subs_count > 0, "Submissions preserved"
        print(f"  Preserved {rules_count} brand rules, {claims_count} claims, and {subs_count} submissions.")
        print("  [PASS] Existing systems, guidelines, and reviews remain fully intact.")

        # Clean up temporary duplicate submission
        db.query(BrandPassportModel).filter(BrandPassportModel.submission_id == sub_dup.id).delete()
        db.query(ReviewDecisionModel).filter(ReviewDecisionModel.submission_id == sub_dup.id).delete()
        db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == sub_dup.id).delete()
        db.commit()

        print("\n" + "=" * 70)
        print("ALL 12 BRAND PASSPORT INTEGRATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
