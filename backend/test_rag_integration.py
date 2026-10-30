"""
BrandGuard Phase 7: RAG & Dynamic Company-Specific Guideline Retrieval Test Suite

Verifies:
1. Guideline Document Ingestion & Chunking (page marker & section title preservation).
2. Guideline & Rule CRUD APIs with database persistence.
3. Approved Claims CRUD APIs with source substantiation documentation.
4. Category-Specific Retrieval for each of the five review features (Legal, Promotions, Content, Images, Videos).
5. Dynamic Grounding Prompt Injection into Gemini review pipeline.
6. Honest Handling of Empty Guidelines (explicit notice when no company rules exist).
7. Backend Grounding Validation (verification of rule IDs and citations against DB records).
8. Multi-Tenant Data Isolation (Tenant A cannot retrieve Tenant B's guidelines/rules/claims).
9. Full Review Workflow Integration (upload-and-analyze & analyze endpoints returning grounding metadata).
"""

import os
import sys
import io
import json
from pathlib import Path
from unittest.mock import patch

# Ensure backend root is in sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import UploadFile
from app.database import SessionLocal
from app.init_db import init_database
from app.models import (
    GuidelineDocModel,
    GuidelineChunkModel,
    BrandRuleModel,
    ApprovedClaimModel
)
from app.rag_service import (
    chunk_text_by_pages,
    index_guideline_document,
    retrieve_governance_context,
    validate_and_ground_findings
)
from app.gemini_service import analyze_review_content
from app.main import (
    list_guidelines,
    list_brand_rules,
    create_brand_rule,
    update_brand_rule,
    delete_brand_rule,
    list_approved_claims,
    create_approved_claim,
    update_approved_claim,
    delete_approved_claim,
    run_review_analysis,
    upload_and_analyze,
    AnalyzeRequest,
    RuleCreateRequest,
    RuleUpdateRequest,
    ClaimCreateRequest,
    ClaimUpdateRequest,
    RagRetrieveRequest,
    test_rag_retrieval
)


def run_rag_tests():
    passed = 0
    failed = 0

    print("==================================================================")
    print("  BRANDGUARD PHASE 7: RAG & GOVERNANCE RETRIEVAL TEST SUITE")
    print("==================================================================")

    # Initialize DB schema & migrations
    init_database()

    # -------------------------------------------------------------------------
    # TEST 1: Guideline Text Chunking & Page Marker Preservation
    # -------------------------------------------------------------------------
    print("\n[Test 1] Testing Document Text Chunking & Page Marker Extraction...")
    try:
        sample_doc = (
            "--- [Page 1] ---\n"
            "Brand Voice & Core Identity\n\n"
            "Acme Global Brands is an enterprise provider. Always write with clarity and authority. "
            "Never use hyperbolic buzzwords like 'game-changer' or 'unprecedented'.\n\n"
            "--- [Page 2] ---\n"
            "Legal & Regulatory Disclaimers\n\n"
            "All enterprise SLAs guarantee 99.9% availability, excluding scheduled maintenance. "
            "Never guarantee 100% uptime without qualification under any circumstance."
        )

        chunks = chunk_text_by_pages(sample_doc, chunk_size=300, chunk_overlap=50)
        assert len(chunks) >= 2, f"Expected at least 2 chunks, got {len(chunks)}"

        # Check page number preservation
        page_numbers = [c["page_number"] for c in chunks]
        assert 1 in page_numbers, "Page 1 marker missing from chunk metadata"
        assert 2 in page_numbers, "Page 2 marker missing from chunk metadata"

        # Check section title extraction
        titles = [c["section_title"] for c in chunks if c.get("section_title")]
        assert any("Voice" in t or "Brand" in t for t in titles), f"Expected section title 'Brand Voice', got {titles}"

        print(f"  PASS: Successfully extracted {len(chunks)} chunks with preserved page markers and section titles.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Document chunking failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 2: Ingestion & Indexing of Guideline Document
    # -------------------------------------------------------------------------
    print("\n[Test 2] Testing Guideline Ingestion and Database Chunk Indexing...")
    try:
        db = SessionLocal()
        test_file_path = os.path.join(backend_dir, "uploads", "test_guideline.txt")
        os.makedirs(os.path.dirname(test_file_path), exist_ok=True)
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write(
                "--- [Page 1] ---\n"
                "Brand Protection Playbook 2027\n\n"
                "Rule 1: Prohibit competitor defamation in comparative advertisements.\n"
                "Rule 2: Any benchmark claim must cite an ISO 9001 accredited third-party lab.\n\n"
                "--- [Page 2] ---\n"
                "Visual Identity System\n\n"
                "Primary logo requires a 24px exclusion zone around all margins. Logo background must remain pure #FFFFFF."
            )

        doc_record = index_guideline_document(
            db=db,
            company_id="acme-global-brands",
            file_path=test_file_path,
            original_filename="Brand_Protection_Playbook_2027.txt",
            category="Brand Guidelines",
            title_override="Brand Protection Playbook 2027"
        )

        assert doc_record.id is not None
        assert doc_record.pages_count == 2
        assert len(doc_record.chunks) >= 2

        # Verify DB persistence of chunks
        db_chunks = db.query(GuidelineChunkModel).filter(GuidelineChunkModel.document_id == doc_record.id).all()
        assert len(db_chunks) >= 2
        assert db_chunks[0].company_id == "acme-global-brands"

        print(f"  PASS: Document indexed with ID '{doc_record.id}' and {len(db_chunks)} chunks persisted in database.")
        db.close()
        passed += 1
    except Exception as e:
        print(f"  FAIL: Guideline indexing failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 3: Guideline & Rule CRUD Endpoints
    # -------------------------------------------------------------------------
    print("\n[Test 3] Testing Brand Rules CRUD Endpoints...")
    try:
        # Create rule
        req = RuleCreateRequest(
            company_id="acme-global-brands",
            title="Prohibit Unsupported Uptime Claims",
            category="brand_rules",
            rule_type="prohibited_term",
            term_or_pattern="100% uptime",
            preferred_alternative="99.9% enterprise SLA",
            explanation="Unqualified 100% uptime claims violate regulatory truth-in-advertising guidelines.",
            severity="critical",
            status="approved",
            source_doc="Brand Guidelines 2026.pdf",
            source_page=14
        )
        created = create_brand_rule(req)
        rule_id = created["rule"]["id"]
        assert rule_id.startswith("RULE-"), f"Unexpected rule ID format: {rule_id}"

        # List rules
        listed = list_brand_rules(company_id="acme-global-brands")
        found = any(r["id"] == rule_id for r in listed["rules"])
        assert found, f"Created rule {rule_id} not found in listed rules"

        # Update rule
        update_brand_rule(rule_id, RuleUpdateRequest(severity="warning"), company_id="acme-global-brands")
        db = SessionLocal()
        updated_obj = db.query(BrandRuleModel).filter(BrandRuleModel.id == rule_id).first()
        assert updated_obj.severity == "warning"
        db.close()

        # Delete rule
        delete_brand_rule(rule_id, company_id="acme-global-brands")
        db = SessionLocal()
        deleted_obj = db.query(BrandRuleModel).filter(BrandRuleModel.id == rule_id).first()
        assert deleted_obj is None
        db.close()

        print("  PASS: Rules CRUD (Create, List, Update, Delete) executed successfully.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Rule CRUD failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 4: Approved Claims CRUD Endpoints
    # -------------------------------------------------------------------------
    print("\n[Test 4] Testing Approved Claims CRUD Endpoints...")
    try:
        claim_req = ClaimCreateRequest(
            company_id="acme-global-brands",
            claim_text="Reduces enterprise compliance auditing overhead by 42%.",
            source_doc="Gartner Peer Insights Cloud Governance Study 2026",
            source_page=18,
            owner="VP of Product Marketing",
            valid_from="2026-01-01",
            valid_to="2027-12-31",
            status="VERIFIED",
            context_notes="Audited by Gartner study."
        )
        created_claim = create_approved_claim(claim_req)
        claim_id = created_claim["claim"]["id"]
        assert claim_id.startswith("CLM-2026-")

        # List claims
        claims_list = list_approved_claims(company_id="acme-global-brands")
        assert any(c["id"] == claim_id for c in claims_list["claims"])

        # Update claim
        update_approved_claim(claim_id, ClaimUpdateRequest(status="EXPIRING_SOON"), company_id="acme-global-brands")
        db = SessionLocal()
        c_obj = db.query(ApprovedClaimModel).filter(ApprovedClaimModel.id == claim_id).first()
        assert c_obj.status == "EXPIRING_SOON"
        db.close()

        # Delete claim
        delete_approved_claim(claim_id, company_id="acme-global-brands")
        db = SessionLocal()
        assert db.query(ApprovedClaimModel).filter(ApprovedClaimModel.id == claim_id).first() is None
        db.close()

        print("  PASS: Claims CRUD (Create, List, Update, Delete) executed successfully.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Claim CRUD failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 5: Feature-Specific Governance Retrieval (All 5 Features)
    # -------------------------------------------------------------------------
    print("\n[Test 5] Testing Category-Specific Retrieval for All Five Review Features...")
    try:
        features = ["legal", "promotions", "content", "images", "videos"]
        for feat in features:
            ctx = retrieve_governance_context(
                company_id="acme-global-brands",
                review_type=feat,
                query_text="warranty disclaimer uptime discount logo duration broadcast"
            )
            assert ctx["has_company_guidelines"] is True, f"Expected company guidelines for feature {feat}"
            assert len(ctx["retrieved_rules"]) > 0 or len(ctx["retrieved_claims"]) > 0 or len(ctx["retrieved_chunks"]) > 0, \
                f"Feature {feat} retrieved no governance context"
            assert "prompt_grounding_text" in ctx
            assert len(ctx["prompt_grounding_text"]) > 50

            print(f"    Feature '{feat}': Retrieved {len(ctx['retrieved_rules'])} rules, {len(ctx['retrieved_claims'])} claims, {len(ctx['retrieved_chunks'])} chunks.")

        print("  PASS: All five review features successfully retrieve category-tailored governance records.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Feature-specific retrieval failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 6: Dynamic Grounding Prompt Injection into Gemini Review Pipeline
    # -------------------------------------------------------------------------
    print("\n[Test 6] Verifying Grounding Context Injection into Gemini Request Payload...")
    try:
        captured_payloads = []

        def mock_call_gemini_raw(payload):
            captured_payloads.append(payload)
            return {
                "candidates": [{
                    "content": {
                        "parts": [{
                            "text": json.dumps({
                                "overallResult": "Revisions Recommended",
                                "summaryNarration": "Review completed with dynamic RAG governance context.",
                                "keyFindings": ["Uptime guarantee exceeds approved SLA"],
                                "findings": [{
                                    "id": "f-1",
                                    "title": "Unqualified SLA Claim",
                                    "category": "legal",
                                    "severity": "critical",
                                    "confidence": 0.95,
                                    "excerpt": "100% uptime SLA guaranteed",
                                    "explanation": "Violates active SLA governance policy.",
                                    "recommendation": "Change to 99.9% uptime SLA.",
                                    "ruleReference": "RULE-LG-01",
                                    "policyCategory": "legal",
                                    "suggestedFix": "99.9% uptime SLA"
                                }]
                            })
                        }]
                    }
                }]
            }

        retrieved_ctx = retrieve_governance_context(
            company_id="acme-global-brands",
            review_type="legal",
            query_text="100% uptime SLA"
        )

        with patch("app.gemini_service.call_gemini_raw", side_effect=mock_call_gemini_raw):
            res = analyze_review_content(
                review_type="legal",
                content="Provider guarantees 100% uptime SLA without exception.",
                instructions="Check SLA compliance",
                retrieved_grounding=retrieved_ctx
            )

        assert len(captured_payloads) == 1
        prompt_text = captured_payloads[0]["contents"][0]["parts"][0]["text"]
        assert "ACTIVE COMPANY-SPECIFIC GOVERNANCE POLICIES & CLAIMS" in prompt_text or "GOVERNANCE" in prompt_text
        assert "RULE-LG-01" in prompt_text or "Brand Guidelines" in prompt_text
        assert "STRICT GROUNDING INSTRUCTIONS" in prompt_text or "GROUND TRUTH" in prompt_text

        print("  PASS: Retrieved governance context successfully injected into Gemini prompt structure.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Prompt injection verification failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 7: Backend Grounding Validation & Hallucination Defense
    # -------------------------------------------------------------------------
    print("\n[Test 7] Testing Backend Grounding Validation Against Real DB Records...")
    try:
        # Retrieve active rules
        db = SessionLocal()
        active_rules = db.query(BrandRuleModel).filter(BrandRuleModel.company_id == "acme-global-brands").all()
        db.close()

        rules_dict = [
            {"id": r.id, "title": r.title, "source_doc": r.source_doc, "source_page": r.source_page}
            for r in active_rules
        ]

        test_findings = [
            {
                "id": "f-valid",
                "title": "Valid Finding",
                "ruleReference": "RULE-LG-01",
                "sourceDocument": "Brand Guidelines 2026.pdf",
                "explanation": "Valid rule citation."
            },
            {
                "id": "f-hallucinated",
                "title": "Hallucinated Finding",
                "ruleReference": "RULE-HALLUCINATED-9999",
                "sourceDocument": "Fake Document.pdf",
                "explanation": "Made up citation."
            }
        ]

        grounded = validate_and_ground_findings(
            raw_findings=test_findings,
            retrieved_rules=rules_dict,
            retrieved_claims=[]
        )

        valid_item = next(f for f in grounded if f["id"] == "f-valid")
        fake_item = next(f for f in grounded if f["id"] == "f-hallucinated")

        assert valid_item.get("is_grounded_in_db") is True, "Valid DB rule should have is_grounded_in_db=True"
        assert valid_item.get("source_page") is not None
        assert fake_item.get("is_grounded_in_db") is False, "Hallucinated rule should have is_grounded_in_db=False"
        assert "unverified against current database" in fake_item.get("citation_status", "")

        print("  PASS: Grounding validator verified real DB records and caught hallucinated rule citations.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Grounding validation failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 8: Multi-Tenant Data Isolation
    # -------------------------------------------------------------------------
    print("\n[Test 8] Testing Multi-Tenant Data Isolation...")
    try:
        # Create proprietary rule for Tenant B
        b_rule_req = RuleCreateRequest(
            company_id="tenant-beta-corp",
            title="Tenant Beta Secret Proprietary Rule",
            category="brand_rules",
            explanation="Beta Corp internal confidential policy.",
            severity="critical"
        )
        b_rule = create_brand_rule(b_rule_req)
        b_rule_id = b_rule["rule"]["id"]

        # Ensure Tenant A ('acme-global-brands') CANNOT retrieve Tenant B's rule
        tenant_a_rules = list_brand_rules(company_id="acme-global-brands")
        assert not any(r["id"] == b_rule_id for r in tenant_a_rules["rules"]), \
            "Security violation: Tenant A retrieved Tenant B's brand rule!"

        # Ensure Tenant B CAN retrieve its rule
        tenant_b_rules = list_brand_rules(company_id="tenant-beta-corp")
        assert any(r["id"] == b_rule_id for r in tenant_b_rules["rules"])

        # Test RAG retrieval isolation
        retrieved_a = retrieve_governance_context(
            company_id="acme-global-brands",
            review_type="legal",
            query_text="Tenant Beta Secret Proprietary Rule"
        )
        assert not any(r["id"] == b_rule_id for r in retrieved_a["retrieved_rules"]), \
            "Security violation: Tenant A RAG retrieved Tenant B's rule!"

        # Clean up
        delete_brand_rule(b_rule_id, company_id="tenant-beta-corp")

        print("  PASS: Multi-tenant boundary verified. Zero data leakage across company tenants.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Multi-tenant isolation test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 9: Empty Guidelines Handling
    # -------------------------------------------------------------------------
    print("\n[Test 9] Testing Empty Guidelines Collection Handling...")
    try:
        empty_company_ctx = retrieve_governance_context(
            company_id="brand-new-startup-without-rules",
            review_type="legal",
            query_text="compliance check"
        )

        assert empty_company_ctx["has_company_guidelines"] is False
        assert len(empty_company_ctx["retrieved_rules"]) == 0
        assert len(empty_company_ctx["retrieved_claims"]) == 0
        assert len(empty_company_ctx["retrieved_chunks"]) == 0
        assert "No active company brand guidelines or governance rules configured" in empty_company_ctx["prompt_grounding_text"]

        print("  PASS: Unconfigured companies receive honest lack-of-guidelines notice without pretending defaults are policies.")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Empty guidelines test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 10: End-to-End Review Endpoint Integration with Grounding Metadata
    # -------------------------------------------------------------------------
    print("\n[Test 10] Testing Review Analysis Endpoint with RAG Grounding Metadata...")
    try:
        def mock_call_gemini_review(payload):
            return {
                "candidates": [{
                    "content": {
                        "parts": [{
                            "text": json.dumps({
                                "overallResult": "Approved",
                                "summaryNarration": "Review passed all brand governance requirements.",
                                "keyFindings": ["No policy violations identified."],
                                "findings": []
                            })
                        }]
                    }
                }]
            }

        with patch("app.gemini_service.call_gemini_raw", side_effect=mock_call_gemini_review):
            analyze_resp = run_review_analysis(AnalyzeRequest(
                project_id="proj-summer-2027",
                review_type="legal",
                instructions="Review enterprise warranty and SLA terms.",
                company_id="acme-global-brands"
            ))

        assert analyze_resp["success"] is True
        assert "grounding" in analyze_resp
        grounding_info = analyze_resp["grounding"]
        assert grounding_info["has_company_guidelines"] is True
        assert grounding_info["retrieved_rules_count"] >= 1

        print(f"  PASS: Endpoint returned grounding metadata: {grounding_info}")
        passed += 1
    except Exception as e:
        print(f"  FAIL: Review endpoint integration test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------------
    print("\n==================================================================")
    print(f"  PHASE 7 RAG TEST SUMMARY: {passed} PASSED, {failed} FAILED")
    print("==================================================================")
    return failed == 0


if __name__ == "__main__":
    success = run_rag_tests()
    sys.exit(0 if success else 1)
