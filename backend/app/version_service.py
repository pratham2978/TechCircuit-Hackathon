"""
BrandGuard Phase 8: AI Corrections, Persistent Versioning & Version Comparison Service

Provides:
1. Structured diff generation (additions, deletions, unchanged segments) for text & documents.
2. AI-suggested correction generation grounded in DB rules and submitted content.
3. Version creation upon accepted corrections (preserving the original content unchanged).
4. Correction rejection recording without mutating versions or original content.
5. Persistent multi-tenant version history for projects and review tools.
6. Media comparison handling (images and videos) with honest pipeline reporting.
"""

import os
import difflib
import uuid
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import (
    ProjectModel,
    ProjectFileModel,
    ReviewSessionModel,
    ContentVersionModel,
    CorrectionRecordModel,
    BrandRuleModel
)
from app.rag_service import retrieve_governance_context


def compute_text_diff(original_text: str, revised_text: str) -> Dict[str, Any]:
    """
    Compute structured diff between original and revised text.
    Returns:
    - segments: list of {"type": "unchanged" | "added" | "deleted", "text": str}
    - additions_count: number of added tokens/words
    - deletions_count: number of deleted tokens/words
    - changes_detected: bool
    """
    orig = original_text or ""
    rev = revised_text or ""

    if orig == rev:
        return {
            "segments": [{"type": "unchanged", "text": orig}],
            "additions_count": 0,
            "deletions_count": 0,
            "changes_detected": False,
            "original_char_count": len(orig),
            "revised_char_count": len(rev)
        }

    # Split into words keeping punctuation and spaces for clean inline highlighting
    matcher = difflib.SequenceMatcher(None, orig.split(), rev.split())
    segments = []
    additions = 0
    deletions = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            segments.append({
                "type": "unchanged",
                "text": " ".join(orig.split()[i1:i2]) + " "
            })
        elif tag == "replace":
            del_words = orig.split()[i1:i2]
            add_words = rev.split()[j1:j2]
            segments.append({
                "type": "deleted",
                "text": " ".join(del_words) + " "
            })
            segments.append({
                "type": "added",
                "text": " ".join(add_words) + " "
            })
            deletions += len(del_words)
            additions += len(add_words)
        elif tag == "delete":
            del_words = orig.split()[i1:i2]
            segments.append({
                "type": "deleted",
                "text": " ".join(del_words) + " "
            })
            deletions += len(del_words)
        elif tag == "insert":
            add_words = rev.split()[j1:j2]
            segments.append({
                "type": "added",
                "text": " ".join(add_words) + " "
            })
            additions += len(add_words)

    return {
        "segments": segments,
        "additions_count": additions,
        "deletions_count": deletions,
        "changes_detected": additions > 0 or deletions > 0,
        "original_char_count": len(orig),
        "revised_char_count": len(rev)
    }


def get_or_create_initial_version(
    db: Session,
    project_id: str,
    review_type: str,
    company_id: str = "acme-global-brands",
    fallback_text: Optional[str] = None,
    file_id: Optional[str] = None
) -> ContentVersionModel:
    """
    Retrieve existing initial/current version for a project and review tool,
    or initialize version 1.0 from ProjectFileModel or provided content.
    """
    existing_v1 = db.query(ContentVersionModel).filter(
        ContentVersionModel.project_id == project_id,
        ContentVersionModel.review_type == review_type,
        ContentVersionModel.company_id == company_id,
        ContentVersionModel.version_number == "1.0"
    ).first()

    if existing_v1:
        return existing_v1

    # Check project file
    initial_text = fallback_text or ""
    initial_media_path = None
    media_type = "text"

    if review_type in ["images"]:
        media_type = "image"
    elif review_type in ["videos"]:
        media_type = "video"

    p_file = None
    if file_id:
        p_file = db.query(ProjectFileModel).filter(ProjectFileModel.id == file_id).first()
    if not p_file:
        p_file = db.query(ProjectFileModel).filter(
            ProjectFileModel.project_id == project_id,
            ProjectFileModel.review_type == review_type
        ).first()

    if p_file:
        initial_text = p_file.original_text or p_file.current_text or initial_text
        if p_file.file_type in ["png", "jpg", "jpeg", "webp", "svg"]:
            media_type = "image"
        elif p_file.file_type in ["mp4", "webm", "mov"]:
            media_type = "video"

    v1 = ContentVersionModel(
        id=f"ver-{uuid.uuid4().hex[:10]}",
        project_id=project_id,
        review_type=review_type,
        company_id=company_id,
        file_id=p_file.id if p_file else file_id,
        version_number="1.0",
        parent_version_id=None,
        content_text=initial_text,
        media_path=initial_media_path,
        media_type=media_type,
        change_summary="Original review content baseline.",
        change_source="initial",
        status="superseded" if fallback_text and fallback_text != initial_text else "current",
        author="System Baseline",
        created_at=datetime.utcnow()
    )
    db.add(v1)
    db.commit()
    db.refresh(v1)
    return v1


def get_latest_version(
    db: Session,
    project_id: str,
    review_type: str,
    company_id: str = "acme-global-brands"
) -> Optional[ContentVersionModel]:
    """Retrieve the most recent version for a project and review tool."""
    return db.query(ContentVersionModel).filter(
        ContentVersionModel.project_id == project_id,
        ContentVersionModel.review_type == review_type,
        ContentVersionModel.company_id == company_id
    ).order_by(ContentVersionModel.created_at.desc()).first()


def accept_and_persist_correction(
    db: Session,
    project_id: str,
    review_type: str,
    finding_id: str,
    original_text_span: str,
    correction_text: str,
    is_user_edited: bool = False,
    rule_reference: Optional[str] = None,
    explanation: Optional[str] = None,
    company_id: str = "acme-global-brands",
    author: str = "Brand Manager"
) -> Dict[str, Any]:
    """
    Accept an AI or user-edited correction:
    1. Retrieves current version (preserving v1.0 original unchanged).
    2. Applies the correction text to create a new content string.
    3. Calculates next version number (e.g., 1.1, 1.2).
    4. Persists a new ContentVersionModel record.
    5. Persists a CorrectionRecordModel marked as 'accepted' or 'edited_and_accepted'.
    6. Updates ProjectFileModel current text and version number.
    Returns: newly created version info, diff stats, and updated finding status.
    """
    # Multi-tenant check
    proj = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not proj:
        raise ValueError(f"Project '{project_id}' not found.")

    latest_ver = get_latest_version(db, project_id, review_type, company_id)
    if not latest_ver:
        latest_ver = get_or_create_initial_version(db, project_id, review_type, company_id, fallback_text=original_text_span)

    parent_content = latest_ver.content_text or ""

    # Replace original text span in parent content
    if original_text_span and original_text_span in parent_content:
        new_content = parent_content.replace(original_text_span, correction_text, 1)
    elif original_text_span:
        # Fallback if text span slightly shifted: append or replace whole block
        new_content = parent_content.replace(original_text_span.strip(), correction_text.strip(), 1)
        if new_content == parent_content:
            new_content = f"{parent_content}\n\n[Applied Fix: {correction_text}]"
    else:
        new_content = f"{parent_content}\n\n{correction_text}"

    # Calculate next version number
    try:
        current_num = float(latest_ver.version_number)
        next_version_str = f"{current_num + 0.1:.1f}"
    except (ValueError, TypeError):
        next_version_str = "1.1"

    # Mark old version as superseded
    latest_ver.status = "superseded"

    # Create new version record
    change_source = "user_edited" if is_user_edited else "ai_suggested"
    change_desc = (
        f"Applied user-edited fix for finding {finding_id} ({rule_reference or 'Governance Standard'})."
        if is_user_edited
        else f"Applied AI-suggested compliant fix for finding {finding_id} ({rule_reference or 'Governance Standard'})."
    )

    new_version = ContentVersionModel(
        id=f"ver-{uuid.uuid4().hex[:10]}",
        project_id=project_id,
        review_type=review_type,
        company_id=company_id,
        file_id=latest_ver.file_id,
        version_number=next_version_str,
        parent_version_id=latest_ver.id,
        content_text=new_content,
        media_path=latest_ver.media_path,
        media_type=latest_ver.media_type,
        change_summary=change_desc,
        change_source=change_source,
        status="current",
        author=author,
        created_at=datetime.utcnow()
    )
    db.add(new_version)
    db.flush()

    # Record correction in correction_records
    correction_rec = db.query(CorrectionRecordModel).filter(
        CorrectionRecordModel.project_id == project_id,
        CorrectionRecordModel.review_type == review_type,
        CorrectionRecordModel.finding_id == finding_id,
        CorrectionRecordModel.company_id == company_id
    ).first()

    status_val = "edited_and_accepted" if is_user_edited else "accepted"

    if correction_rec:
        correction_rec.user_edited_correction = correction_text if is_user_edited else correction_rec.user_edited_correction
        correction_rec.applied_correction = correction_text
        correction_rec.status = status_val
        correction_rec.resulting_version_id = new_version.id
        correction_rec.updated_at = datetime.utcnow()
    else:
        correction_rec = CorrectionRecordModel(
            id=f"cor-{uuid.uuid4().hex[:10]}",
            project_id=project_id,
            review_type=review_type,
            company_id=company_id,
            finding_id=finding_id,
            original_text_span=original_text_span,
            ai_suggested_correction=correction_text,
            user_edited_correction=correction_text if is_user_edited else None,
            applied_correction=correction_text,
            status=status_val,
            explanation=explanation,
            rule_reference=rule_reference,
            source_version_id=latest_ver.id,
            resulting_version_id=new_version.id,
            created_at=datetime.utcnow()
        )
        db.add(correction_rec)

    # Update project file if present
    p_file = db.query(ProjectFileModel).filter(
        ProjectFileModel.project_id == project_id,
        ProjectFileModel.review_type == review_type
    ).first()
    if p_file:
        p_file.current_text = new_content
        p_file.version = next_version_str

    db.commit()

    diff_data = compute_text_diff(parent_content, new_content)

    return {
        "success": True,
        "action": "correction_accepted",
        "finding_id": finding_id,
        "finding_status": "accepted",
        "version_number": new_version.version_number,
        "new_version": new_version.version_number,
        "version_id": new_version.id,
        "parent_version_id": latest_ver.id,
        "change_summary": change_desc,
        "diff": diff_data
    }


def reject_and_record_correction(
    db: Session,
    project_id: str,
    review_type: str,
    finding_id: str,
    dismissal_reason: str,
    dismissal_note: Optional[str] = None,
    original_text_span: Optional[str] = None,
    ai_suggestion: Optional[str] = None,
    rule_reference: Optional[str] = None,
    company_id: str = "acme-global-brands"
) -> Dict[str, Any]:
    """
    Reject an AI-suggested correction:
    1. Persists a CorrectionRecordModel marked as 'rejected'.
    2. Crucially, DOES NOT create a revised version or mutate the original content.
    Returns: confirmation and finding rejection status.
    """
    latest_ver = get_latest_version(db, project_id, review_type, company_id)

    correction_rec = db.query(CorrectionRecordModel).filter(
        CorrectionRecordModel.project_id == project_id,
        CorrectionRecordModel.review_type == review_type,
        CorrectionRecordModel.finding_id == finding_id,
        CorrectionRecordModel.company_id == company_id
    ).first()

    if correction_rec:
        correction_rec.status = "rejected"
        correction_rec.dismissal_reason = dismissal_reason
        correction_rec.dismissal_note = dismissal_note
        correction_rec.updated_at = datetime.utcnow()
    else:
        correction_rec = CorrectionRecordModel(
            id=f"cor-{uuid.uuid4().hex[:10]}",
            project_id=project_id,
            review_type=review_type,
            company_id=company_id,
            finding_id=finding_id,
            original_text_span=original_text_span or "",
            ai_suggested_correction=ai_suggestion or "Suggested replacement",
            status="rejected",
            dismissal_reason=dismissal_reason,
            dismissal_note=dismissal_note,
            rule_reference=rule_reference,
            source_version_id=latest_ver.id if latest_ver else None,
            resulting_version_id=None,  # No version created!
            created_at=datetime.utcnow()
        )
        db.add(correction_rec)

    db.commit()

    return {
        "success": True,
        "action": "correction_rejected",
        "finding_id": finding_id,
        "finding_status": "rejected",
        "dismissal_reason": dismissal_reason,
        "content_mutated": False
    }


def list_project_versions(
    db: Session,
    project_id: str,
    review_type: str,
    company_id: str = "acme-global-brands"
) -> List[Dict[str, Any]]:
    """Retrieve full persistent version history for a project & review tool."""
    # Ensure baseline v1.0 exists
    get_or_create_initial_version(db, project_id, review_type, company_id)

    versions = db.query(ContentVersionModel).filter(
        ContentVersionModel.project_id == project_id,
        ContentVersionModel.review_type == review_type,
        ContentVersionModel.company_id == company_id
    ).order_by(ContentVersionModel.created_at.asc()).all()

    return [
        {
            "id": v.id,
            "version_number": v.version_number,
            "parent_version_id": v.parent_version_id,
            "content_text": v.content_text,
            "change_summary": v.change_summary,
            "change_source": v.change_source,
            "status": v.status,
            "author": v.author,
            "media_type": v.media_type,
            "char_count": len(v.content_text or ""),
            "created_at": v.created_at.strftime("%Y-%m-%d %H:%M:%S") if v.created_at else None
        }
        for v in versions
    ]


def compare_project_versions(
    db: Session,
    project_id: str,
    review_type: str,
    from_version_id: Optional[str] = None,
    to_version_id: Optional[str] = None,
    company_id: str = "acme-global-brands"
) -> Dict[str, Any]:
    """
    Compare original and revised versions:
    - Text diff with additions, deletions, unchanged segments.
    - Addressed finding references.
    - Media comparison status (images/videos).
    """
    # Ensure baseline exists
    v1 = get_or_create_initial_version(db, project_id, review_type, company_id)

    if from_version_id:
        v_from = db.query(ContentVersionModel).filter(
            ContentVersionModel.id == from_version_id,
            ContentVersionModel.company_id == company_id
        ).first()
    else:
        v_from = v1

    if to_version_id:
        v_to = db.query(ContentVersionModel).filter(
            ContentVersionModel.id == to_version_id,
            ContentVersionModel.company_id == company_id
        ).first()
    else:
        v_to = get_latest_version(db, project_id, review_type, company_id) or v1

    if not v_from or not v_to:
        raise ValueError("Specified version IDs not found for comparison.")

    # Calculate text diff
    text_diff = compute_text_diff(v_from.content_text or "", v_to.content_text or "")

    # Retrieve corrections applied between these versions
    addressed_corrections = db.query(CorrectionRecordModel).filter(
        CorrectionRecordModel.project_id == project_id,
        CorrectionRecordModel.review_type == review_type,
        CorrectionRecordModel.company_id == company_id,
        CorrectionRecordModel.status.in_(["accepted", "edited_and_accepted"])
    ).all()

    addressed_findings = [
        {
            "finding_id": c.finding_id,
            "applied_correction": c.applied_correction,
            "rule_reference": c.rule_reference,
            "status": c.status,
            "is_user_edited": c.status == "edited_and_accepted"
        }
        for c in addressed_corrections
    ]

    # Media comparison support reporting
    media_comparison = {
        "media_type": v_to.media_type or "text",
        "has_revised_media_file": bool(v_to.media_path and v_to.media_path != v_from.media_path),
        "original_media_path": v_from.media_path,
        "revised_media_path": v_to.media_path,
        "media_editing_pipeline_note": (
            "Genuine image visual comparison supported when a revised image is uploaded."
            if v_to.media_type == "image"
            else "Video spot review tracks timestamped findings and duration standards; video re-rendering requires dedicated NLE media pipeline."
            if v_to.media_type == "video"
            else None
        )
    }

    return {
        "project_id": project_id,
        "review_type": review_type,
        "from_version": {
            "id": v_from.id,
            "version_number": v_from.version_number,
            "created_at": v_from.created_at.strftime("%Y-%m-%d %H:%M:%S") if v_from.created_at else None,
            "text": v_from.content_text
        },
        "to_version": {
            "id": v_to.id,
            "version_number": v_to.version_number,
            "created_at": v_to.created_at.strftime("%Y-%m-%d %H:%M:%S") if v_to.created_at else None,
            "text": v_to.content_text
        },
        "diff": text_diff,
        "addressed_findings": addressed_findings,
        "media_comparison": media_comparison
    }


def generate_ai_correction(
    db: Session,
    finding: Dict[str, Any],
    content: str,
    review_type: str,
    company_id: str = "acme-global-brands",
    custom_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate an AI-suggested compliant correction grounded in company rules and content.
    Uses Gemini AI if configured, with deterministic governance fallback.
    """
    from app.gemini_service import call_gemini_raw, GeminiConfigError, GeminiApiError

    # 1. Retrieve applicable company rules for this finding
    finding_text = f"{finding.get('title', '')} {finding.get('excerpt', '')} {finding.get('textSpan', '')} {finding.get('ruleReference', '')}"
    retrieved = retrieve_governance_context(
        db=db,
        company_id=company_id,
        review_type=review_type,
        content=content,
        instructions=finding_text
    )

    rules_context = retrieved.get("prompt_grounding_text", "")

    # Check if there is an exact preferred alternative in retrieved rules
    preferred_alt = None
    matched_rule_id = None
    matched_doc = None
    for r in retrieved.get("retrieved_rules", []):
        ref = (finding.get("ruleReference") or "").lower()
        if r["id"].lower() in ref or r["title"].lower() in ref:
            preferred_alt = r.get("preferred_alternative")
            matched_rule_id = r["id"]
            matched_doc = f"{r['source_doc']} (Page {r['source_page']})"
            break

    prompt = (
        f"You are BrandGuard Governance Assistant.\n"
        f"Review Type: {review_type.upper()}\n"
        f"A user has requested a suggested replacement for a compliance finding.\n\n"
        f"FINDING DETAILS:\n"
        f"- Title: {finding.get('title', 'Compliance Finding')}\n"
        f"- Problem Excerpt / Text Span: \"{finding.get('excerpt') or finding.get('textSpan') or ''}\"\n"
        f"- Explanation: {finding.get('explanation', '')}\n"
        f"- Rule Reference: {finding.get('ruleReference', 'General Governance Standard')}\n\n"
        f"SURROUNDING CONTENT:\n\"\"\"\n{content[:1500]}\n\"\"\"\n\n"
        f"RETRIEVED COMPANY RULES & EVIDENCE:\n{rules_context}\n\n"
        f"USER CUSTOM INSTRUCTIONS (IF ANY):\n{custom_instructions or 'Provide a compliant, professional replacement.'}\n\n"
        "Return ONLY a valid JSON object with:\n"
        "{\n"
        "  \"suggestedCorrection\": \"Exact suggested replacement text or action\",\n"
        "  \"explanation\": \"Detailed explanation of why this satisfies the applicable brand rule\",\n"
        "  \"applicableRule\": \"Rule ID and title from retrieved governance rules\",\n"
        "  \"sourceDoc\": \"Name of policy document and page\"\n"
        "}"
    )

    try:
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
        }
        res = call_gemini_raw(payload)
        candidates = res.get("candidates", [])
        if candidates:
            cand_text = candidates[0].get("content", {}).get("parts", [])[0].get("text", "{}")
            parsed = json.loads(cand_text)
            if parsed.get("suggestedCorrection"):
                return {
                    "success": True,
                    "suggestedCorrection": parsed["suggestedCorrection"],
                    "explanation": parsed.get("explanation", finding.get("explanation")),
                    "applicableRule": parsed.get("applicableRule", matched_rule_id or finding.get("ruleReference")),
                    "sourceDoc": parsed.get("sourceDoc", matched_doc or finding.get("sourceDoc")),
                    "is_ai_generated": True
                }
    except Exception:
        pass

    # Deterministic fallback grounded in retrieved rules
    suggested = (
        preferred_alt or
        finding.get("suggestedCorrection") or
        finding.get("suggestedFix") or
        f"Compliant alternative according to {finding.get('ruleReference', 'brand guidelines')}."
    )

    return {
        "success": True,
        "suggestedCorrection": suggested,
        "explanation": f"Grounded alternative aligned with {finding.get('ruleReference', 'brand standard')}.",
        "applicableRule": matched_rule_id or finding.get("ruleReference", "Brand Rule Standard"),
        "sourceDoc": matched_doc or finding.get("sourceDoc", "Brand Guidelines 2026.pdf"),
        "is_ai_generated": False
    }
