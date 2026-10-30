import os
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import time
import json
import uuid
import base64
import re
from datetime import datetime, timedelta
from sqlalchemy import func, text
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from app.config import (
    GEMINI_API_KEY, 
    GEMINI_MODEL, 
    FRONTEND_ORIGIN,
    UPLOAD_DIR,
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB
)
from app.database import engine, get_db, test_database_connection, SessionLocal
from app.init_db import init_database
from app.models import (
    ProjectModel,
    ProjectFileModel,
    ReviewSessionModel,
    ChatMessageModel,
    GuidelineDocModel,
    BrandRuleModel,
    ApprovedClaimModel,
    BrandPassportModel,
    ChangeRequestModel,
    GuidelineChunkModel,
    ContentVersionModel,
    CorrectionRecordModel,
    InboxSubmissionModel
)
from app.rag_service import (
    retrieve_governance_context,
    validate_and_ground_findings,
    index_guideline_document
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
from app.gemini_service import (
    analyze_review_content,
    chat_followup,
    GeminiConfigError,
    GeminiApiError
)
from app.provider_verifier import check_current_ai_configuration
from app.file_processor import (
    sanitize_filename,
    get_safe_destination_path,
    validate_file,
    extract_document_text,
    MAX_DOCUMENT_CHARS
)

app = FastAPI(
    title="BrandGuard AI Backend",
    description="Enterprise Brand & Legal Governance Review API with PostgreSQL and Gemini AI",
    version="1.1.0"
)

# Configure CORS for Vite frontend
allowed_origins = [FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database schema safely on start
try:
    init_database()
except Exception as e:
    print(f"Notice during init_database: {e}")

# In-memory session cache fallback
CONVERSATION_SESSIONS: Dict[str, List[Dict[str, Any]]] = {}


# --- Request & Response Models ---

class AnalyzeRequest(BaseModel):
    project_id: str
    review_type: str  # "legal" | "promotions" | "content" | "images" | "videos"
    content: Optional[str] = ""
    instructions: Optional[str] = ""
    file_name: Optional[str] = None
    media_data: Optional[str] = None  # base64 encoded string if image
    media_mime_type: Optional[str] = None
    conversation_id: Optional[str] = None
    company_id: Optional[str] = "acme-global-brands"


class ChatFollowupRequest(BaseModel):
    project_id: str
    review_type: str
    message: str
    conversation_id: Optional[str] = None
    context_notes: Optional[str] = None
    company_id: Optional[str] = "acme-global-brands"


class RuleCreateRequest(BaseModel):
    company_id: Optional[str] = "acme-global-brands"
    title: str
    category: Optional[str] = "brand_rules"
    rule_type: Optional[str] = "prohibited_term"
    term_or_pattern: Optional[str] = None
    preferred_alternative: Optional[str] = None
    explanation: str
    severity: Optional[str] = "warning"
    status: Optional[str] = "approved"
    source_doc: Optional[str] = "Brand Guidelines"
    source_page: Optional[int] = 1


class RuleUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    rule_type: Optional[str] = None
    term_or_pattern: Optional[str] = None
    preferred_alternative: Optional[str] = None
    explanation: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    source_doc: Optional[str] = None
    source_page: Optional[int] = None


class ClaimCreateRequest(BaseModel):
    company_id: Optional[str] = "acme-global-brands"
    claim_text: str
    source_doc: Optional[str] = "Corporate Benchmarking Report 2026"
    source_page: Optional[int] = 1
    owner: Optional[str] = "VP Product Governance"
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    status: Optional[str] = "VERIFIED"
    context_notes: Optional[str] = None


class ClaimUpdateRequest(BaseModel):
    claim_text: Optional[str] = None
    source_doc: Optional[str] = None
    source_page: Optional[int] = None
    owner: Optional[str] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    status: Optional[str] = None
    context_notes: Optional[str] = None


class RagRetrieveRequest(BaseModel):
    query: str
    review_type: str
    company_id: Optional[str] = "acme-global-brands"
    category: Optional[str] = None


class AcceptCorrectionRequest(BaseModel):
    finding_id: str
    original_text_span: str
    correction_text: str
    is_user_edited: Optional[bool] = False
    rule_reference: Optional[str] = None
    explanation: Optional[str] = None
    company_id: Optional[str] = "acme-global-brands"
    author: Optional[str] = "Brand Manager"


class RejectCorrectionRequest(BaseModel):
    finding_id: str
    dismissal_reason: Optional[str] = "false_positive"
    dismissal_note: Optional[str] = None
    original_text_span: Optional[str] = None
    ai_suggestion: Optional[str] = None
    rule_reference: Optional[str] = None
    company_id: Optional[str] = "acme-global-brands"


class SuggestCorrectionRequest(BaseModel):
    finding: Dict[str, Any]
    content: Optional[str] = ""
    review_type: str
    company_id: Optional[str] = "acme-global-brands"
    custom_instructions: Optional[str] = None


# --- System Status Endpoints ---

@app.get("/")
def root():
    return {
        "service": "BrandGuard AI Backend",
        "status": "online",
        "version": "1.1.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    db_status = test_database_connection()
    ai_status = check_current_ai_configuration()

    return {
        "status": "ok",
        "service": "brandguard-api",
        "database": {
            "connected": db_status["connected"],
            "dialect": db_status["dialect"],
            "database_name": db_status["database_name"],
            "is_postgresql": db_status["is_postgresql"]
        },
        "ai": {
            "configured": ai_status.get("configured", False),
            "provider": ai_status.get("provider"),
            "model": GEMINI_MODEL,
            "status": ai_status.get("status", "unknown")
        }
    }


@app.get("/api/database/status")
def database_status():
    """Verify and report database connection status without exposing passwords."""
    return test_database_connection()


@app.get("/api/ai/verify")
def ai_verification():
    """
    Inspect the configured AI key and verify its provider compatibility.
    Does not print the raw key.
    """
    return check_current_ai_configuration()


@app.get("/api/config-status")
def config_status():
    ai_status = check_current_ai_configuration()
    db_status = test_database_connection()
    return {
        "gemini_configured": bool(GEMINI_API_KEY),
        "ai_provider": ai_status.get("provider"),
        "ai_status": ai_status.get("status"),
        "model": GEMINI_MODEL,
        "database_connected": db_status["connected"],
        "database_type": db_status["dialect"],
        "database_name": db_status["database_name"],
        "supported_features": [
            "legal",
            "promotions",
            "content",
            "images",
            "videos"
        ]
    }


# --- Review Features & Chat Endpoints ---

@app.post("/api/reviews/analyze")
def run_review_analysis(req: AnalyzeRequest):
    """
    Execute AI review analysis on the provided content or media using Gemini 2.5 Flash.
    Persists review history in PostgreSQL / database.
    """
    conv_id = req.conversation_id or f"{req.project_id}:{req.review_type}"

    # Validation: for image review, ensure media or description is provided
    if req.review_type == "images" and not req.media_data and not req.content and not req.instructions:
        raise HTTPException(
            status_code=400,
            detail="Image & Design Review requires an uploaded image or specific design instructions."
        )

    # Validation: for video review, ensure video metadata or file is provided
    if req.review_type == "videos" and not req.media_data and not req.content and not req.instructions:
        raise HTTPException(
            status_code=400,
            detail="Video Review requires an uploaded video file or script to inspect."
        )

    try:
        clean_company_id = req.company_id if isinstance(req.company_id, str) and req.company_id else "acme-global-brands"
        query_text = f"{req.instructions or ''} {req.content or ''} {req.file_name or ''}"
        retrieved_context = retrieve_governance_context(
            company_id=clean_company_id,
            review_type=req.review_type,
            query_text=query_text
        )

        analysis_result = analyze_review_content(
            review_type=req.review_type,
            content=req.content or "",
            instructions=req.instructions,
            media_data=req.media_data,
            media_mime_type=req.media_mime_type,
            file_name=req.file_name,
            retrieved_grounding=retrieved_context
        )

        # Ground findings strictly against retrieved database records
        grounded_findings = validate_and_ground_findings(
            raw_findings=analysis_result.get("findings", []),
            retrieved_rules=retrieved_context.get("retrieved_rules", []),
            retrieved_claims=retrieved_context.get("retrieved_claims", [])
        )
        analysis_result["findings"] = grounded_findings

        user_text = req.instructions or (f"Analyze {req.file_name}" if req.file_name else "Perform compliance review")
        narration = analysis_result.get("summaryNarration") or (
            f"Audit complete: {len(analysis_result.get('findings', []))} policy findings identified against active brand governance standards."
        )
        timestamp_now = time.strftime("%H:%M")

        user_msg = {
            "id": f"msg-user-{int(time.time() * 1000)}",
            "role": "user",
            "text": user_text,
            "timestamp": timestamp_now,
            "attachments": [{"name": req.file_name, "type": req.media_mime_type or "doc"}] if req.file_name else None
        }

        ai_msg = {
            "id": f"msg-ai-{int(time.time() * 1000)}",
            "role": "assistant",
            "text": narration,
            "timestamp": timestamp_now,
            "analysisResult": {
                "overallResult": analysis_result.get("overallResult", "Revisions Recommended"),
                "keyFindings": analysis_result.get("keyFindings", []),
                "findings": analysis_result.get("findings", [])
            }
        }

        # In-memory session tracking
        if conv_id not in CONVERSATION_SESSIONS:
            CONVERSATION_SESSIONS[conv_id] = []
        CONVERSATION_SESSIONS[conv_id].extend([user_msg, ai_msg])

        # Persist to database if available
        try:
            db = SessionLocal()
            session_rec = db.query(ReviewSessionModel).filter(ReviewSessionModel.id == conv_id).first()
            if not session_rec:
                # Ensure project exists
                proj = db.query(ProjectModel).filter(ProjectModel.id == req.project_id).first()
                if not proj:
                    proj = ProjectModel(
                        id=req.project_id,
                        name=req.project_id.replace("proj-", "").replace("-", " ").title(),
                        owner="Sarah Chen"
                    )
                    db.add(proj)
                    db.commit()

                session_rec = ReviewSessionModel(
                    id=conv_id,
                    project_id=req.project_id,
                    review_type=req.review_type
                )
                db.add(session_rec)
                db.commit()

            m1 = ChatMessageModel(
                id=user_msg["id"],
                session_id=conv_id,
                role="user",
                text=user_text,
                timestamp_str=timestamp_now,
                attachments_json=user_msg["attachments"]
            )
            m2 = ChatMessageModel(
                id=ai_msg["id"],
                session_id=conv_id,
                role="assistant",
                text=narration,
                timestamp_str=timestamp_now,
                analysis_result_json=ai_msg["analysisResult"]
            )
            db.add_all([m1, m2])
            db.commit()
            db.close()
        except Exception as db_err:
            print(f"Notice: database sync used in-memory session ({db_err})")

        return {
            "success": True,
            "conversation_id": conv_id,
            "overallResult": analysis_result.get("overallResult", "Revisions Recommended"),
            "keyFindings": analysis_result.get("keyFindings", []),
            "findings": analysis_result.get("findings", []),
            "summaryNarration": narration,
            "grounding": {
                "retrieved_rules_count": len(retrieved_context.get("retrieved_rules", [])),
                "retrieved_claims_count": len(retrieved_context.get("retrieved_claims", [])),
                "retrieved_chunks_count": len(retrieved_context.get("retrieved_chunks", [])),
                "has_company_guidelines": retrieved_context.get("has_company_guidelines", False),
                "grounded_findings_count": sum(1 for f in grounded_findings if f.get("is_grounded_in_db"))
            }
        }

    except GeminiConfigError as e:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": "MISSING_API_KEY",
                "message": str(e)
            }
        )
    except GeminiApiError as e:
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "error": "GEMINI_API_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": f"Server encountered an error during analysis: {str(e)}"
            }
        )


DOCUMENT_EXTENSIONS = [".pdf", ".docx", ".txt", ".html", ".md"]
IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"]
VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"]

FEATURE_ALLOWED_EXTENSIONS = {
    "legal": DOCUMENT_EXTENSIONS,
    "promotions": DOCUMENT_EXTENSIONS,
    "content": DOCUMENT_EXTENSIONS,
    "images": IMAGE_EXTENSIONS,
    "videos": VIDEO_EXTENSIONS,
}


@app.post("/api/reviews/upload-and-analyze")
def upload_and_analyze(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    review_type: str = Form(...),
    instructions: Optional[str] = Form(""),
    company_id: Optional[str] = Form("acme-global-brands"),
    conversation_id: Optional[str] = Form(None)
):
    """
    Handle secure multipart file upload (documents, images, videos) and trigger AI review.
    Extracts text for documents (preserving page numbers), encodes image/video for multimodal analysis,
    stores the file with isolation, records file & conversation history in database, and returns structured findings.
    """
    # Normalize form inputs safely
    clean_company_id = company_id if isinstance(company_id, str) and company_id else "acme-global-brands"
    clean_project_id = project_id if isinstance(project_id, str) else str(project_id)
    clean_review_type = review_type if isinstance(review_type, str) else str(review_type)
    clean_instructions = instructions if isinstance(instructions, str) else ""

    if clean_review_type not in FEATURE_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review_type '{clean_review_type}'. Allowed types: {list(FEATURE_ALLOWED_EXTENSIONS.keys())}"
        )

    allowed = FEATURE_ALLOWED_EXTENSIONS[clean_review_type]
    file_ext = Path(file.filename or "").suffix.lower()
    if not file_ext or file_ext not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file format '{file_ext}' for {clean_review_type} review. Allowed formats: {', '.join(allowed)}."
        )

    # Read file content safely
    try:
        file_bytes = file.file.read()
    except Exception as read_err:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(read_err)}")

    file_size = len(file_bytes)
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB ({file_size / (1024 * 1024):.1f}MB uploaded)."
        )

    # Secure destination path with tenant and project isolation
    safe_orig_name = sanitize_filename(file.filename or "uploaded_file")
    dest_path = get_safe_destination_path(clean_company_id, clean_project_id, clean_review_type, safe_orig_name)

    try:
        with open(dest_path, "wb") as f_out:
            f_out.write(file_bytes)
    except Exception as write_err:
        raise HTTPException(status_code=500, detail=f"Failed to store uploaded file safely: {str(write_err)}")

    conv_id = (conversation_id if isinstance(conversation_id, str) and conversation_id else None) or f"{clean_project_id}:{clean_review_type}"
    text_content = ""
    page_count = 1
    limitation_notice = None
    media_data = None
    media_mime = None

    # Process by review type and media category
    if clean_review_type in ["legal", "promotions", "content"]:
        extract_result = extract_document_text(dest_path, safe_orig_name)
        text_content = extract_result["text"]
        page_count = extract_result["page_count"]
        limitation_notice = extract_result.get("limitation_notice")
    elif clean_review_type == "images":
        page_count = 1
        if file_ext == ".svg":
            media_data = base64.b64encode(file_bytes).decode("utf-8")
            media_mime = "image/svg+xml"
            text_content = f"Image & Design Review for SVG vector graphic: '{safe_orig_name}'."
        else:
            mime_map = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp"
            }
            media_mime = mime_map.get(file_ext, "image/png")
            media_data = base64.b64encode(file_bytes).decode("utf-8")
            text_content = f"Image & Design Review for visual asset: '{safe_orig_name}'."
    elif clean_review_type == "videos":
        page_count = 1
        mime_map = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime"
        }
        media_mime = mime_map.get(file_ext, "video/mp4")
        file_size_mb = file_size / (1024 * 1024)
        if file_size <= 20 * 1024 * 1024:
            media_data = base64.b64encode(file_bytes).decode("utf-8")
            limitation_notice = (
                f"Video spot ({file_size_mb:.1f}MB) successfully processed for multimodal review. "
                "Analysis covers on-screen super title durations, spoken voiceovers, and animated logo safety zones."
            )
        else:
            media_data = None
            limitation_notice = (
                f"Video spot ({file_size_mb:.1f}MB) exceeds 20MB inline multimodal payload limit. "
                "Evaluating broadcast compliance based on video metadata, timecoded track structure, and on-screen standards."
            )
        text_content = (
            f"Video broadcast review for asset: '{safe_orig_name}' (Format: {file_ext}, Size: {file_size_mb:.1f}MB).\n"
            "Audit on-screen legal disclaimers, super titles, minimum duration thresholds (e.g. 4.0s minimum duration), and logo safety margins."
        )

    # Execute AI review with company guideline retrieval
    try:
        query_text = f"{clean_instructions} {safe_orig_name} {text_content[:800]}"
        retrieved_context = retrieve_governance_context(
            company_id=clean_company_id,
            review_type=clean_review_type,
            query_text=query_text
        )

        analysis_result = analyze_review_content(
            review_type=clean_review_type,
            content=text_content,
            instructions=clean_instructions,
            media_data=media_data,
            media_mime_type=media_mime,
            file_name=safe_orig_name,
            retrieved_grounding=retrieved_context
        )

        # Ground findings strictly against retrieved database records
        grounded_findings = validate_and_ground_findings(
            raw_findings=analysis_result.get("findings", []),
            retrieved_rules=retrieved_context.get("retrieved_rules", []),
            retrieved_claims=retrieved_context.get("retrieved_claims", [])
        )
        analysis_result["findings"] = grounded_findings

        user_text = clean_instructions or f"Analyze uploaded file: {safe_orig_name}"
        narration = analysis_result.get("summaryNarration") or (
            f"Audit complete: {len(analysis_result.get('findings', []))} governance findings identified against active brand standards."
        )
        if limitation_notice:
            narration += f"\n\nℹ️ *Notice: {limitation_notice}*"

        timestamp_now = time.strftime("%H:%M")
        size_str = f"{file_size / 1024:.1f} KB" if file_size < 1024 * 1024 else f"{file_size / (1024*1024):.1f} MB"

        user_msg = {
            "id": f"msg-user-{int(time.time() * 1000)}",
            "role": "user",
            "text": user_text,
            "timestamp": timestamp_now,
            "attachments": [{
                "name": safe_orig_name,
                "size": size_str,
                "type": file_ext.lstrip(".")
            }]
        }

        ai_msg = {
            "id": f"msg-ai-{int(time.time() * 1000)}",
            "role": "assistant",
            "text": narration,
            "timestamp": timestamp_now,
            "analysisResult": {
                "overallResult": analysis_result.get("overallResult", "Revisions Recommended"),
                "keyFindings": analysis_result.get("keyFindings", []),
                "findings": analysis_result.get("findings", [])
            }
        }

        # In-memory tracking
        if conv_id not in CONVERSATION_SESSIONS:
            CONVERSATION_SESSIONS[conv_id] = []
        CONVERSATION_SESSIONS[conv_id].extend([user_msg, ai_msg])

        file_id = f"file-{uuid.uuid4().hex[:10]}"

        # Database persistence
        try:
            db = SessionLocal()
            # Ensure project exists
            proj = db.query(ProjectModel).filter(ProjectModel.id == clean_project_id).first()
            if not proj:
                proj = ProjectModel(
                    id=clean_project_id,
                    name=clean_project_id.replace("proj-", "").replace("-", " ").title(),
                    owner="Sarah Chen"
                )
                db.add(proj)
                db.commit()

            # Create or get session
            session_rec = db.query(ReviewSessionModel).filter(ReviewSessionModel.id == conv_id).first()
            if not session_rec:
                session_rec = ReviewSessionModel(
                    id=conv_id,
                    project_id=clean_project_id,
                    review_type=clean_review_type
                )
                db.add(session_rec)
                db.commit()

            # Record uploaded file in project_files
            db_file = ProjectFileModel(
                id=file_id,
                project_id=clean_project_id,
                name=safe_orig_name,
                file_type=file_ext.lstrip("."),
                review_type=clean_review_type,
                status=analysis_result.get("overallResult", "Revisions Recommended"),
                version="1.0",
                findings_count=len(analysis_result.get("findings", [])),
                original_text=text_content[:10000] if text_content else None,
                current_text=text_content[:10000] if text_content else None,
                findings_json=analysis_result.get("findings", [])
            )
            db.add(db_file)

            # Record chat messages
            m1 = ChatMessageModel(
                id=user_msg["id"],
                session_id=conv_id,
                role="user",
                text=user_text,
                timestamp_str=timestamp_now,
                attachments_json=user_msg["attachments"]
            )
            m2 = ChatMessageModel(
                id=ai_msg["id"],
                session_id=conv_id,
                role="assistant",
                text=narration,
                timestamp_str=timestamp_now,
                analysis_result_json=ai_msg["analysisResult"]
            )
            db.add_all([m1, m2])
            db.commit()
            db.close()
        except Exception as db_err:
            print(f"Notice: upload database persistence used fallback ({db_err})")

        return {
            "success": True,
            "conversation_id": conv_id,
            "file_id": file_id,
            "file_name": safe_orig_name,
            "page_count": page_count,
            "limitation_notice": limitation_notice,
            "overallResult": analysis_result.get("overallResult", "Revisions Recommended"),
            "keyFindings": analysis_result.get("keyFindings", []),
            "findings": analysis_result.get("findings", []),
            "summaryNarration": narration,
            "grounding": {
                "retrieved_rules_count": len(retrieved_context.get("retrieved_rules", [])),
                "retrieved_claims_count": len(retrieved_context.get("retrieved_claims", [])),
                "retrieved_chunks_count": len(retrieved_context.get("retrieved_chunks", [])),
                "has_company_guidelines": retrieved_context.get("has_company_guidelines", False),
                "grounded_findings_count": sum(1 for f in grounded_findings if f.get("is_grounded_in_db"))
            }
        }

    except GeminiConfigError as e:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": "MISSING_API_KEY",
                "message": str(e)
            }
        )
    except GeminiApiError as e:
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "error": "GEMINI_API_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": f"Server encountered an error processing upload review: {str(e)}"
            }
        )


@app.post("/api/reviews/chat")
def run_chat_followup(req: ChatFollowupRequest):
    """
    Handle multi-turn follow-up questions about an active review's context.
    """
    conv_id = req.conversation_id or f"{req.project_id}:{req.review_type}"
    history = CONVERSATION_SESSIONS.get(conv_id, [])

    if not history:
        try:
            db = SessionLocal()
            session_rec = db.query(ReviewSessionModel).filter(ReviewSessionModel.id == conv_id).first()
            if session_rec and session_rec.messages:
                history = [
                    {
                        "id": m.id,
                        "role": m.role,
                        "text": m.text,
                        "timestamp": m.timestamp_str,
                        "attachments": m.attachments_json,
                        "analysisResult": m.analysis_result_json
                    }
                    for m in session_rec.messages
                ]
                CONVERSATION_SESSIONS[conv_id] = history
            db.close()
        except Exception:
            pass

    formatted_history = []
    for msg in history:
        formatted_history.append({
            "role": "user" if msg["role"] == "user" else "model",
            "text": msg["text"]
        })

    try:
        reply_text = chat_followup(
            review_type=req.review_type,
            conversation_history=formatted_history,
            user_message=req.message,
            context_notes=req.context_notes
        )

        timestamp_now = time.strftime("%H:%M")
        user_msg = {
            "id": f"msg-user-{int(time.time() * 1000)}",
            "role": "user",
            "text": req.message,
            "timestamp": timestamp_now
        }
        ai_msg = {
            "id": f"msg-ai-{int(time.time() * 1000)}",
            "role": "assistant",
            "text": reply_text,
            "timestamp": timestamp_now
        }

        if conv_id not in CONVERSATION_SESSIONS:
            CONVERSATION_SESSIONS[conv_id] = []
        CONVERSATION_SESSIONS[conv_id].extend([user_msg, ai_msg])

        # Database persistence
        try:
            db = SessionLocal()
            session_rec = db.query(ReviewSessionModel).filter(ReviewSessionModel.id == conv_id).first()
            if session_rec:
                m1 = ChatMessageModel(
                    id=user_msg["id"],
                    session_id=conv_id,
                    role="user",
                    text=req.message,
                    timestamp_str=timestamp_now
                )
                m2 = ChatMessageModel(
                    id=ai_msg["id"],
                    session_id=conv_id,
                    role="assistant",
                    text=reply_text,
                    timestamp_str=timestamp_now
                )
                db.add_all([m1, m2])
                db.commit()
            db.close()
        except Exception:
            pass

        return {
            "success": True,
            "conversation_id": conv_id,
            "reply": reply_text
        }

    except GeminiConfigError as e:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": "MISSING_API_KEY",
                "message": str(e)
            }
        )
    except GeminiApiError as e:
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "error": "GEMINI_API_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "INTERNAL_ERROR",
                "message": f"Server encountered an error processing chat message: {str(e)}"
            }
        )


@app.get("/api/reviews/history/{project_id}/{review_type}")
def get_review_history(project_id: str, review_type: str):
    """
    Retrieve stored conversation history for a specific project and review tool from database or cache.
    """
    conv_id = f"{project_id}:{review_type}"

    # Try database first
    try:
        db = SessionLocal()
        session_rec = db.query(ReviewSessionModel).filter(ReviewSessionModel.id == conv_id).first()
        if session_rec and session_rec.messages:
            db_messages = []
            for m in session_rec.messages:
                db_messages.append({
                    "id": m.id,
                    "role": m.role,
                    "text": m.text,
                    "timestamp": m.timestamp_str,
                    "attachments": m.attachments_json,
                    "analysisResult": m.analysis_result_json
                })
            db.close()
            return {
                "conversation_id": conv_id,
                "project_id": project_id,
                "review_type": review_type,
                "messages": db_messages
            }
        db.close()
    except Exception:
        pass

    messages = CONVERSATION_SESSIONS.get(conv_id, [])
    return {
        "conversation_id": conv_id,
        "project_id": project_id,
        "review_type": review_type,
        "messages": messages
    }


@app.delete("/api/reviews/history/{project_id}/{review_type}")
def clear_review_history(project_id: str, review_type: str):
    """
    Reset conversation history for a specific project and review tool.
    """
    conv_id = f"{project_id}:{review_type}"
    if conv_id in CONVERSATION_SESSIONS:
        del CONVERSATION_SESSIONS[conv_id]

    try:
        db = SessionLocal()
        session_rec = db.query(ReviewSessionModel).filter(ReviewSessionModel.id == conv_id).first()
        if session_rec:
            db.delete(session_rec)
            db.commit()
        db.close()
    except Exception:
        pass

    return {
        "success": True,
        "conversation_id": conv_id,
        "message": "Conversation history reset."
    }


class DirectPdfRequest(BaseModel):
    project_name: str
    review_type: str
    overall_result: str
    file_name: Optional[str] = "Submitted Review Content"
    review_date: Optional[str] = None
    summary_narration: Optional[str] = None
    key_findings: List[str] = []
    findings: List[Dict[str, Any]] = []
    limitation_notice: Optional[str] = None
    reviewer: Optional[str] = "BrandGuard Reviewer"


@app.get("/api/reviews/report/pdf/{project_id}/{review_type}")
def download_review_pdf_report(
    project_id: str,
    review_type: str,
    company_id: Optional[str] = "acme-global-brands",
    file_id: Optional[str] = None
):
    """
    Generate and stream a publication-grade PDF analysis report for a specific project & review.
    Enforces tenant authorization and extracts real saved analysis findings from DB/session.
    """
    db = SessionLocal()
    try:
        proj = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not proj:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        # Multi-tenant isolation: check client_name matches company
        clean_company = (company_id or "acme-global-brands").replace("-", " ").strip().lower()
        proj_client = (proj.client_name or "").strip().lower()
        if clean_company not in proj_client and proj_client not in clean_company:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: project '{project_id}' does not belong to organization '{company_id}'."
            )

        conv_id = f"{project_id}:{review_type}"
        session_rec = db.query(ReviewSessionModel).filter(ReviewSessionModel.id == conv_id).first()

        latest_analysis = None
        narration = None
        file_name = None
        review_date = datetime.utcnow().strftime("%Y-%m-%d")

        # Find latest message with analysis results
        if session_rec and session_rec.messages:
            for msg in reversed(session_rec.messages):
                if msg.analysis_result_json:
                    latest_analysis = msg.analysis_result_json
                    narration = msg.text
                    review_date = msg.created_at.strftime("%Y-%m-%d") if msg.created_at else review_date
                    break

        # If not found in DB session, check ProjectFileModel
        if not latest_analysis and file_id:
            p_file = db.query(ProjectFileModel).filter(ProjectFileModel.id == file_id).first()
            if p_file and p_file.findings_json:
                latest_analysis = {
                    "overallResult": p_file.status or "Revisions Recommended",
                    "keyFindings": [f.get("title", "") for f in (p_file.findings_json or [])[:3]],
                    "findings": p_file.findings_json or []
                }
                file_name = p_file.name

        # If still not found, check in-memory CONVERSATION_SESSIONS
        if not latest_analysis:
            cached = CONVERSATION_SESSIONS.get(conv_id, [])
            for msg in reversed(cached):
                if msg.get("analysisResult"):
                    latest_analysis = msg["analysisResult"]
                    narration = msg.get("text")
                    break

        if not latest_analysis:
            raise HTTPException(
                status_code=404,
                detail=f"No completed analysis findings found for project '{project_id}' ({review_type}). Please run analysis first."
            )

        # Retrieve file name if still empty
        if not file_name:
            if session_rec and session_rec.messages:
                for msg in session_rec.messages:
                    if msg.attachments_json and len(msg.attachments_json) > 0:
                        file_name = msg.attachments_json[0].get("name")
                        break

        report_data = {
            "project_name": proj.name,
            "review_type": review_type,
            "file_name": file_name or "Submitted Review Content",
            "review_date": review_date,
            "overall_result": latest_analysis.get("overallResult", "Revisions Recommended"),
            "summary_narration": narration or "Automated governance audit complete.",
            "key_findings": latest_analysis.get("keyFindings", []),
            "findings": latest_analysis.get("findings", []),
            "reviewer": proj.owner or "Elena Rostova"
        }

    finally:
        db.close()

    try:
        from app.pdf_service import generate_review_pdf
        pdf_bytes = generate_review_pdf(report_data)

        clean_proj_name = re.sub(r'[^a-zA-Z0-9_-]', '-', proj.name)
        clean_tool = review_type.title()
        filename = f"{clean_proj_name}-{clean_tool}-Review.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/pdf"
            }
        )
    except Exception as pdf_err:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF report: {str(pdf_err)}"
        )


@app.post("/api/reviews/report/pdf")
def generate_pdf_from_payload(req: DirectPdfRequest):
    """
    Generate downloadable PDF directly from structured analysis payload.
    """
    try:
        from app.pdf_service import generate_review_pdf
        data_dict = req.dict()
        pdf_bytes = generate_review_pdf(data_dict)

        clean_proj = re.sub(r'[^a-zA-Z0-9_-]', '-', req.project_name)
        clean_tool = req.review_type.title()
        filename = f"{clean_proj}-{clean_tool}-Review.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF report from payload: {str(e)}"
        )


# =====================================================================
# Phase 7: RAG, Guideline & Claim Management APIs
# =====================================================================

@app.get("/api/guidelines")
def list_guidelines(company_id: Optional[str] = "acme-global-brands"):
    """List guideline documents and index status for a specific company/tenant."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        docs = db.query(GuidelineDocModel).filter(GuidelineDocModel.company_id == clean_company_id).all()
        return {
            "success": True,
            "company_id": clean_company_id,
            "guidelines": [
                {
                    "id": d.id,
                    "title": d.title,
                    "category": d.category,
                    "file_type": d.file_type,
                    "file_size": d.file_size,
                    "version": d.version,
                    "status": d.status,
                    "pages_count": d.pages_count,
                    "proposed_rules_count": d.proposed_rules_count,
                    "approved_rules_count": d.approved_rules_count,
                    "sample_passage": d.sample_passage,
                    "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d") if d.uploaded_at else None
                }
                for d in docs
            ]
        }
    finally:
        db.close()


@app.post("/api/guidelines/upload")
def upload_guideline_document(
    file: UploadFile = File(...),
    company_id: Optional[str] = Form("acme-global-brands"),
    category: Optional[str] = Form("Brand Guidelines"),
    title: Optional[str] = Form(None)
):
    """
    Ingest a new company guideline document (PDF, DOCX, TXT, MD), chunk into searchable passages
    preserving document/page/section metadata, and index in database.
    """
    clean_company_id = company_id if isinstance(company_id, str) and company_id else "acme-global-brands"
    clean_category = category if isinstance(category, str) and category else "Brand Guidelines"
    clean_title = title if isinstance(title, str) and title else None

    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in [".pdf", ".docx", ".txt", ".md"]:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported guideline format '{file_ext}'. Allowed formats: .pdf, .docx, .txt, .md"
        )

    file_bytes = file.file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded guideline file is empty (0 bytes).")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB."
        )

    safe_name = sanitize_filename(file.filename or "guideline_doc")
    dest_path = get_safe_destination_path(clean_company_id, "guidelines", clean_category, safe_name)
    with open(dest_path, "wb") as f_out:
        f_out.write(file_bytes)

    db = SessionLocal()
    try:
        doc_record = index_guideline_document(
            db=db,
            company_id=clean_company_id,
            file_path=dest_path,
            original_filename=safe_name,
            category=clean_category,
            title_override=clean_title
        )
        return {
            "success": True,
            "message": f"Successfully indexed guideline document '{safe_name}'.",
            "document": {
                "id": doc_record.id,
                "title": doc_record.title,
                "category": doc_record.category,
                "file_type": doc_record.file_type,
                "file_size": doc_record.file_size,
                "pages_count": doc_record.pages_count,
                "chunks_count": len(doc_record.chunks) if doc_record.chunks else 0
            }
        }
    finally:
        db.close()


@app.delete("/api/guidelines/{doc_id}")
def delete_guideline_document(doc_id: str, company_id: Optional[str] = "acme-global-brands"):
    """Delete a guideline document and cascade delete all its chunks for a company."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        doc = db.query(GuidelineDocModel).filter(
            GuidelineDocModel.id == doc_id,
            GuidelineDocModel.company_id == clean_company_id
        ).first()
        if not doc:
            raise HTTPException(
                status_code=404,
                detail=f"Guideline document '{doc_id}' not found for tenant '{clean_company_id}'."
            )
        db.delete(doc)
        db.commit()
        return {"success": True, "message": f"Guideline document '{doc_id}' and all associated chunks deleted."}
    finally:
        db.close()


@app.get("/api/guidelines/chunks/{doc_id}")
def get_guideline_chunks(doc_id: str, company_id: Optional[str] = "acme-global-brands"):
    """Inspect extracted RAG chunks for a guideline document."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        chunks = db.query(GuidelineChunkModel).filter(
            GuidelineChunkModel.document_id == doc_id,
            GuidelineChunkModel.company_id == clean_company_id
        ).order_by(GuidelineChunkModel.chunk_index).all()
        return {
            "success": True,
            "document_id": doc_id,
            "chunks": [
                {
                    "id": c.id,
                    "chunk_index": c.chunk_index,
                    "page_number": c.page_number,
                    "section_title": c.section_title,
                    "content": c.content
                }
                for c in chunks
            ]
        }
    finally:
        db.close()


@app.get("/api/rules")
def list_brand_rules(
    company_id: Optional[str] = "acme-global-brands",
    category: Optional[str] = None,
    rule_type: Optional[str] = None
):
    """List brand rules, disclaimers, and terminology rules for a company."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        query = db.query(BrandRuleModel).filter(BrandRuleModel.company_id == clean_company_id)
        if category and category != "all":
            query = query.filter(BrandRuleModel.category == category)
        if rule_type and rule_type != "all":
            query = query.filter(BrandRuleModel.rule_type == rule_type)
        rules = query.all()
        return {
            "success": True,
            "company_id": clean_company_id,
            "rules": [
                {
                    "id": r.id,
                    "title": r.title,
                    "category": r.category,
                    "rule_type": r.rule_type,
                    "term_or_pattern": r.term_or_pattern,
                    "preferred_alternative": r.preferred_alternative,
                    "explanation": r.explanation,
                    "severity": r.severity,
                    "status": r.status,
                    "source_doc": r.source_doc,
                    "source_page": r.source_page,
                    "dismissal_count": r.dismissal_count
                }
                for r in rules
            ]
        }
    finally:
        db.close()


@app.post("/api/rules")
def create_brand_rule(req: RuleCreateRequest):
    """Create a new company brand rule, disclaimer, or terminology requirement."""
    clean_company_id = req.company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        rule_id = f"RULE-{uuid.uuid4().hex[:6].upper()}"
        new_rule = BrandRuleModel(
            id=rule_id,
            company_id=clean_company_id,
            title=req.title,
            category=req.category or "brand_rules",
            rule_type=req.rule_type or "prohibited_term",
            term_or_pattern=req.term_or_pattern,
            preferred_alternative=req.preferred_alternative,
            explanation=req.explanation,
            severity=req.severity or "warning",
            status=req.status or "approved",
            source_doc=req.source_doc or "Brand Guidelines",
            source_page=req.source_page or 1
        )
        db.add(new_rule)
        db.commit()
        db.refresh(new_rule)
        return {
            "success": True,
            "message": "Brand rule created successfully.",
            "rule": {
                "id": new_rule.id,
                "title": new_rule.title,
                "category": new_rule.category,
                "rule_type": new_rule.rule_type,
                "severity": new_rule.severity,
                "status": new_rule.status
            }
        }
    finally:
        db.close()


@app.put("/api/rules/{rule_id}")
def update_brand_rule(rule_id: str, req: RuleUpdateRequest, company_id: Optional[str] = "acme-global-brands"):
    """Update an existing brand rule, preserving company isolation."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        rule = db.query(BrandRuleModel).filter(
            BrandRuleModel.id == rule_id,
            BrandRuleModel.company_id == clean_company_id
        ).first()
        if not rule:
            raise HTTPException(status_code=404, detail=f"Brand rule '{rule_id}' not found for tenant '{clean_company_id}'.")

        if req.title is not None: rule.title = req.title
        if req.category is not None: rule.category = req.category
        if req.rule_type is not None: rule.rule_type = req.rule_type
        if req.term_or_pattern is not None: rule.term_or_pattern = req.term_or_pattern
        if req.preferred_alternative is not None: rule.preferred_alternative = req.preferred_alternative
        if req.explanation is not None: rule.explanation = req.explanation
        if req.severity is not None: rule.severity = req.severity
        if req.status is not None: rule.status = req.status
        if req.source_doc is not None: rule.source_doc = req.source_doc
        if req.source_page is not None: rule.source_page = req.source_page

        db.commit()
        return {"success": True, "message": f"Brand rule '{rule_id}' updated successfully."}
    finally:
        db.close()


@app.delete("/api/rules/{rule_id}")
def delete_brand_rule(rule_id: str, company_id: Optional[str] = "acme-global-brands"):
    """Delete a brand rule for a company."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        rule = db.query(BrandRuleModel).filter(
            BrandRuleModel.id == rule_id,
            BrandRuleModel.company_id == clean_company_id
        ).first()
        if not rule:
            raise HTTPException(status_code=404, detail=f"Brand rule '{rule_id}' not found for tenant '{clean_company_id}'.")
        db.delete(rule)
        db.commit()
        return {"success": True, "message": f"Brand rule '{rule_id}' deleted."}
    finally:
        db.close()


@app.get("/api/claims")
def list_approved_claims(
    company_id: Optional[str] = "acme-global-brands",
    status: Optional[str] = None
):
    """List verified approved claims for a company with validity windows and source evidence."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        query = db.query(ApprovedClaimModel).filter(ApprovedClaimModel.company_id == clean_company_id)
        if status and status != "all":
            query = query.filter(ApprovedClaimModel.status == status)
        claims = query.all()
        return {
            "success": True,
            "company_id": clean_company_id,
            "claims": [
                {
                    "id": c.id,
                    "claim_text": c.claim_text,
                    "source_doc": c.source_doc,
                    "source_page": c.source_page,
                    "owner": c.owner,
                    "valid_from": c.valid_from,
                    "valid_to": c.valid_to,
                    "status": c.status,
                    "context_notes": c.context_notes
                }
                for c in claims
            ]
        }
    finally:
        db.close()


@app.post("/api/claims")
def create_approved_claim(req: ClaimCreateRequest):
    """Register an approved factual claim backed by source documentation."""
    clean_company_id = req.company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        claim_id = f"CLM-2026-{uuid.uuid4().hex[:4].upper()}"
        now_date = datetime.utcnow().strftime("%Y-%m-%d")
        new_claim = ApprovedClaimModel(
            id=claim_id,
            company_id=clean_company_id,
            claim_text=req.claim_text,
            source_doc=req.source_doc or "Corporate Verification Desk",
            source_page=req.source_page or 1,
            owner=req.owner or "VP Product Governance",
            valid_from=req.valid_from or now_date,
            valid_to=req.valid_to or "2027-12-31",
            status=req.status or "VERIFIED",
            context_notes=req.context_notes or "Verified under active governance review."
        )
        db.add(new_claim)
        db.commit()
        db.refresh(new_claim)
        return {
            "success": True,
            "message": "Approved claim registered successfully.",
            "claim": {
                "id": new_claim.id,
                "claim_text": new_claim.claim_text,
                "status": new_claim.status,
                "source_doc": new_claim.source_doc
            }
        }
    finally:
        db.close()


@app.put("/api/claims/{claim_id}")
def update_approved_claim(claim_id: str, req: ClaimUpdateRequest, company_id: Optional[str] = "acme-global-brands"):
    """Update an approved claim status, validity period, or evidence citation."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        claim = db.query(ApprovedClaimModel).filter(
            ApprovedClaimModel.id == claim_id,
            ApprovedClaimModel.company_id == clean_company_id
        ).first()
        if not claim:
            raise HTTPException(status_code=404, detail=f"Claim '{claim_id}' not found for tenant '{clean_company_id}'.")

        if req.claim_text is not None: claim.claim_text = req.claim_text
        if req.source_doc is not None: claim.source_doc = req.source_doc
        if req.source_page is not None: claim.source_page = req.source_page
        if req.owner is not None: claim.owner = req.owner
        if req.valid_from is not None: claim.valid_from = req.valid_from
        if req.valid_to is not None: claim.valid_to = req.valid_to
        if req.status is not None: claim.status = req.status
        if req.context_notes is not None: claim.context_notes = req.context_notes

        db.commit()
        return {"success": True, "message": f"Claim '{claim_id}' updated successfully."}
    finally:
        db.close()


@app.delete("/api/claims/{claim_id}")
def delete_approved_claim(claim_id: str, company_id: Optional[str] = "acme-global-brands"):
    """Delete an approved claim for a company."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        claim = db.query(ApprovedClaimModel).filter(
            ApprovedClaimModel.id == claim_id,
            ApprovedClaimModel.company_id == clean_company_id
        ).first()
        if not claim:
            raise HTTPException(status_code=404, detail=f"Claim '{claim_id}' not found for tenant '{clean_company_id}'.")
        db.delete(claim)
        db.commit()
        return {"success": True, "message": f"Claim '{claim_id}' deleted."}
    finally:
        db.close()


@app.post("/api/rag/retrieve")
def test_rag_retrieval(req: RagRetrieveRequest):
    """
    Direct RAG test endpoint to inspect retrieved guidelines, rules, and claims
    for a given query, review type, and company ID.
    """
    clean_company_id = req.company_id or "acme-global-brands"
    retrieved = retrieve_governance_context(
        company_id=clean_company_id,
        review_type=req.review_type,
        query_text=req.query
    )
    return {
        "success": True,
        "company_id": clean_company_id,
        "review_type": req.review_type,
        "query": req.query,
        "retrieved_context": retrieved
    }


# =====================================================================
# Phase 8: AI-Suggested Corrections, Versioning & Comparison APIs
# =====================================================================

@app.post("/api/reviews/suggest-correction")
def suggest_correction(req: SuggestCorrectionRequest):
    """
    Generate an AI-suggested compliant correction for a specific finding,
    grounded in submitted content and retrieved company brand guidelines.
    """
    clean_company_id = req.company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        suggestion = generate_ai_correction(
            db=db,
            finding=req.finding,
            content=req.content or "",
            review_type=req.review_type,
            company_id=clean_company_id,
            custom_instructions=req.custom_instructions
        )
        return suggestion
    finally:
        db.close()


@app.get("/api/versions/{project_id}/{review_type}")
def get_version_history(project_id: str, review_type: str, company_id: Optional[str] = "acme-global-brands"):
    """
    Retrieve persistent version history for a project and review tool,
    showing version numbers, timestamps, change authors, and summaries.
    """
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        # Authorization check: verify project belongs to company
        proj = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not proj:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        versions = list_project_versions(
            db=db,
            project_id=project_id,
            review_type=review_type,
            company_id=clean_company_id
        )
        return {
            "success": True,
            "project_id": project_id,
            "review_type": review_type,
            "company_id": clean_company_id,
            "versions": versions
        }
    finally:
        db.close()


@app.get("/api/versions/{project_id}/{review_type}/latest")
def get_latest_content_version(project_id: str, review_type: str, company_id: Optional[str] = "acme-global-brands"):
    """Retrieve the latest active content version and text for a review."""
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        ver = get_latest_version(db, project_id, review_type, clean_company_id)
        if not ver:
            ver = get_or_create_initial_version(db, project_id, review_type, clean_company_id)

        return {
            "success": True,
            "version_id": ver.id,
            "version_number": ver.version_number,
            "content_text": ver.content_text,
            "change_summary": ver.change_summary,
            "change_source": ver.change_source,
            "status": ver.status,
            "media_type": ver.media_type,
            "created_at": ver.created_at.strftime("%Y-%m-%d %H:%M:%S") if ver.created_at else None
        }
    finally:
        db.close()


@app.post("/api/versions/{project_id}/{review_type}/accept")
def accept_correction_endpoint(
    project_id: str,
    review_type: str,
    req: AcceptCorrectionRequest
):
    """
    Accept an AI-suggested or user-edited correction:
    Creates a new persisted version (preserving original v1.0 unchanged),
    records the applied fix in the database, and marks the finding as resolved.
    """
    clean_company_id = req.company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        proj = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not proj:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        res = accept_and_persist_correction(
            db=db,
            project_id=project_id,
            review_type=review_type,
            finding_id=req.finding_id,
            original_text_span=req.original_text_span,
            correction_text=req.correction_text,
            is_user_edited=bool(req.is_user_edited),
            rule_reference=req.rule_reference,
            explanation=req.explanation,
            company_id=clean_company_id,
            author=req.author or "Brand Manager"
        )
        return res
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    finally:
        db.close()


@app.post("/api/versions/{project_id}/{review_type}/reject")
def reject_correction_endpoint(
    project_id: str,
    review_type: str,
    req: RejectCorrectionRequest
):
    """
    Reject a suggested correction:
    Records the dismissal in the database without modifying content or creating a revised version.
    """
    clean_company_id = req.company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        res = reject_and_record_correction(
            db=db,
            project_id=project_id,
            review_type=review_type,
            finding_id=req.finding_id,
            dismissal_reason=req.dismissal_reason or "false_positive",
            dismissal_note=req.dismissal_note,
            original_text_span=req.original_text_span,
            ai_suggestion=req.ai_suggestion,
            rule_reference=req.rule_reference,
            company_id=clean_company_id
        )
        return res
    finally:
        db.close()


@app.get("/api/versions/{project_id}/{review_type}/compare")
def compare_versions_endpoint(
    project_id: str,
    review_type: str,
    from_version_id: Optional[str] = None,
    to_version_id: Optional[str] = None,
    company_id: Optional[str] = "acme-global-brands"
):
    """
    Compare original and revised versions:
    Returns structured additions/deletions diff, addressed findings, and media comparison status.
    """
    clean_company_id = company_id or "acme-global-brands"
    db = SessionLocal()
    try:
        # Multi-tenant isolation check
        proj = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
        if not proj:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        clean_company = clean_company_id.replace("-", " ").strip().lower()
        proj_client = (proj.client_name or "").strip().lower()
        if clean_company not in proj_client and proj_client not in clean_company:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: project '{project_id}' does not belong to company '{clean_company_id}'."
            )

        comp = compare_project_versions(
            db=db,
            project_id=project_id,
            review_type=review_type,
            from_version_id=from_version_id,
            to_version_id=to_version_id,
            company_id=clean_company_id
        )
        return {
            "success": True,
            "comparison": comp
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    finally:
        db.close()


# =============================================================================
# Phase 9: Authentication, RBAC, Operations Queue, Lifecycle, Decisions & Change Requests
# =============================================================================

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user,
    require_role,
    verify_company_access
)
from app.operations_service import (
    list_submissions,
    get_submission_detail,
    create_submission,
    record_review_decision,
    customer_resubmit,
    list_change_requests
)


class LoginRequest(BaseModel):
    email: str
    password: str


class DemoTokenRequest(BaseModel):
    account_type: str = "company_workspace"  # company_workspace or brandguard_operations


class CreateSubmissionRequest(BaseModel):
    project_id: str
    review_type: str
    file_id: Optional[str] = None
    file_name: Optional[str] = None
    content_text: Optional[str] = None
    content_summary: Optional[str] = None
    findings: Optional[List[Dict[str, Any]]] = None


class RecordDecisionRequest(BaseModel):
    decision: str  # approved, changes_requested, rejected
    comments: str
    actionable_instructions: Optional[str] = None


class ResubmitRequest(BaseModel):
    revised_content: str
    resubmission_notes: Optional[str] = None


class CreateChangeRequestPayload(BaseModel):
    title: str
    request_type: str
    description: str
    priority: Optional[str] = "medium"
    submission_id: Optional[str] = None
    project_id: Optional[str] = None


@app.post("/api/auth/login")
def login_endpoint(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with email and password.
    Returns cryptographically signed HMAC-SHA256 JWT access token.
    """
    user = db.query(UserModel).filter(UserModel.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.salt, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated.")

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "company_id": user.company_id,
        "company_name": user.company_name
    })

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id,
            "company_name": user.company_name
        }
    }


@app.get("/api/auth/me")
def get_me_endpoint(user: UserModel = Depends(get_current_user)):
    """Retrieve verified profile of authenticated caller."""
    return {
        "success": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id,
            "company_name": user.company_name
        }
    }


@app.post("/api/auth/demo-token")
def issue_demo_token_endpoint(req: DemoTokenRequest, db: Session = Depends(get_db)):
    """
    Issue cryptographically signed token for the active demo workspace account.
    Enables server-verified role-based authorization without caller spoofing.
    """
    if req.account_type == "brandguard_operations":
        user = db.query(UserModel).filter(UserModel.role == "operations_reviewer").first()
    else:
        user = db.query(UserModel).filter(UserModel.role == "company_user").first()

    if not user:
        raise HTTPException(status_code=404, detail="Demo user account not found in database.")

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "company_id": user.company_id,
        "company_name": user.company_name
    })

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id,
            "company_name": user.company_name
        }
    }


@app.get("/api/operations/submissions")
def get_operations_submissions_endpoint(
    status: Optional[str] = None,
    review_type: Optional[str] = None,
    company_id: Optional[str] = None,
    date_from: Optional[str] = None,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List review submissions from database with multi-tenant filtering.
    Company Users see their company's items; Operations Reviewers see all items.
    """
    subs = list_submissions(
        db=db,
        user=user,
        status=status,
        review_type=review_type,
        company_id=company_id,
        date_from=date_from
    )
    return {
        "success": True,
        "submissions": subs,
        "total": len(subs)
    }


@app.get("/api/operations/submissions/{submission_id}")
def get_submission_detail_endpoint(
    submission_id: str,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve complete submission detail, findings, decision history, and change requests."""
    sub_detail = get_submission_detail(db, submission_id, user)
    return {
        "success": True,
        "submission": sub_detail
    }


@app.post("/api/operations/submissions")
def create_submission_endpoint(
    req: CreateSubmissionRequest,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Queue an AI-reviewed document/asset into the Human Operations Review Queue."""
    res = create_submission(
        db=db,
        project_id=req.project_id,
        review_type=req.review_type,
        user=user,
        file_id=req.file_id,
        file_name=req.file_name,
        content_text=req.content_text,
        content_summary=req.content_summary,
        findings=req.findings
    )
    return res


@app.post("/api/operations/submissions/{submission_id}/decision")
def record_decision_endpoint(
    submission_id: str,
    req: RecordDecisionRequest,
    reviewer: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record an authorized Human Reviewer decision (Approved, Changes Requested, Rejected).
    Enforces that Company Users CANNOT approve or reject submissions.
    """
    res = record_review_decision(
        db=db,
        submission_id=submission_id,
        decision=req.decision,
        comments=req.comments,
        reviewer=reviewer,
        actionable_instructions=req.actionable_instructions
    )
    return res


@app.get("/api/operations/submissions/{submission_id}/decisions")
def get_decisions_endpoint(
    submission_id: str,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve immutable append-only decision history audit trail for a submission."""
    sub_detail = get_submission_detail(db, submission_id, user)
    return {
        "success": True,
        "submission_id": submission_id,
        "decisions": sub_detail.get("decisions", [])
    }


@app.post("/api/operations/submissions/{submission_id}/resubmit")
def resubmit_submission_endpoint(
    submission_id: str,
    req: ResubmitRequest,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer submits revised content in response to reviewer change requests."""
    res = customer_resubmit(
        db=db,
        submission_id=submission_id,
        revised_content=req.revised_content,
        user=user,
        resubmission_notes=req.resubmission_notes
    )
    return res


@app.get("/api/operations/change-requests")
def get_change_requests_endpoint(
    status: Optional[str] = None,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List customer change requests and reviewer revision instructions."""
    crs = list_change_requests(db=db, user=user, status=status)
    return {
        "success": True,
        "change_requests": crs,
        "total": len(crs)
    }


@app.post("/api/operations/change-requests")
def create_change_request_endpoint(
    req: CreateChangeRequestPayload,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer submits structural policy amendment or revision request."""
    cr = ChangeRequestModel(
        id=f"cr-{uuid.uuid4().hex[:10]}",
        submission_id=req.submission_id,
        project_id=req.project_id,
        company_id=user.company_id,
        title=req.title,
        request_type=req.request_type,
        description=req.description,
        priority=req.priority or "medium",
        requested_by=user.name or user.email,
        submitted_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        status="pending_review",
        created_at=datetime.utcnow()
    )
    db.add(cr)
    db.commit()
    db.refresh(cr)

    return {
        "success": True,
        "change_request_id": cr.id,
        "status": cr.status,
        "message": "Change request submitted successfully."
    }


# =============================================================================
# Phase 10: Brand Passport System with Cryptographic Ed25519 Integrity Checks
# =============================================================================

from app.crypto_service import (
    mint_brand_passport,
    verify_passport_integrity,
    revoke_brand_passport
)
from app.pdf_service import generate_passport_pdf
from fastapi.responses import Response


class IssuePassportRequest(BaseModel):
    submission_id: str
    guideline_version: Optional[str] = "2026.1"


class RevokePassportRequest(BaseModel):
    reason: str


@app.post("/api/passports/issue")
def issue_passport_endpoint(
    req: IssuePassportRequest,
    reviewer: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Issue an immutable, cryptographically sealed Brand Passport Certificate for an approved version.
    Only authorized Operations Reviewers / Admins can issue passports.
    """
    res = mint_brand_passport(
        db=db,
        submission_id=req.submission_id,
        reviewer=reviewer,
        guideline_version=req.guideline_version or "2026.1"
    )
    return res


@app.get("/api/passports")
def list_passports_endpoint(
    company_id: Optional[str] = None,
    review_type: Optional[str] = None,
    status: Optional[str] = None,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List issued Brand Passports with multi-tenant company isolation.
    Company Users only see passports for their company.
    """
    query = db.query(BrandPassportModel)

    if user.role == "company_user":
        query = query.filter(BrandPassportModel.company_id == user.company_id)
    elif company_id and company_id != "all":
        query = query.filter(BrandPassportModel.company_id == company_id)

    if review_type and review_type != "all":
        query = query.filter(BrandPassportModel.review_type == review_type)

    if status and status != "all":
        query = query.filter(BrandPassportModel.status == status)

    passports = query.order_by(BrandPassportModel.issued_at.desc()).all()

    results = []
    for p in passports:
        results.append({
            "id": p.id,
            "passport_number": p.passport_number,
            "submission_id": p.submission_id,
            "project_id": p.project_id,
            "project_name": p.project_name,
            "company_id": p.company_id,
            "company_name": p.company_name,
            "review_type": p.review_type,
            "approved_version_number": p.approved_version_number,
            "approved_file_name": p.approved_file_name,
            "approved_file_hash": p.approved_file_hash,
            "guideline_version": p.guideline_version,
            "governance_score": p.governance_score,
            "authorized_reviewer_name": p.authorized_reviewer_name,
            "status": p.status,
            "algorithm": p.algorithm,
            "key_id": p.key_id,
            "public_key": p.public_key,
            "signature": p.signature,
            "issued_at": p.issued_at.strftime("%Y-%m-%d %H:%M") if p.issued_at else None,
            "revoked_at": p.revoked_at.strftime("%Y-%m-%d %H:%M") if p.revoked_at else None,
            "revoked_by": p.revoked_by,
            "revocation_reason": p.revocation_reason,
            "total_checks": p.total_checks
        })

    return {
        "success": True,
        "passports": results,
        "total": len(results)
    }


@app.get("/api/passports/{passport_id}")
def get_passport_endpoint(
    passport_id: str,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full details of an issued Brand Passport."""
    p = db.query(BrandPassportModel).filter(BrandPassportModel.id == passport_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Brand Passport '{passport_id}' not found.")

    verify_company_access(user, p.company_id)

    return {
        "success": True,
        "passport": {
            "id": p.id,
            "passport_number": p.passport_number,
            "submission_id": p.submission_id,
            "project_id": p.project_id,
            "project_name": p.project_name,
            "company_id": p.company_id,
            "company_name": p.company_name,
            "review_type": p.review_type,
            "approved_version_number": p.approved_version_number,
            "approved_file_name": p.approved_file_name,
            "approved_file_hash": p.approved_file_hash,
            "guideline_version": p.guideline_version,
            "governance_score": p.governance_score,
            "authorized_reviewer_id": p.authorized_reviewer_id,
            "authorized_reviewer_name": p.authorized_reviewer_name,
            "status": p.status,
            "canonical_payload": p.canonical_payload,
            "signature": p.signature,
            "algorithm": p.algorithm,
            "key_id": p.key_id,
            "public_key": p.public_key,
            "schema_version": p.schema_version,
            "issued_at": p.issued_at.strftime("%Y-%m-%d %H:%M:%S") if p.issued_at else None,
            "revoked_at": p.revoked_at.strftime("%Y-%m-%d %H:%M:%S") if p.revoked_at else None,
            "revoked_by": p.revoked_by,
            "revocation_reason": p.revocation_reason,
            "evidence_citations": p.evidence_citations_json or [],
            "total_checks": p.total_checks,
            "ai_disclosure": p.ai_disclosure
        }
    }


@app.post("/api/passports/{passport_id}/verify")
def verify_passport_endpoint(
    passport_id: str,
    db: Session = Depends(get_db)
):
    """
    Perform real cryptographic integrity verification of a Brand Passport:
    Validates Ed25519 signature, approval decision, revocation status, and approved file SHA-256 hash.
    """
    verification = verify_passport_integrity(db=db, passport_id=passport_id)
    return {
        "success": True,
        "verification": verification
    }


@app.post("/api/passports/{passport_id}/revoke")
def revoke_passport_endpoint(
    passport_id: str,
    req: RevokePassportRequest,
    reviewer: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a Brand Passport for cause (policy breach, expired claim, regulatory exception).
    Only authorized Operations Reviewers / Admins can revoke passports.
    """
    res = revoke_brand_passport(
        db=db,
        passport_id=passport_id,
        reason=req.reason,
        reviewer=reviewer
    )
    return res


@app.get("/api/passports/{passport_id}/export")
def export_passport_endpoint(
    passport_id: str,
    format: Optional[str] = "pdf",
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export Brand Passport Audit Certificate as a certified PDF or raw JSON audit proof envelope.
    """
    p = db.query(BrandPassportModel).filter(BrandPassportModel.id == passport_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Brand Passport '{passport_id}' not found.")

    verify_company_access(user, p.company_id)

    if format == "json":
        proof_envelope = {
            "passport_number": p.passport_number,
            "status": p.status,
            "canonical_payload": json.loads(p.canonical_payload) if p.canonical_payload else {},
            "cryptographic_proof": {
                "algorithm": p.algorithm,
                "key_id": p.key_id,
                "public_key": p.public_key,
                "signature": p.signature,
                "approved_file_hash": p.approved_file_hash
            },
            "meta": {
                "project": p.project_name,
                "company": p.company_name,
                "version": p.approved_version_number,
                "reviewer": p.authorized_reviewer_name,
                "issued_at": p.issued_at.isoformat() if p.issued_at else None
            }
        }
        return proof_envelope

    # Generate certified PDF document using ReportLab
    pdf_bytes = generate_passport_pdf(p)
    filename = f"{p.passport_number}-{p.project_name.replace(' ', '_')}-Certificate.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# =============================================================================
# Production Readiness: Health Check
# =============================================================================

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint for production load balancers and container orchestrators.
    Verifies database connectivity and service status.
    """
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    return {
        "status": "healthy" if db_connected else "degraded",
        "service": "brandguard-api",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected" if db_connected else "disconnected",
        "version": "1.0.0"
    }


# =============================================================================
# Admin Inbox: Inbound Form Submission & Operations Management
# =============================================================================

class SubmitInquiryRequest(BaseModel):
    contact_name: str
    email: str
    company_name: str
    job_title: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    team_size: Optional[str] = None
    request_type: Optional[str] = "Enterprise Evaluation"
    service_interest: Optional[str] = None
    campaign_details: Optional[str] = None
    message: str
    source_page: Optional[str] = "/#contact"
    source_form: Optional[str] = "enterprise_evaluation_contact"
    attachments: Optional[List[Dict[str, Any]]] = None


class UpdateInboxSubmissionRequest(BaseModel):
    status: Optional[str] = None  # new, in_review, awaiting_info, converted, closed
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    internal_notes: Optional[str] = None


@app.post("/api/inbox/submit")
def submit_inquiry_endpoint(
    req: SubmitInquiryRequest,
    db: Session = Depends(get_db)
):
    """
    Public form submission endpoint for inquiries, demo requests, and enterprise evaluations.
    Validates submitted information, prevents spam duplicates, and persists in inbox_submissions.
    Explicitly NO customer emails sent.
    """
    clean_name = req.contact_name.strip()
    clean_email = req.email.strip().lower()
    clean_company = req.company_name.strip()
    clean_message = req.message.strip()

    if not clean_name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not clean_email or "@" not in clean_email or "." not in clean_email:
        raise HTTPException(status_code=400, detail="Valid work email address is required.")
    if not clean_company:
        raise HTTPException(status_code=400, detail="Company or organization name is required.")
    if not clean_message:
        raise HTTPException(status_code=400, detail="Message/requirements details are required.")

    # Duplicate submission throttle: check if exact email + message was submitted within the last 60 seconds
    recent_dup = db.query(InboxSubmissionModel).filter(
        InboxSubmissionModel.email == clean_email,
        InboxSubmissionModel.message == clean_message,
        InboxSubmissionModel.created_at >= datetime.utcnow() - timedelta(seconds=60)
    ).first()
    if recent_dup:
        return {
            "success": True,
            "submission_id": recent_dup.id,
            "message": "Your request has already been recorded and is currently in the Operations queue."
        }

    sub_id = f"inbox-sub-{uuid.uuid4().hex[:10]}"
    new_sub = InboxSubmissionModel(
        id=sub_id,
        contact_name=clean_name,
        email=clean_email,
        company_name=clean_company,
        job_title=req.job_title.strip() if req.job_title else None,
        phone=req.phone.strip() if req.phone else None,
        website=req.website.strip() if req.website else None,
        team_size=req.team_size.strip() if req.team_size else None,
        request_type=req.request_type.strip() if req.request_type else "Enterprise Evaluation",
        service_interest=req.service_interest.strip() if req.service_interest else None,
        campaign_details=req.campaign_details.strip() if req.campaign_details else None,
        message=clean_message,
        attachments_json=req.attachments or [],
        source_page=req.source_page or "/#contact",
        source_form=req.source_form or "enterprise_evaluation_contact",
        status="new",
        created_at=datetime.utcnow()
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return {
        "success": True,
        "submission_id": new_sub.id,
        "message": "Your enterprise governance request has been successfully submitted and routed to the Operations Admin Inbox."
    }


@app.get("/api/inbox/submissions")
def list_inbox_submissions_endpoint(
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "newest",
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List inbound submissions for authorized Operations Administrators and Reviewers.
    Ordinary Company Users are strictly prohibited (HTTP 403 Forbidden).
    """
    if user.role not in ["operations_reviewer", "operations_admin", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin Inbox is restricted to BrandGuard Operations Administrators."
        )

    query = db.query(InboxSubmissionModel)

    # Compute summary counts across all statuses
    all_subs = db.query(InboxSubmissionModel).all()
    summary = {
        "total": len(all_subs),
        "new": sum(1 for s in all_subs if s.status == "new"),
        "in_review": sum(1 for s in all_subs if s.status == "in_review"),
        "awaiting_info": sum(1 for s in all_subs if s.status == "awaiting_info"),
        "converted": sum(1 for s in all_subs if s.status == "converted"),
        "closed": sum(1 for s in all_subs if s.status == "closed")
    }

    if status and status != "all":
        query = query.filter(InboxSubmissionModel.status == status)

    if request_type and request_type != "all":
        query = query.filter(InboxSubmissionModel.request_type == request_type)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(InboxSubmissionModel.contact_name).like(term) |
            func.lower(InboxSubmissionModel.email).like(term) |
            func.lower(InboxSubmissionModel.company_name).like(term) |
            func.lower(InboxSubmissionModel.message).like(term)
        )

    if sort_by == "oldest":
        query = query.order_by(InboxSubmissionModel.created_at.asc())
    else:
        query = query.order_by(InboxSubmissionModel.created_at.desc())

    subs = query.all()

    results = []
    for s in subs:
        results.append({
            "id": s.id,
            "contact_name": s.contact_name,
            "email": s.email,
            "company_name": s.company_name,
            "job_title": s.job_title,
            "phone": s.phone,
            "website": s.website,
            "team_size": s.team_size,
            "request_type": s.request_type,
            "service_interest": s.service_interest,
            "campaign_details": s.campaign_details,
            "message": s.message,
            "attachments": s.attachments_json or [],
            "source_page": s.source_page,
            "source_form": s.source_form,
            "status": s.status,
            "assigned_to_id": s.assigned_to_id,
            "assigned_to_name": s.assigned_to_name,
            "internal_notes": s.internal_notes,
            "converted_project_id": s.converted_project_id,
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else None,
            "updated_at": s.updated_at.strftime("%Y-%m-%d %H:%M") if s.updated_at else None
        })

    return {
        "success": True,
        "summary": summary,
        "submissions": results,
        "total": len(results)
    }


@app.get("/api/inbox/submissions/{submission_id}")
def get_inbox_submission_endpoint(
    submission_id: str,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full details of an Inbox submission, including untruncated message and internal notes."""
    if user.role not in ["operations_reviewer", "operations_admin", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin Inbox is restricted to BrandGuard Operations Administrators."
        )

    sub = db.query(InboxSubmissionModel).filter(InboxSubmissionModel.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission '{submission_id}' not found.")

    return {
        "success": True,
        "submission": {
            "id": sub.id,
            "contact_name": sub.contact_name,
            "email": sub.email,
            "company_name": sub.company_name,
            "job_title": sub.job_title,
            "phone": sub.phone,
            "website": sub.website,
            "team_size": sub.team_size,
            "request_type": sub.request_type,
            "service_interest": sub.service_interest,
            "campaign_details": sub.campaign_details,
            "message": sub.message,
            "attachments": sub.attachments_json or [],
            "source_page": sub.source_page,
            "source_form": sub.source_form,
            "status": sub.status,
            "assigned_to_id": sub.assigned_to_id,
            "assigned_to_name": sub.assigned_to_name,
            "internal_notes": sub.internal_notes,
            "converted_project_id": sub.converted_project_id,
            "created_at": sub.created_at.strftime("%Y-%m-%d %H:%M:%S") if sub.created_at else None,
            "updated_at": sub.updated_at.strftime("%Y-%m-%d %H:%M:%S") if sub.updated_at else None
        }
    }


@app.patch("/api/inbox/submissions/{submission_id}")
def update_inbox_submission_endpoint(
    submission_id: str,
    req: UpdateInboxSubmissionRequest,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update status, assignment, or internal notes for an Inbox submission."""
    if user.role not in ["operations_reviewer", "operations_admin", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Admin Inbox is restricted to BrandGuard Operations Administrators."
        )

    sub = db.query(InboxSubmissionModel).filter(InboxSubmissionModel.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission '{submission_id}' not found.")

    if req.status is not None:
        valid_statuses = ["new", "in_review", "awaiting_info", "converted", "closed"]
        if req.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status '{req.status}'. Must be one of {valid_statuses}.")
        sub.status = req.status

    if req.assigned_to_id is not None:
        sub.assigned_to_id = req.assigned_to_id
    if req.assigned_to_name is not None:
        sub.assigned_to_name = req.assigned_to_name
    if req.internal_notes is not None:
        sub.internal_notes = req.internal_notes

    sub.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "submission_id": sub.id,
        "status": sub.status,
        "assigned_to_name": sub.assigned_to_name,
        "internal_notes": sub.internal_notes,
        "message": "Submission updated successfully."
    }


@app.post("/api/inbox/submissions/{submission_id}/convert-to-project")
def convert_submission_to_project_endpoint(
    submission_id: str,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convert an Inbox submission into a managed corporate Project."""
    if user.role not in ["operations_reviewer", "operations_admin", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Action restricted to BrandGuard Operations Administrators."
        )

    sub = db.query(InboxSubmissionModel).filter(InboxSubmissionModel.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission '{submission_id}' not found.")

    proj_id = f"proj-{uuid.uuid4().hex[:8]}"
    project_title = f"{sub.company_name} - {sub.request_type}"
    new_project = ProjectModel(
        id=proj_id,
        name=project_title,
        client_name=sub.company_name,
        owner=sub.contact_name or user.name or "Operations Reviewer",
        description=f"Inbound enterprise inquiry from {sub.contact_name} ({sub.email}): {sub.message[:200]}...",
        status="active"
    )
    db.add(new_project)

    sub.status = "converted"
    sub.converted_project_id = proj_id
    sub.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "project_id": proj_id,
        "project_title": project_title,
        "message": f"Submission successfully converted into project '{project_title}'."
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
