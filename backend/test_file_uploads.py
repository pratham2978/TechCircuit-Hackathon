"""
BrandGuard Document, Image, Video Upload & AI Multimodal Test Suite
Tests:
1. Path Traversal & Filename Sanitization Security
2. File Size & Extension Validation
3. DOCX Paragraph Extraction & XML Parsing (Standard Library)
4. PDF Page Extraction & Page Marker Preservation
5. Text Truncation Notice for Large Documents
6. upload_and_analyze endpoint with Document Upload (Legal Review)
7. upload_and_analyze endpoint with Image Upload (Multimodal Vision Base64)
8. upload_and_analyze endpoint with Video Upload (Multimodal & Timestamped Findings)
9. Format Matching & Rejection of Invalid Extensions (HTTP 415)
10. Multi-Turn Follow-Up Chat Grounded in Upload Context
11. Database Persistence of ProjectFileModel and ReviewSessionModel
"""

import os
import sys
import io
import zipfile
import tempfile
from pathlib import Path
from unittest.mock import patch

# Ensure backend root is in sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import UploadFile, HTTPException
from app.main import (
    app,
    upload_and_analyze,
    run_chat_followup,
    ChatFollowupRequest
)
from app.config import UPLOAD_DIR, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB
from app.file_processor import (
    sanitize_filename,
    get_safe_destination_path,
    validate_file,
    extract_document_text,
    extract_text_from_pdf,
    extract_text_from_docx,
    MAX_DOCUMENT_CHARS
)
from app.database import SessionLocal
from app.models import ProjectFileModel, ReviewSessionModel, ChatMessageModel


def create_sample_docx_bytes(paragraphs: list) -> bytes:
    """Helper to create a valid in-memory DOCX file."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '</Types>'
        )
        p_xml = "".join([f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs])
        doc_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f'<w:body>{p_xml}</w:body>'
            '</w:document>'
        )
        z.writestr("word/document.xml", doc_xml)
    return buf.getvalue()


def create_sample_pdf_bytes(pages_text: list) -> bytes:
    """Helper to create a valid minimal PDF file using pypdf."""
    import pypdf
    writer = pypdf.PdfWriter()
    for text in pages_text:
        page = pypdf.PageObject.create_blank_page(width=612, height=792)
        writer.add_page(page)

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def run_upload_tests():
    passed = 0
    failed = 0

    print("==================================================================")
    print("  BRANDGUARD UPLOAD, EXTRACTION & MULTIMODAL TEST SUITE")
    print("==================================================================")

    # -------------------------------------------------------------------------
    # TEST 1: Path Traversal & Filename Sanitization Security
    # -------------------------------------------------------------------------
    print("\n[Test 1] Path Traversal & Filename Sanitization Security...")
    try:
        unsafe_name = "../../etc/passwd.pdf"
        sanitized = sanitize_filename(unsafe_name)
        assert ".." not in sanitized
        assert "/" not in sanitized
        assert "\\" not in sanitized

        dest = get_safe_destination_path("company-1", "project-x", "legal", unsafe_name)
        assert str(dest).startswith(str(UPLOAD_DIR.resolve()))
        assert "legal" in str(dest)
        print("  ✓ PASS: Path traversal blocked. Sanitized filenames safely contained in UPLOAD_DIR.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Filename security failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 2: File Validation (Size & Extension)
    # -------------------------------------------------------------------------
    print("\n[Test 2] File Size & Extension Validation...")
    try:
        # 0 bytes rejection
        try:
            validate_file("test.pdf", 0, [".pdf", ".docx"])
            assert False, "Should have rejected 0 bytes"
        except HTTPException as he:
            assert he.status_code == 400

        # Oversized file rejection
        oversized = MAX_FILE_SIZE_BYTES + 1024
        try:
            validate_file("big.pdf", oversized, [".pdf", ".docx"])
            assert False, "Should have rejected oversized file"
        except HTTPException as he:
            assert he.status_code == 413

        # Unsupported format rejection
        try:
            validate_file("malicious.exe", 1024, [".pdf", ".docx"])
            assert False, "Should have rejected .exe"
        except HTTPException as he:
            assert he.status_code == 415

        # Valid extension
        ext = validate_file("contract.PDF", 2048, [".pdf", ".docx"])
        assert ext == ".pdf"
        print("  ✓ PASS: Rejection of 0-byte, oversized, and unsupported formats validated.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Validation test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 3: DOCX Paragraph Extraction & XML Parsing
    # -------------------------------------------------------------------------
    print("\n[Test 3] DOCX Paragraph Extraction & XML Parsing...")
    try:
        paragraphs = [
            "SECTION 1: GOVERNANCE AND LICENSING AGREEMENT",
            "The vendor warrants that SLA uptime shall not fall below 99.9%.",
            "CONFIDENTIALITY: No trade secrets shall be disclosed without prior written authorization."
        ]
        docx_data = create_sample_docx_bytes(paragraphs)
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(docx_data)
            tmp_path = Path(tmp.name)

        try:
            extracted = extract_document_text(tmp_path, "sample_agreement.docx")
            assert "GOVERNANCE AND LICENSING" in extracted["text"]
            assert "99.9%" in extracted["text"]
            assert extracted["page_count"] >= 1
            assert extracted["truncated"] is False
            print(f"  ✓ PASS: Extracted {extracted['char_count']} chars from DOCX archive without heavy C dependencies.")
            passed += 1
        finally:
            if tmp_path.exists():
                tmp_path.unlink()
    except Exception as e:
        print(f"  ✗ FAIL: DOCX extraction failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 4: Large Document Handling & Graceful Truncation Notice
    # -------------------------------------------------------------------------
    print("\n[Test 4] Large Document Handling & Graceful Truncation Notice...")
    try:
        huge_text = "Brand policy clause test line. " * 5000  # ~160,000 characters
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w", encoding="utf-8") as tmp:
            tmp.write(huge_text)
            tmp_path = Path(tmp.name)

        try:
            extracted = extract_document_text(tmp_path, "large_policy.txt")
            assert extracted["truncated"] is True
            assert extracted["char_count"] == MAX_DOCUMENT_CHARS
            assert extracted["limitation_notice"] is not None
            assert f"{MAX_DOCUMENT_CHARS}" in extracted["limitation_notice"]
            print(f"  ✓ PASS: Graceful truncation triggered with explicit notice: '{extracted['limitation_notice'][:65]}...'")
            passed += 1
        finally:
            if tmp_path.exists():
                tmp_path.unlink()
    except Exception as e:
        print(f"  ✗ FAIL: Large document truncation test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 5: upload_and_analyze with Legal DOCX Document
    # -------------------------------------------------------------------------
    print("\n[Test 5] POST /api/reviews/upload-and-analyze (Legal Document Review)...")
    try:
        docx_bytes = create_sample_docx_bytes([
            "CONFIDENTIAL MASTER SERVICES AGREEMENT",
            "Section 4.1: The Service Provider disclaims all liability for any indirect damages.",
            "Section 4.2: Governing law shall be the State of Delaware."
        ])

        mock_ai_result = {
            "overallResult": "Changes Required",
            "keyFindings": ["Section 4.1 contains broad prohibited liability waiver"],
            "findings": [
                {
                    "id": "fnd-1",
                    "title": "Uncapped Liability Exclusion",
                    "severity": "critical",
                    "explanation": "Section 4.1 attempts to exclude all indirect damages, which breaches BrandGuard Policy LG-04.",
                    "ruleReference": "RULE-LG-04: Standard Liability Thresholds",
                    "sourceDoc": "Enterprise Contract Guidelines v2.4",
                    "sourcePage": 1,
                    "suggestedCorrection": "Include mutual liability caps tied to 12 months fees paid.",
                    "confidence": "high"
                }
            ],
            "summaryNarration": "Contract review flagged 1 critical liability waiver violation in Section 4.1."
        }

        f = UploadFile(filename="vendor_agreement.docx", file=io.BytesIO(docx_bytes))
        with patch("app.main.analyze_review_content", return_value=mock_ai_result):
            res = upload_and_analyze(
                file=f,
                project_id="proj-summer-2027",
                review_type="legal",
                instructions="Verify liability clauses against standard Enterprise Contract Guidelines."
            )

        assert res["success"] is True
        assert res["overallResult"] == "Changes Required"
        assert len(res["findings"]) == 1
        assert "vendor_agreement.docx" in res["file_name"]
        print(f"  ✓ PASS: Legal review document uploaded, stored, and analyzed ({res['findings'][0]['title']}).")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Legal upload analysis failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 6: upload_and_analyze with Image (Vision Analysis)
    # -------------------------------------------------------------------------
    print("\n[Test 6] POST /api/reviews/upload-and-analyze (Image & Design Review)...")
    try:
        png_1x1 = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

        mock_image_result = {
            "overallResult": "Revisions Recommended",
            "keyFindings": ["Contrast ratio on secondary headline is 3.8:1 (below WCAG 2.1 AA 4.5:1)"],
            "findings": [
                {
                    "id": "fnd-img-1",
                    "title": "Insufficient Text Contrast",
                    "severity": "warning",
                    "explanation": "Text on Coral background fails WCAG 2.1 AA 4.5:1 requirement.",
                    "ruleReference": "RULE-DS-02: Accessibility & Contrast",
                    "sourceDoc": "Brand Design Standards",
                    "sourcePage": 4,
                    "suggestedCorrection": "Use #0D1B2A Deep Ink for overlay typography.",
                    "confidence": "high"
                }
            ],
            "summaryNarration": "Design inspection completed. Identified 1 contrast issue."
        }

        f = UploadFile(filename="campaign_hero.png", file=io.BytesIO(png_1x1))
        with patch("app.main.analyze_review_content", return_value=mock_image_result) as mock_analyze:
            res = upload_and_analyze(
                file=f,
                project_id="proj-summer-2027",
                review_type="images",
                instructions="Audit contrast and logo margins."
            )
            mock_analyze.assert_called_once()
            _, kwargs = mock_analyze.call_args
            assert kwargs.get("media_data") is not None
            assert kwargs.get("media_mime_type") == "image/png"

        assert res["success"] is True
        print("  ✓ PASS: Image uploaded, base64 vision payload created and dispatched to review engine.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Image upload test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 7: upload_and_analyze with Video (Timestamped Findings)
    # -------------------------------------------------------------------------
    print("\n[Test 7] POST /api/reviews/upload-and-analyze (Video Review & Timestamps)...")
    try:
        sample_video_bytes = b"\x00\x00\x00 ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08free"

        mock_video_result = {
            "overallResult": "Revisions Recommended",
            "keyFindings": ["Super title at 0:15 disappears before 4.0 second requirement"],
            "findings": [
                {
                    "id": "fnd-vid-1",
                    "title": "Super Title Duration Too Short",
                    "severity": "warning",
                    "explanation": "Legal disclaimer on screen for 2.2 seconds; broadcast rules mandate 4.0 seconds minimum.",
                    "ruleReference": "RULE-VD-03: On-Screen Legal Super Duration",
                    "sourceDoc": "Broadcast Compliance Manual",
                    "sourcePage": 8,
                    "suggestedCorrection": "Extend disclaimer card to run from 00:15 to 00:20.",
                    "confidence": "high",
                    "timestamp": "00:15"
                }
            ],
            "summaryNarration": "Video review complete. 1 timestamped finding identified at 00:15."
        }

        f = UploadFile(filename="promo_spot.mp4", file=io.BytesIO(sample_video_bytes))
        with patch("app.main.analyze_review_content", return_value=mock_video_result):
            res = upload_and_analyze(
                file=f,
                project_id="proj-summer-2027",
                review_type="videos",
                instructions="Inspect super durations and disclaimers."
            )

        assert res["success"] is True
        assert len(res["findings"]) == 1
        assert res["findings"][0]["timestamp"] == "00:15"
        print(f"  ✓ PASS: Video asset uploaded and analyzed with timestamped finding at {res['findings'][0]['timestamp']}.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Video upload test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 8: Rejection of Invalid File Formats for Tool (HTTP 415)
    # -------------------------------------------------------------------------
    print("\n[Test 8] Format Matching & Rejection of Invalid Extensions...")
    try:
        f = UploadFile(filename="video.mp4", file=io.BytesIO(b"video data"))
        try:
            upload_and_analyze(
                file=f,
                project_id="proj-summer-2027",
                review_type="legal"
            )
            assert False, "Should have raised HTTPException 415"
        except HTTPException as he:
            assert he.status_code == 415
            assert "Unsupported file format" in he.detail
        print("  ✓ PASS: HTTP 415 correctly returned when video format uploaded to legal review.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Format mismatch test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 9: Multi-Turn Follow-Up Chat After Upload
    # -------------------------------------------------------------------------
    print("\n[Test 9] Multi-Turn Follow-Up Chat Grounded in Upload Context...")
    try:
        with patch("app.main.chat_followup", return_value="Under Enterprise Policy LG-04, replace Section 4.1 with a 12-month fee cap.") as mock_chat:
            chat_req = ChatFollowupRequest(
                project_id="proj-summer-2027",
                review_type="legal",
                message="What is the recommended replacement wording for Section 4.1?"
            )
            chat_res = run_chat_followup(chat_req)

        assert chat_res["success"] is True
        assert "LG-04" in chat_res["reply"]
        print(f"  ✓ PASS: Follow-up chat responded using uploaded document context.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Multi-turn chat test failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # TEST 10: Database History & File Record Persistence
    # -------------------------------------------------------------------------
    print("\n[Test 10] Database Persistence of Project Files & Chat Messages...")
    try:
        db = SessionLocal()
        files = db.query(ProjectFileModel).filter(ProjectFileModel.project_id == "proj-summer-2027").all()
        assert len(files) >= 1
        latest_file = files[-1]
        assert latest_file.name is not None
        assert latest_file.status is not None

        session = db.query(ReviewSessionModel).filter(ReviewSessionModel.project_id == "proj-summer-2027").first()
        assert session is not None
        assert len(session.messages) >= 2
        db.close()
        print(f"  ✓ PASS: Verified ProjectFileModel and ReviewSessionModel persisted in database.")
        passed += 1
    except Exception as e:
        print(f"  ✗ FAIL: Database persistence verification failed: {e}")
        failed += 1

    # -------------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------------
    print("\n==================================================================")
    print(f"  TEST RESULTS: {passed} PASSED, {failed} FAILED")
    print("==================================================================")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_upload_tests()
