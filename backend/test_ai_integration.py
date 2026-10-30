"""
BrandGuard AI & PostgreSQL Integration Test Suite
Verifies:
1. Health, Database Status, and AI Provider Verification endpoints
2. Safe database table creation and query execution
3. Missing GEMINI_API_KEY handling (honest HTTP 503 error)
4. AI Provider verification (detecting Gemini vs OpenAI without leaking keys)
5. Analysis execution across all 5 review features:
   - Legal Document Review
   - Promotion & Offer Claims
   - Content Review
   - Image & Design Review
   - Video Review
6. Multi-turn chat follow-ups grounded in review context
7. Multi-project conversation history isolation and DB persistence
8. Request validation errors
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from unittest.mock import patch
from app.main import (
    app,
    health_check,
    config_status,
    database_status,
    ai_verification,
    run_review_analysis,
    run_chat_followup,
    get_review_history,
    clear_review_history,
    AnalyzeRequest,
    ChatFollowupRequest
)
from app.database import test_database_connection, SessionLocal
from app.init_db import init_database
from app.models import ProjectModel, ReviewSessionModel, ChatMessageModel
from app.provider_verifier import detect_provider_from_key, mask_api_key, check_current_ai_configuration


def run_tests():
    passed = 0
    failed = 0

    print("==================================================================")
    print("  RUNNING BRANDGUARD BACKEND, DB & AI INTEGRATION TESTS")
    print("==================================================================")

    # TEST 1: Health, Config Status & DB Status
    print("\n[Test 1] Health, Config Status & Database Status Endpoints...")
    try:
        health = health_check()
        assert health["status"] == "ok"
        assert health["service"] == "brandguard-api"
        assert "database" in health
        assert "ai" in health

        cfg = config_status()
        assert "gemini_configured" in cfg
        assert "supported_features" in cfg

        db_stat = database_status()
        assert "connected" in db_stat
        assert "dialect" in db_stat
        print(f"  ✓ PASS: Health & Config endpoints verified (Dialect: {db_stat['dialect']}, Connected: {db_stat['connected']}).")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Health check error: {e}")
        failed += 1

    # TEST 2: Database Schema & Models Initialization
    print("\n[Test 2] Database Models Initialization & Record Persistence...")
    try:
        init_database()
        db = SessionLocal()
        proj_count = db.query(ProjectModel).count()
        assert proj_count >= 1
        summer_proj = db.query(ProjectModel).filter(ProjectModel.id == "proj-summer-2027").first()
        assert summer_proj is not None
        assert len(summer_proj.files) >= 3
        db.close()
        print(f"  ✓ PASS: Database tables created and demo projects queried successfully ({proj_count} project records).")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Database initialization error: {e}")
        failed += 1

    # TEST 3: AI Provider Key Verification & Detection
    print("\n[Test 3] AI Provider Key Verification & Safe Detection...")
    try:
        # Detect Gemini format
        assert detect_provider_from_key("AIzaSyB1234567890123456789012345678901") == "gemini"
        # Detect OpenAI format
        assert detect_provider_from_key("sk-proj-1234567890abcdef1234567890abcdef") == "openai"
        # Detect Anthropic format
        assert detect_provider_from_key("sk-ant-api03-1234567890") == "anthropic"
        # Detect Unknown / None
        assert detect_provider_from_key("") == "none"

        # Check mask function does not leak secrets
        masked = mask_api_key("AIzaSyB1234567890123456789012345678901")
        assert masked == "AIzaSy...8901"
        assert "123456789012345678901234567" not in masked

        # Check unconfigured AI status report
        with patch("app.provider_verifier.GEMINI_API_KEY", ""):
            status_unconfigured = check_current_ai_configuration()
            assert status_unconfigured["configured"] is False

        # Check OpenAI key notification (stopping live integration if wrong provider)
        with patch("app.provider_verifier.GEMINI_API_KEY", "sk-proj-testkey123456789"):
            status_openai = check_current_ai_configuration()
            assert status_openai["provider"] == "openai"
            assert status_openai["compatible"] is False
            assert "OpenAI" in status_openai["message"]

        print("  ✓ PASS: Provider detection correctly distinguishes Gemini, OpenAI, and Anthropic keys without logging secrets.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Provider verification test failed: {e}")
        failed += 1

    # TEST 4: Missing API Key Error State (No fake analysis)
    print("\n[Test 4] Missing GEMINI_API_KEY Handling (Strict Error Contract)...")
    try:
        with patch("app.gemini_service.GEMINI_API_KEY", ""):
            req = AnalyzeRequest(
                project_id="proj-summer-2027",
                review_type="legal",
                content="Provider guarantees 100% uninterrupted uptime without exception."
            )
            resp = run_review_analysis(req)
            assert resp.status_code == 503
            import json
            body = json.loads(resp.body.decode("utf-8"))
            assert body["success"] is False
            assert body["error"] == "MISSING_API_KEY"
            assert "GEMINI_API_KEY is not configured" in body["message"]
        print("  ✓ PASS: Missing API key returns honest HTTP 503 with MISSING_API_KEY (no fake mock results).")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Missing API key test failed: {e}")
        failed += 1

    # Mocked Gemini responses for testing the 5 review features
    mock_responses = {
        "legal": {
            "overallResult": "Changes Required (Critical SLA Violation)",
            "keyFindings": [
                "Unqualified 100% uptime SLA guarantee prohibited by SLA-ABS-01.",
                "Missing mandatory EEA Cross-Border Data Transfer SCCs disclosure."
            ],
            "findings": [
                {
                    "id": "fnd-leg-1",
                    "title": "Absolute SLA Guarantee Prohibited",
                    "severity": "critical",
                    "explanation": "Guaranteed 100% uptime without exclusions creates unbounded commercial liability.",
                    "ruleReference": "SLA-ABS-01: Prohibited Absolute Availability",
                    "sourceDoc": "Enterprise Master Terms 2026",
                    "sourcePage": 8,
                    "suggestedCorrection": "target 99.9% commercially reasonable availability",
                    "confidence": "high"
                }
            ],
            "summaryNarration": "Identified 1 critical SLA compliance violation regarding absolute availability claims."
        },
        "promotions": {
            "overallResult": "Revisions Required (Claim Scope Mismatch)",
            "keyFindings": [
                "Headline claims '70% off all tiers' but ledger claim restricts discounts to annual enterprise plans."
            ],
            "findings": [
                {
                    "id": "fnd-pro-1",
                    "title": "Promotion Scope Mismatch",
                    "severity": "critical",
                    "explanation": "Claim Ledger #CLM-2024-089 strictly excludes professional consulting and hardware.",
                    "ruleReference": "PROMO-TERMS-01: Claim Substantiation Standard",
                    "sourceDoc": "Approved Claim Ledger 2026",
                    "sourcePage": 14,
                    "suggestedCorrection": "Up to 70% off selected annual tiers only",
                    "confidence": "high"
                }
            ],
            "summaryNarration": "Promotional copy must qualify the 70% discount to reflect approved ledger exclusions."
        },
        "content": {
            "overallResult": "Revisions Recommended (Passive Voice & Unsubstantiated Superlative)",
            "keyFindings": [
                "Phrase 'the only platform' lacks verified third-party analyst citation.",
                "Multiple passive voice sentences detected."
            ],
            "findings": [
                {
                    "id": "fnd-con-1",
                    "title": "Unsubstantiated Superlative Claim",
                    "severity": "warning",
                    "explanation": "Describing the product as 'the only platform' violates Brand Rule 101.",
                    "ruleReference": "BRAND-RULE-101: Superlative Veracity",
                    "sourceDoc": "Brand Guidelines 2026",
                    "sourcePage": 12,
                    "suggestedCorrection": "a leading enterprise governance platform",
                    "confidence": "high"
                }
            ],
            "summaryNarration": "Content tone is elevated but contains 1 unverified superlative claim requiring qualification."
        },
        "images": {
            "overallResult": "Revisions Required (Color Token & WCAG Contrast Violation)",
            "keyFindings": [
                "Detected off-palette purple (#9B51E0) violating registered color token standards.",
                "Subtitle text-to-background contrast is 3.2:1, failing WCAG 2.1 AA (4.5:1 required)."
            ],
            "findings": [
                {
                    "id": "fnd-img-1",
                    "title": "Unapproved Color Token Detected (#9B51E0)",
                    "severity": "critical",
                    "explanation": "The background banner includes hex color #9B51E0 which is not an approved BrandGuard token.",
                    "ruleReference": "DESIGN-PALETTE-01: Approved Brand Color Tokens",
                    "sourceDoc": "Visual Asset & Design System",
                    "sourcePage": 4,
                    "suggestedCorrection": "Replace with Warm Ivory (#F7F5F0) or Evidence Teal (#167C78)",
                    "confidence": "high"
                }
            ],
            "summaryNarration": "Design asset violates WCAG AA contrast rules and uses unapproved gradient colors."
        },
        "videos": {
            "overallResult": "Changes Required (Super Title Duration)",
            "keyFindings": [
                "Lower-third super title at 00:15 visible for only 1.8 seconds (min 4.0s required)."
            ],
            "findings": [
                {
                    "id": "fnd-vid-1",
                    "title": "On-Screen Super Title Duration Insufficient",
                    "severity": "critical",
                    "explanation": "Broadcast advertising standard requires legal disclaimers to remain on-screen for at least 4.0 seconds.",
                    "ruleReference": "VIDEO-SUPER-01: Minimum Super Title Legibility",
                    "sourceDoc": "Broadcast Guidelines 2026",
                    "sourcePage": 19,
                    "suggestedCorrection": "Extend lower-third super banner duration from 00:15 to 00:19",
                    "confidence": "high",
                    "timestamp": "00:15"
                }
            ],
            "summaryNarration": "Video footage contains a broadcast timing infraction at 00:15 regarding legal super titles."
        }
    }

    # TEST 5: All 5 Review Features Pipeline
    print("\n[Test 5] Testing All 5 Review Features Analysis...")
    for feature in ["legal", "promotions", "content", "images", "videos"]:
        try:
            with patch("app.main.analyze_review_content", return_value=mock_responses[feature]):
                req = AnalyzeRequest(
                    project_id="proj-summer-2027",
                    review_type=feature,
                    content="Sample test review content for validation.",
                    instructions="Audit against brand rules.",
                    file_name=f"test_asset_{feature}.docx",
                    media_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" if feature in ["images", "videos"] else None,
                    media_mime_type="image/png" if feature == "images" else "video/mp4" if feature == "videos" else None
                )
                res = run_review_analysis(req)
                assert res["success"] is True
                assert res["overallResult"] == mock_responses[feature]["overallResult"]
                assert len(res["findings"]) == len(mock_responses[feature]["findings"])
                assert len(res["keyFindings"]) == len(mock_responses[feature]["keyFindings"])
                assert "summaryNarration" in res
                print(f"  ✓ PASS: {feature.capitalize()} Review feature executed successfully with structured findings.")
                passed += 1
        except Exception as e:
            print(f"  ✗ FAIL: {feature} review failed: {e}")
            failed += 1

    # TEST 6: Multi-Turn Follow-Up Questions Grounded in Context
    print("\n[Test 6] Multi-Turn Follow-Up Questions using Review Context...")
    try:
        mock_reply = "According to SLA-ABS-01, replacement wording must state '99.9% commercially reasonable availability' with proportional service credits."
        with patch("app.main.chat_followup", return_value=mock_reply):
            chat_req = ChatFollowupRequest(
                project_id="proj-summer-2027",
                review_type="legal",
                message="What is the exact approved wording to replace the 100% guarantee?",
                context_notes="Verdict: Changes Required; Finding: Absolute SLA Guarantee Prohibited"
            )
            chat_res = run_chat_followup(chat_req)
            assert chat_res["success"] is True
            assert chat_res["reply"] == mock_reply
            print("  ✓ PASS: Follow-up chat responded authoritatively with context grounding.")
            passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Follow-up chat failed: {e}")
        failed += 1

    # TEST 7: Separate Conversation Histories for Different Projects & Reviews
    print("\n[Test 7] Project and Review Conversation Isolation & Persistence...")
    try:
        hist_summer_legal = get_review_history("proj-summer-2027", "legal")
        hist_summer_content = get_review_history("proj-summer-2027", "content")
        hist_other_project = get_review_history("proj-other-9999", "legal")

        # Summer Sale Legal has recorded messages
        assert len(hist_summer_legal["messages"]) >= 2
        # Summer Sale Content has its own messages
        assert len(hist_summer_content["messages"]) >= 1
        # Another project should be empty
        assert len(hist_other_project["messages"]) == 0

        # Clearing summer legal does NOT affect summer content
        clear_review_history("proj-summer-2027", "legal")
        hist_summer_legal_after = get_review_history("proj-summer-2027", "legal")
        assert len(hist_summer_legal_after["messages"]) == 0

        hist_summer_content_after = get_review_history("proj-summer-2027", "content")
        assert len(hist_summer_content_after["messages"]) >= 1
        print("  ✓ PASS: Complete conversation isolation between projects and review tools verified.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Conversation isolation failed: {e}")
        failed += 1

    # TEST 8: Validation Errors for Missing Media Payloads
    print("\n[Test 8] Validation for Missing Media Payloads...")
    try:
        req = AnalyzeRequest(
            project_id="proj-test",
            review_type="images",
            content="",
            instructions=""
        )
        try:
            run_review_analysis(req)
            print("  ✗ FAIL: Expected HTTPException for empty image review.")
            failed += 1
        except Exception as e:
            assert getattr(e, "status_code", None) == 400
            print("  ✓ PASS: Empty image review correctly raises HTTP 400 validation error.")
            passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Validation test error: {e}")
        failed += 1

    print("\n==================================================================")
    print(f"  TEST RESULTS: {passed} PASSED, {failed} FAILED")
    print("==================================================================")

    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
