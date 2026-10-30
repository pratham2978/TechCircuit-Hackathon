"""
operations_service.py
Phase 9 Business Logic & State Machine for Human Operations Review Workflow.
Enforces valid status transitions, role permissions, version locking,
append-only decision audit trails, and customer change requests.
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import (
    UserModel,
    ProjectModel,
    ProjectFileModel,
    ContentVersionModel,
    ReviewSubmissionModel,
    ReviewDecisionModel,
    ChangeRequestModel
)
from app.auth import verify_company_access

# Valid status transitions state machine
VALID_TRANSITIONS = {
    "submitted": ["under_review", "approved", "changes_requested", "rejected"],
    "under_review": ["approved", "changes_requested", "rejected"],
    "changes_requested": ["resubmitted"],
    "resubmitted": ["under_review", "approved", "changes_requested", "rejected"],
    "approved": [],  # Terminal for this specific version. Any content edit requires new submission.
    "rejected": ["resubmitted"]
}


def list_submissions(
    db: Session,
    user: UserModel,
    status: Optional[str] = None,
    review_type: Optional[str] = None,
    company_id: Optional[str] = None,
    date_from: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve real review submissions from database with multi-tenant filtering.
    Company Users only see their company's submissions.
    Operations Reviewers and Admins can view and filter all submissions.
    """
    query = db.query(ReviewSubmissionModel)

    # Multi-tenant boundary
    if user.role == "company_user":
        query = query.filter(ReviewSubmissionModel.company_id == user.company_id)
    elif company_id:
        query = query.filter(ReviewSubmissionModel.company_id == company_id)

    if status and status != "all":
        query = query.filter(ReviewSubmissionModel.status == status)

    if review_type and review_type != "all":
        query = query.filter(ReviewSubmissionModel.review_type == review_type)

    if date_from:
        try:
            dt = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(ReviewSubmissionModel.submitted_at >= dt)
        except ValueError:
            pass

    submissions = query.order_by(ReviewSubmissionModel.submitted_at.desc()).all()

    results = []
    for s in submissions:
        results.append({
            "id": s.id,
            "project_id": s.project_id,
            "project_name": s.project_name,
            "company_id": s.company_id,
            "company_name": s.company_name,
            "review_type": s.review_type,
            "file_id": s.file_id,
            "file_name": s.file_name or f"{s.review_type.capitalize()}_Manuscript.pdf",
            "version_number": s.version_number,
            "status": s.status,
            "submitted_by": s.submitted_by,
            "submitted_at": s.submitted_at.strftime("%Y-%m-%d %H:%M") if s.submitted_at else None,
            "assigned_reviewer": s.assigned_reviewer,
            "findings_count": s.findings_count,
            "critical_count": s.critical_count,
            "content_summary": s.content_summary,
            "latest_report_id": s.latest_report_id or f"{s.project_id}-{s.review_type}",
            "approved_version_number": s.approved_version_number,
            "decisions_count": len(s.decisions) if s.decisions else 0
        })

    return results


def get_submission_detail(
    db: Session,
    submission_id: str,
    user: UserModel
) -> Dict[str, Any]:
    """Retrieve full submission detail including decision history and change requests."""
    sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission '{submission_id}' not found.")

    verify_company_access(user, sub.company_id)

    # Chronological append-only decision audit trail
    decisions_list = [
        {
            "id": d.id,
            "version_number": d.version_number,
            "reviewer_id": d.reviewer_id,
            "reviewer_name": d.reviewer_name,
            "reviewer_role": d.reviewer_role,
            "decision": d.decision,
            "previous_status": d.previous_status,
            "resulting_status": d.resulting_status,
            "comments": d.comments,
            "actionable_instructions": d.actionable_instructions,
            "created_at": d.created_at.strftime("%Y-%m-%d %H:%M:%S") if d.created_at else None
        }
        for d in sub.decisions
    ]

    change_reqs = [
        {
            "id": cr.id,
            "title": cr.title,
            "request_type": cr.request_type,
            "description": cr.description,
            "priority": cr.priority,
            "requested_by": cr.requested_by,
            "submitted_at": cr.submitted_at,
            "status": cr.status,
            "reviewer_feedback": cr.reviewer_feedback,
            "admin_response": cr.admin_response,
            "target_version": cr.target_version,
            "resubmitted_version": cr.resubmitted_version
        }
        for cr in sub.change_requests
    ]

    return {
        "id": sub.id,
        "project_id": sub.project_id,
        "project_name": sub.project_name,
        "company_id": sub.company_id,
        "company_name": sub.company_name,
        "review_type": sub.review_type,
        "file_id": sub.file_id,
        "file_name": sub.file_name,
        "version_number": sub.version_number,
        "status": sub.status,
        "submitted_by": sub.submitted_by,
        "submitted_at": sub.submitted_at.strftime("%Y-%m-%d %H:%M") if sub.submitted_at else None,
        "assigned_reviewer": sub.assigned_reviewer,
        "findings_count": sub.findings_count,
        "critical_count": sub.critical_count,
        "content_summary": sub.content_summary,
        "content_text": sub.content_text,
        "findings": sub.findings_json or [],
        "latest_report_id": sub.latest_report_id or f"{sub.project_id}-{sub.review_type}",
        "approved_version_number": sub.approved_version_number,
        "decisions": decisions_list,
        "change_requests": change_reqs
    }


def create_submission(
    db: Session,
    project_id: str,
    review_type: str,
    user: UserModel,
    file_id: Optional[str] = None,
    file_name: Optional[str] = None,
    content_text: Optional[str] = None,
    content_summary: Optional[str] = None,
    findings: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Queue a completed AI review into the Human Operations Review Queue.
    Establishes state as 'submitted' and links the active content version.
    """
    proj = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

    verify_company_access(user, user.company_id)

    # Fetch latest version for this review tool
    latest_ver = db.query(ContentVersionModel).filter(
        ContentVersionModel.project_id == project_id,
        ContentVersionModel.review_type == review_type,
        ContentVersionModel.company_id == user.company_id
    ).order_by(ContentVersionModel.created_at.desc()).first()

    version_str = latest_ver.version_number if latest_ver else "1.0"
    version_id = latest_ver.id if latest_ver else None

    # Calculate findings metrics
    findings_list = findings or []
    crit_count = sum(1 for f in findings_list if f.get("severity") == "critical")

    sub = ReviewSubmissionModel(
        id=f"sub-{uuid.uuid4().hex[:10]}",
        project_id=project_id,
        company_id=user.company_id,
        company_name=user.company_name or "Acme Global Brands",
        project_name=proj.name,
        review_type=review_type,
        file_id=file_id,
        file_name=file_name or f"{review_type.capitalize()}_Manuscript.pdf",
        version_id=version_id,
        version_number=version_str,
        status="submitted",
        submitted_by=user.name or user.email,
        submitted_by_id=user.id,
        submitted_at=datetime.utcnow(),
        findings_count=len(findings_list),
        critical_count=crit_count,
        content_summary=content_summary or f"Submitted {review_type.capitalize()} manuscript (v{version_str}) for Human Operations signoff.",
        content_text=content_text or (latest_ver.content_text if latest_ver else None),
        findings_json=findings_list,
        latest_report_id=f"{project_id}-{review_type}",
        created_at=datetime.utcnow()
    )

    db.add(sub)
    db.commit()
    db.refresh(sub)

    return {
        "success": True,
        "submission_id": sub.id,
        "status": sub.status,
        "version_number": sub.version_number,
        "message": "Submission placed into Human Operations review queue."
    }


def record_review_decision(
    db: Session,
    submission_id: str,
    decision: str,  # approved, changes_requested, rejected
    comments: str,
    reviewer: UserModel,
    actionable_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """
    Enforce Human Reviewer decision recording:
    1. Role check: Company Users CANNOT approve or reject.
    2. Validates status transition on the state machine.
    3. Binds approval to the reviewed version.
    4. Persists an immutable append-only ReviewDecisionModel record.
    5. Creates a customer ChangeRequestModel if changes are requested.
    """
    # STRICT ROLE AUTHORIZATION:
    if reviewer.role not in ["operations_reviewer", "operations_admin"]:
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: Company users cannot approve or reject submissions. Only authorized BrandGuard Operations reviewers may issue review decisions."
        )

    sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission '{submission_id}' not found.")

    decision_norm = decision.lower().strip()
    if decision_norm not in ["approved", "changes_requested", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid decision. Must be 'approved', 'changes_requested', or 'rejected'.")

    # Validate transition
    allowed = VALID_TRANSITIONS.get(sub.status, [])
    if decision_norm not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition: Cannot transition from '{sub.status}' to '{decision_norm}'."
        )

    if not comments or not comments.strip():
        raise HTTPException(status_code=400, detail="Review decision requires non-empty reviewer comments.")

    if decision_norm == "changes_requested" and not actionable_instructions:
        actionable_instructions = comments

    prev_status = sub.status
    resulting_status = decision_norm

    # Record immutable decision
    dec = ReviewDecisionModel(
        id=f"dec-{uuid.uuid4().hex[:10]}",
        submission_id=sub.id,
        project_id=sub.project_id,
        company_id=sub.company_id,
        review_type=sub.review_type,
        version_id=sub.version_id,
        version_number=sub.version_number,
        reviewer_id=reviewer.id,
        reviewer_name=reviewer.name or reviewer.email,
        reviewer_role=reviewer.role,
        decision=decision_norm,
        previous_status=prev_status,
        resulting_status=resulting_status,
        comments=comments.strip(),
        actionable_instructions=actionable_instructions.strip() if actionable_instructions else None,
        created_at=datetime.utcnow()
    )
    db.add(dec)

    # Update submission
    sub.status = resulting_status
    sub.assigned_reviewer = reviewer.name
    sub.assigned_reviewer_id = reviewer.id
    sub.updated_at = datetime.utcnow()

    # If approved, lock the approved version number
    if decision_norm == "approved":
        sub.approved_version_number = sub.version_number

    # If changes requested, persist a linked ChangeRequestModel for the customer
    if decision_norm == "changes_requested":
        cr = ChangeRequestModel(
            id=f"cr-{uuid.uuid4().hex[:10]}",
            submission_id=sub.id,
            project_id=sub.project_id,
            company_id=sub.company_id,
            title=f"Required Changes for {sub.project_name} ({sub.review_type.capitalize()})",
            request_type="Reviewer Requested Revision",
            description=actionable_instructions or comments,
            priority="high",
            requested_by=f"{reviewer.name} (BrandGuard Operations)",
            submitted_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
            status="changes_requested",
            reviewer_feedback=comments,
            target_version=sub.version_number,
            created_at=datetime.utcnow()
        )
        db.add(cr)

    db.commit()

    return {
        "success": True,
        "decision_id": dec.id,
        "submission_id": sub.id,
        "previous_status": prev_status,
        "resulting_status": resulting_status,
        "reviewed_version": sub.version_number,
        "reviewer": reviewer.name,
        "message": f"Review decision '{decision_norm.upper()}' recorded successfully."
    }


def customer_resubmit(
    db: Session,
    submission_id: str,
    revised_content: str,
    user: UserModel,
    resubmission_notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Customer submits revised manuscript in response to reviewer change requests:
    1. Validates that current status allows resubmission ('changes_requested' or 'rejected').
    2. Increments version or binds newly saved content.
    3. Moves status to 'resubmitted'.
    4. Updates linked change requests.
    5. Returns submission to the Operations Review Queue.
    """
    sub = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission '{submission_id}' not found.")

    verify_company_access(user, sub.company_id)

    allowed = VALID_TRANSITIONS.get(sub.status, [])
    if "resubmitted" not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot resubmit when submission status is '{sub.status}'. Allowed only from 'changes_requested' or 'rejected'."
        )

    # Compute next version number
    try:
        cur_v = float(sub.version_number)
        next_v = f"{cur_v + 0.1:.1f}"
    except Exception:
        next_v = f"{sub.version_number}.1"

    # Save new content version
    new_ver = ContentVersionModel(
        id=f"ver-{uuid.uuid4().hex[:10]}",
        project_id=sub.project_id,
        review_type=sub.review_type,
        company_id=sub.company_id,
        file_id=sub.file_id,
        version_number=next_v,
        parent_version_id=sub.version_id,
        content_text=revised_content,
        change_summary=resubmission_notes or f"Customer resubmission addressing Operations reviewer feedback.",
        change_source="user_applied",
        status="current",
        author=user.name or user.email,
        created_at=datetime.utcnow()
    )
    db.add(new_ver)

    # Update submission
    prev_status = sub.status
    sub.version_number = next_v
    sub.version_id = new_ver.id
    sub.status = "resubmitted"
    sub.content_text = revised_content
    sub.content_summary = f"Resubmitted (v{next_v}): {resubmission_notes or 'Revised addressing reviewer instructions.'}"
    sub.updated_at = datetime.utcnow()

    # Update active change requests
    for cr in sub.change_requests:
        if cr.status in ["changes_requested", "pending_review"]:
            cr.status = "resubmitted"
            cr.resubmitted_version = next_v
            cr.customer_reply = resubmission_notes or "Revised version submitted."
            cr.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "submission_id": sub.id,
        "previous_status": prev_status,
        "resulting_status": sub.status,
        "new_version_number": next_v,
        "message": f"Revised content (v{next_v}) resubmitted to Operations review queue."
    }


def list_change_requests(
    db: Session,
    user: UserModel,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve customer change requests with tenant filtering."""
    query = db.query(ChangeRequestModel)
    if user.role == "company_user":
        query = query.filter(ChangeRequestModel.company_id == user.company_id)

    if status and status != "all":
        query = query.filter(ChangeRequestModel.status == status)

    crs = query.order_by(ChangeRequestModel.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "submission_id": c.submission_id,
            "project_id": c.project_id,
            "company_id": c.company_id,
            "title": c.title,
            "request_type": c.request_type,
            "description": c.description,
            "priority": c.priority,
            "requested_by": c.requested_by,
            "submitted_at": c.submitted_at,
            "status": c.status,
            "reviewer_feedback": c.reviewer_feedback,
            "admin_response": c.admin_response,
            "target_version": c.target_version,
            "customer_reply": c.customer_reply,
            "resubmitted_version": c.resubmitted_version,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else None
        }
        for c in crs
    ]

