from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class UserModel(Base):
    """Real server-verified user identity with role-based authorization."""
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    salt = Column(String(64), nullable=False)
    role = Column(String(32), default="company_user", nullable=False)  # company_user, operations_reviewer, operations_admin
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    company_name = Column(String(255), default="Acme Global Brands", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), default="active", nullable=False)  # active, in_review, approved, archived
    client_name = Column(String(255), default="Acme Global Brands", nullable=False)
    owner = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    files = relationship("ProjectFileModel", back_populates="project", cascade="all, delete-orphan")
    review_sessions = relationship("ReviewSessionModel", back_populates="project", cascade="all, delete-orphan")


class ProjectFileModel(Base):
    __tablename__ = "project_files"

    id = Column(String(64), primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    file_type = Column(String(32), nullable=False)  # docx, pdf, png, jpg, mp4, txt, html
    review_type = Column(String(32), nullable=False)  # legal, promotions, content, images, videos
    status = Column(String(32), default="not_started", nullable=False)
    version = Column(String(16), default="1.0")
    findings_count = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    reviewer = Column(String(255), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    original_text = Column(Text, nullable=True)
    current_text = Column(Text, nullable=True)
    findings_json = Column(JSON, nullable=True)

    project = relationship("ProjectModel", back_populates="files")


class ReviewSessionModel(Base):
    __tablename__ = "review_sessions"

    id = Column(String(128), primary_key=True, index=True)  # e.g. "{project_id}:{review_type}"
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    review_type = Column(String(32), nullable=False)  # legal, promotions, content, images, videos
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("ProjectModel", back_populates="review_sessions")
    messages = relationship("ChatMessageModel", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessageModel.created_at")


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(128), ForeignKey("review_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # user, assistant
    text = Column(Text, nullable=False)
    timestamp_str = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    attachments_json = Column(JSON, nullable=True)
    analysis_result_json = Column(JSON, nullable=True)

    session = relationship("ReviewSessionModel", back_populates="messages")


class GuidelineDocModel(Base):
    __tablename__ = "guidelines"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(String(64), nullable=False)
    version = Column(String(16), default="1.0")
    status = Column(String(32), default="indexed")
    pages_count = Column(Integer, default=1)
    proposed_rules_count = Column(Integer, default=0)
    approved_rules_count = Column(Integer, default=0)
    sample_passage = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("GuidelineChunkModel", back_populates="document", cascade="all, delete-orphan")


class GuidelineChunkModel(Base):
    __tablename__ = "guideline_chunks"

    id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), ForeignKey("guidelines.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    chunk_index = Column(Integer, default=0, nullable=False)
    page_number = Column(Integer, default=1, nullable=False)
    section_title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("GuidelineDocModel", back_populates="chunks")


class BrandRuleModel(Base):
    __tablename__ = "brand_rules"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)  # brand_rules, disclaimers, terminology, voice, visual, etc.
    rule_type = Column(String(64), nullable=False)  # prohibited_term, preferred_alternative, disclaimer, restriction, voice
    term_or_pattern = Column(String(255), nullable=True)
    preferred_alternative = Column(String(255), nullable=True)
    explanation = Column(Text, nullable=False)
    severity = Column(String(16), default="warning")  # critical, warning, advisory
    status = Column(String(16), default="approved")  # approved, proposed
    source_doc = Column(String(255), nullable=False)
    source_page = Column(Integer, default=1, nullable=False)
    dismissal_count = Column(Integer, default=0)


class ApprovedClaimModel(Base):
    __tablename__ = "approved_claims"

    id = Column(String(64), primary_key=True, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    claim_text = Column(Text, nullable=False)
    source_doc = Column(String(255), nullable=False)
    source_page = Column(Integer, default=1)
    owner = Column(String(255), nullable=False)
    valid_from = Column(String(32), nullable=False)
    valid_to = Column(String(32), nullable=False)
    status = Column(String(32), default="VERIFIED")  # VERIFIED, EXPIRING_SOON, EXPIRED, NEEDS_VERIFICATION
    context_notes = Column(Text, nullable=True)


class BrandPassportModel(Base):
    """
    Cryptographically sealed Brand Passport Certificate.
    Binds an authorized human approval, exact version number, and approved file SHA-256 hash
    using standard Ed25519 digital signatures.
    """
    __tablename__ = "brand_passports"

    id = Column(String(64), primary_key=True, index=True)
    passport_number = Column(String(64), unique=True, nullable=False, index=True)
    submission_id = Column(String(64), ForeignKey("review_submissions.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    project_name = Column(String(255), nullable=False)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    company_name = Column(String(255), default="Acme Global Brands", nullable=False)
    review_type = Column(String(32), nullable=False, index=True)  # legal, promotions, content, images, videos
    approved_version_number = Column(String(16), nullable=False)
    decision_id = Column(String(64), nullable=True)
    approved_file_name = Column(String(255), nullable=False)
    approved_file_hash = Column(String(64), nullable=False)  # SHA-256 of approved file bytes
    file_storage_path = Column(String(255), nullable=True)
    guideline_version = Column(String(32), default="2026.1")
    governance_score = Column(Integer, default=100)
    authorized_reviewer_id = Column(String(64), nullable=False)
    authorized_reviewer_name = Column(String(255), nullable=False)
    status = Column(String(32), default="VERIFIED", nullable=False, index=True)  # VERIFIED, REVOKED, INVALID_SIGNATURE, FILE_MODIFIED, APPROVAL_NOT_VALID, VERIFICATION_UNAVAILABLE
    canonical_payload = Column(Text, nullable=False)  # Canonical JSON signed
    signature = Column(Text, nullable=False)  # Ed25519 digital signature in hex
    algorithm = Column(String(32), default="Ed25519", nullable=False)
    key_id = Column(String(64), default="brandguard-root-ed25519-v1", nullable=False)
    public_key = Column(String(64), nullable=False)  # Ed25519 public key in hex
    schema_version = Column(String(16), default="1.0", nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    revoked_by = Column(String(255), nullable=True)
    revocation_reason = Column(Text, nullable=True)
    evidence_citations_json = Column(JSON, nullable=True)
    total_checks = Column(Integer, default=0)
    critical_issues_resolved = Column(Integer, default=0)
    warnings_resolved = Column(Integer, default=0)
    ai_disclosure = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Legacy fields for backward compatibility
    document_title = Column(String(255), nullable=True)
    author = Column(String(255), nullable=True)
    reviewer = Column(String(255), nullable=True)
    approved_at = Column(String(64), nullable=True)

    project = relationship("ProjectModel")
    submission = relationship("ReviewSubmissionModel")


class ContentVersionModel(Base):
    __tablename__ = "content_versions"

    id = Column(String(64), primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    review_type = Column(String(32), nullable=False, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    file_id = Column(String(64), nullable=True)
    version_number = Column(String(16), nullable=False)
    parent_version_id = Column(String(64), nullable=True)
    content_text = Column(Text, nullable=True)
    media_path = Column(String(255), nullable=True)
    media_type = Column(String(32), default="text")  # text, image, video
    change_summary = Column(Text, nullable=True)
    change_source = Column(String(32), default="user_applied")  # initial, ai_suggested, user_edited, user_applied
    status = Column(String(32), default="current")  # current, superseded
    author = Column(String(255), default="System")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("ProjectModel")


class CorrectionRecordModel(Base):
    __tablename__ = "correction_records"

    id = Column(String(64), primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    review_type = Column(String(32), nullable=False, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    finding_id = Column(String(64), nullable=False, index=True)
    original_text_span = Column(Text, nullable=True)
    ai_suggested_correction = Column(Text, nullable=False)
    user_edited_correction = Column(Text, nullable=True)
    applied_correction = Column(Text, nullable=True)
    status = Column(String(32), default="pending", nullable=False)  # pending, accepted, edited_and_accepted, rejected
    explanation = Column(Text, nullable=True)
    rule_reference = Column(String(255), nullable=True)
    dismissal_reason = Column(String(64), nullable=True)
    dismissal_note = Column(Text, nullable=True)
    source_version_id = Column(String(64), nullable=True)
    resulting_version_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("ProjectModel")


# =============================================================================
# Phase 9: Human Operations Review Queue, Lifecycle, Decisions & Change Requests
# =============================================================================

class ReviewSubmissionModel(Base):
    """
    Submissions awaiting or undergoing Human Operations review and authorization.
    Tracks state transitions: submitted -> under_review -> changes_requested/approved/rejected -> resubmitted.
    """
    __tablename__ = "review_submissions"

    id = Column(String(64), primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    company_name = Column(String(255), default="Acme Global Brands", nullable=False)
    project_name = Column(String(255), nullable=False)
    review_type = Column(String(32), nullable=False, index=True)  # legal, promotions, content, images, videos
    file_id = Column(String(64), nullable=True)
    file_name = Column(String(255), nullable=True)
    version_id = Column(String(64), nullable=True)
    version_number = Column(String(16), default="1.0", nullable=False)
    status = Column(String(32), default="submitted", nullable=False, index=True)
    # Status lifecycle: submitted, under_review, changes_requested, resubmitted, approved, rejected
    submitted_by = Column(String(255), nullable=False)
    submitted_by_id = Column(String(64), nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    assigned_reviewer = Column(String(255), nullable=True)
    assigned_reviewer_id = Column(String(64), nullable=True)
    findings_count = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    content_summary = Column(Text, nullable=True)
    content_text = Column(Text, nullable=True)
    findings_json = Column(JSON, nullable=True)
    latest_report_id = Column(String(128), nullable=True)
    approved_version_number = Column(String(16), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("ProjectModel")
    decisions = relationship("ReviewDecisionModel", back_populates="submission", cascade="all, delete-orphan", order_by="ReviewDecisionModel.created_at.desc()")
    change_requests = relationship("ChangeRequestModel", back_populates="submission", cascade="all, delete-orphan")


class ReviewDecisionModel(Base):
    """
    Immutable audit record of a human reviewer decision.
    Cannot be overwritten or deleted by ordinary editing.
    """
    __tablename__ = "review_decisions"

    id = Column(String(64), primary_key=True, index=True)
    submission_id = Column(String(64), ForeignKey("review_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(64), nullable=False, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    review_type = Column(String(32), nullable=False)
    version_id = Column(String(64), nullable=True)
    version_number = Column(String(16), nullable=False)
    reviewer_id = Column(String(64), nullable=False)
    reviewer_name = Column(String(255), nullable=False)
    reviewer_role = Column(String(32), nullable=False)  # operations_reviewer, operations_admin
    decision = Column(String(32), nullable=False)  # approved, changes_requested, rejected
    previous_status = Column(String(32), nullable=False)
    resulting_status = Column(String(32), nullable=False)
    comments = Column(Text, nullable=False)
    actionable_instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("ReviewSubmissionModel", back_populates="decisions")


class ChangeRequestModel(Base):
    """
    Customer change requests and reviewer instruction items.
    """
    __tablename__ = "change_requests"

    id = Column(String(64), primary_key=True, index=True)
    submission_id = Column(String(64), ForeignKey("review_submissions.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(String(64), nullable=True, index=True)
    company_id = Column(String(64), default="acme-global-brands", nullable=False, index=True)
    title = Column(String(255), nullable=False)
    request_type = Column(String(64), nullable=False)  # Rule Exception, New Disclaimer, Claim Expiry Extension, Reviewer Requested Revision
    description = Column(Text, nullable=False)
    priority = Column(String(16), default="medium")  # low, medium, high, critical
    requested_by = Column(String(255), nullable=False)
    submitted_at = Column(String(32), nullable=False)
    status = Column(String(32), default="pending_review")  # pending_review, changes_requested, resubmitted, approved, rejected, resolved
    admin_response = Column(Text, nullable=True)
    target_version = Column(String(16), nullable=True)
    reviewer_feedback = Column(Text, nullable=True)
    customer_reply = Column(Text, nullable=True)
    resubmitted_version = Column(String(16), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    submission = relationship("ReviewSubmissionModel", back_populates="change_requests")


# =============================================================================
# Admin Inbox: Inbound Request Form Submissions
# =============================================================================

class InboxSubmissionModel(Base):
    """
    Inbound request and inquiry submissions from public request forms,
    enterprise demo requests, and customer contact workflows.
    Maintained separately in the Operations Admin Inbox.
    """
    __tablename__ = "inbox_submissions"

    id = Column(String(64), primary_key=True, index=True)
    contact_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    job_title = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
    website = Column(String(255), nullable=True)
    team_size = Column(String(64), nullable=True)
    request_type = Column(String(64), default="Enterprise Evaluation", nullable=False, index=True)
    service_interest = Column(String(128), nullable=True)
    campaign_details = Column(Text, nullable=True)
    message = Column(Text, nullable=False)
    attachments_json = Column(JSON, nullable=True)
    source_page = Column(String(255), default="/#contact")
    source_form = Column(String(128), default="contact_form")
    status = Column(String(32), default="new", nullable=False, index=True)  # new, in_review, awaiting_info, converted, closed
    assigned_to_id = Column(String(64), nullable=True)
    assigned_to_name = Column(String(255), nullable=True)
    internal_notes = Column(Text, nullable=True)
    converted_project_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

