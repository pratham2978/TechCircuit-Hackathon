from app.database import engine, Base, SessionLocal
from app.models import (
    UserModel,
    ProjectModel,
    ProjectFileModel,
    GuidelineDocModel,
    GuidelineChunkModel,
    BrandRuleModel,
    ApprovedClaimModel,
    BrandPassportModel,
    ChangeRequestModel,
    ContentVersionModel,
    CorrectionRecordModel,
    ReviewSubmissionModel,
    ReviewDecisionModel,
    InboxSubmissionModel
)
from app.auth import hash_password
from datetime import datetime


def init_database():
    """
    Safely create all application tables on the configured database engine (PostgreSQL or SQLite).
    Preserves all existing tables and data.
    """
    Base.metadata.create_all(bind=engine)

    # Safely migrate missing Phase 7 & Phase 9 columns for existing SQLite / Postgres tables
    from sqlalchemy import text
    with engine.connect() as conn:
        migrations = [
            ("guidelines", "company_id", "VARCHAR(64) DEFAULT 'acme-global-brands' NOT NULL"),
            ("guidelines", "extracted_text", "TEXT"),
            ("brand_rules", "company_id", "VARCHAR(64) DEFAULT 'acme-global-brands' NOT NULL"),
            ("brand_rules", "source_doc", "VARCHAR(255) DEFAULT 'Brand Guidelines 2026.pdf' NOT NULL"),
            ("brand_rules", "source_page", "INTEGER DEFAULT 1 NOT NULL"),
            ("approved_claims", "company_id", "VARCHAR(64) DEFAULT 'acme-global-brands' NOT NULL"),
            ("approved_claims", "source_doc", "VARCHAR(255) DEFAULT 'Corporate Benchmarking Report 2026' NOT NULL"),
            ("approved_claims", "source_page", "INTEGER DEFAULT 1 NOT NULL"),
            ("change_requests", "submission_id", "VARCHAR(64)"),
            ("change_requests", "project_id", "VARCHAR(64)"),
            ("change_requests", "company_id", "VARCHAR(64) DEFAULT 'acme-global-brands'"),
            ("change_requests", "target_version", "VARCHAR(16)"),
            ("change_requests", "reviewer_feedback", "TEXT"),
            ("change_requests", "customer_reply", "TEXT"),
            ("change_requests", "resubmitted_version", "VARCHAR(16)"),
            ("change_requests", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("change_requests", "updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("brand_passports", "passport_number", "VARCHAR(64) DEFAULT 'BP-2026-LEGACY'"),
            ("brand_passports", "submission_id", "VARCHAR(64)"),
            ("brand_passports", "project_id", "VARCHAR(64) DEFAULT 'proj-summer-2027'"),
            ("brand_passports", "project_name", "VARCHAR(255) DEFAULT 'Summer Sale 2027'"),
            ("brand_passports", "company_id", "VARCHAR(64) DEFAULT 'acme-global-brands'"),
            ("brand_passports", "company_name", "VARCHAR(255) DEFAULT 'Acme Global Brands'"),
            ("brand_passports", "review_type", "VARCHAR(32) DEFAULT 'videos'"),
            ("brand_passports", "approved_version_number", "VARCHAR(16) DEFAULT '1.0'"),
            ("brand_passports", "decision_id", "VARCHAR(64)"),
            ("brand_passports", "approved_file_name", "VARCHAR(255) DEFAULT 'Summer_Teaser_30s.mp4'"),
            ("brand_passports", "approved_file_hash", "VARCHAR(64) DEFAULT 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'"),
            ("brand_passports", "file_storage_path", "VARCHAR(255)"),
            ("brand_passports", "guideline_version", "VARCHAR(32) DEFAULT '2026.1'"),
            ("brand_passports", "authorized_reviewer_id", "VARCHAR(64) DEFAULT 'usr-elena'"),
            ("brand_passports", "authorized_reviewer_name", "VARCHAR(255) DEFAULT 'Elena Rostova'"),
            ("brand_passports", "status", "VARCHAR(32) DEFAULT 'VERIFIED'"),
            ("brand_passports", "canonical_payload", "TEXT"),
            ("brand_passports", "signature", "TEXT"),
            ("brand_passports", "algorithm", "VARCHAR(32) DEFAULT 'Ed25519'"),
            ("brand_passports", "key_id", "VARCHAR(64) DEFAULT 'brandguard-root-ed25519-v1'"),
            ("brand_passports", "public_key", "VARCHAR(64)"),
            ("brand_passports", "schema_version", "VARCHAR(16) DEFAULT '1.0'"),
            ("brand_passports", "issued_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("brand_passports", "revoked_at", "TIMESTAMP"),
            ("brand_passports", "revoked_by", "VARCHAR(255)"),
            ("brand_passports", "revocation_reason", "TEXT"),
            ("brand_passports", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("brand_passports", "updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        ]
        for tbl, col, col_type in migrations:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                # Column already exists or table freshly created
                pass

    db = SessionLocal()

    try:
        # Seed initial projects if empty
        if db.query(ProjectModel).count() == 0:
            summer_proj = ProjectModel(
                id="proj-summer-2027",
                name="Summer Sale 2027",
                description="Global mid-year marketing campaign, promotional offers, and digital ad creative.",
                status="in_review",
                client_name="Acme Global Brands",
                owner="Sarah Chen (Lead Marketer)"
            )
            db.add(summer_proj)
            db.commit()

            # Seed files
            legal_file = ProjectFileModel(
                id="f-01",
                project_id="proj-summer-2027",
                name="Master_Enterprise_Legal_Terms.docx",
                file_type="docx",
                review_type="legal",
                status="in_progress",
                version="1.0",
                findings_count=2,
                reviewer="Elena Rostova",
                current_text="Provider guarantees 100% uptime SLA without exception for all hybrid cloud instances.",
                original_text="Provider guarantees 100% uptime SLA without exception for all hybrid cloud instances."
            )
            promo_file = ProjectFileModel(
                id="f-02",
                project_id="proj-summer-2027",
                name="Promotional_Discount_Terms_Addendum.pdf",
                file_type="pdf",
                review_type="promotions",
                status="in_progress",
                version="0.9",
                findings_count=1,
                reviewer="Elena Rostova",
                current_text="Save 70% on all enterprise suites through end of year.",
                original_text="Save 70% on all enterprise suites through end of year."
            )
            content_file = ProjectFileModel(
                id="f-03",
                project_id="proj-summer-2027",
                name="Summer_Sale_Promotional_Brief.docx",
                file_type="docx",
                review_type="content",
                status="in_progress",
                version="1.0",
                findings_count=1,
                reviewer="Sarah Chen",
                current_text="BrandGuard Cloud is the only platform that delivers 100% foolproof automated compliance.",
                original_text="BrandGuard Cloud is the only platform that delivers 100% foolproof automated compliance."
            )
            image_file = ProjectFileModel(
                id="f-04",
                project_id="proj-summer-2027",
                name="Campaign_Hero_Banner_1200x630.png",
                file_type="png",
                review_type="images",
                status="not_started",
                version="1.0",
                findings_count=0
            )
            video_file = ProjectFileModel(
                id="f-05",
                project_id="proj-summer-2027",
                name="Summer_Promotion_Teaser_30s.mp4",
                file_type="mp4",
                review_type="videos",
                status="not_started",
                version="1.0",
                findings_count=0
            )
            db.add_all([legal_file, promo_file, content_file, image_file, video_file])
            db.commit()

        # Seed initial guideline document if missing
        if not db.query(GuidelineDocModel).filter(GuidelineDocModel.id == "g-01").first():
            g1 = GuidelineDocModel(
                id="g-01",
                company_id="acme-global-brands",
                title="BrandGuard Global Brand Identity & Tone Master Guide",
                file_name="BrandGuard_Brand_Master_2026_v4.pdf",
                file_size="4.8 MB",
                version="4.2",
                status="indexed",
                pages_count=42,
                proposed_rules_count=2,
                approved_rules_count=14,
                sample_passage="BrandGuard maintains an uncompromising stance on veracity. We never publish unsubstantiated superlatives. Precision precedes persuasion in all enterprise statements.",
                extracted_text="BrandGuard Brand Playbook.\n\nSection 1: General Brand Tenets. All communications must be factual, grounded, and verified.\n\nSection 2: Legal Contracts & Liability. Absolute uptime guarantees of 100% are strictly barred. SLAs must reflect commercially viable 99.9% uptime with service credit remedies.\n\nSection 3: Promotions & Discounts. Every discount figure must cite an approved claim record and explicitly define the campaign end date.\n\nSection 4: Visuals & Video. Text overlays must sustain WCAG 2.1 AA 4.5:1 contrast. Lower-third super titles must remain visible for at least 4.0 continuous seconds."
            )
            db.add(g1)
            db.commit()

        # Seed sample guideline chunks if missing
        chunk_list = [
            GuidelineChunkModel(
                id="chk-01",
                document_id="g-01",
                company_id="acme-global-brands",
                chunk_index=0,
                page_number=1,
                section_title="General Brand Tenets",
                content="All communications must be factual, grounded, and verified. Superlatives such as '100% foolproof' or 'the only platform' are strictly barred without a validated clinical or metric fact sheet."
            ),
            GuidelineChunkModel(
                id="chk-02",
                document_id="g-01",
                company_id="acme-global-brands",
                chunk_index=1,
                page_number=12,
                section_title="Legal Contracts & Liability",
                content="Absolute uptime guarantees of 100% are strictly barred. SLAs must reflect commercially viable 99.9% uptime with service credit remedies. Standard Contractual Clauses (SCCs) are mandatory for EU data transfers."
            ),
            GuidelineChunkModel(
                id="chk-03",
                document_id="g-01",
                company_id="acme-global-brands",
                chunk_index=2,
                page_number=24,
                section_title="Promotions & Discounts",
                content="Every discount figure (e.g. 70% off) must cite an approved claim record and explicitly define the campaign end date. Disclaimers must be conspicuous, not concealed in ambiguous asterisks."
            ),
            GuidelineChunkModel(
                id="chk-04",
                document_id="g-01",
                company_id="acme-global-brands",
                chunk_index=3,
                page_number=35,
                section_title="Visuals & Video Standards",
                content="Text overlays must sustain WCAG 2.1 AA 4.5:1 contrast on all backgrounds. Lower-third super titles must remain visible for at least 4.0 continuous seconds. Audible spoken terms disclaimers are required when pricing is mentioned."
            )
        ]
        for chk in chunk_list:
            if not db.query(GuidelineChunkModel).filter(GuidelineChunkModel.id == chk.id).first():
                db.add(chk)
        db.commit()

        # Seed initial rules if missing
        rules_to_seed = [
            BrandRuleModel(
                id="RULE-LG-01",
                company_id="acme-global-brands",
                title="Prohibit Absolute SLA Guarantees",
                category="legal",
                rule_type="prohibited_term",
                term_or_pattern="100% uptime",
                preferred_alternative="delivers enterprise-grade high availability (99.9% SLA)",
                explanation="Never guarantee 100% cloud uptime without scheduled maintenance exclusions. Standard target must be 99.9% commercially reasonable availability.",
                severity="critical",
                status="approved",
                source_doc="Master Enterprise Legal Guidelines v2.4",
                source_page=12
            ),
            BrandRuleModel(
                id="RULE-LG-02",
                company_id="acme-global-brands",
                title="Mandatory Cross-Border Transfer SCC Disclosure",
                category="disclaimers",
                rule_type="disclaimer",
                term_or_pattern="cross-border data transfer",
                preferred_alternative="Transfers subject to standard contractual clauses (SCCs) approved by the European Commission",
                explanation="All international cloud processing agreements must incorporate explicit EEA Standard Contractual Clauses.",
                severity="warning",
                status="approved",
                source_doc="Master Enterprise Legal Guidelines v2.4",
                source_page=18
            ),
            BrandRuleModel(
                id="RULE-PR-01",
                company_id="acme-global-brands",
                title="Promotional Discount Substantiation",
                category="promotions",
                rule_type="restriction",
                term_or_pattern="discount percent",
                preferred_alternative="Save up to 50% on select annual enterprise tiers",
                explanation="Discount claims exceeding 50% are prohibited unless explicitly authorized in the active claim ledger.",
                severity="critical",
                status="approved",
                source_doc="Global Promotion & Claim Policy 2026",
                source_page=6
            ),
            BrandRuleModel(
                id="RULE-PR-02",
                company_id="acme-global-brands",
                title="Mandatory Promotion Expiration Notice",
                category="disclaimers",
                rule_type="disclaimer",
                term_or_pattern="promotional offer",
                preferred_alternative="Offer valid through specified calendar date (e.g., December 31, 2027)",
                explanation="Promotional announcements must state explicit calendar expiration dates.",
                severity="warning",
                status="approved",
                source_doc="Global Promotion & Claim Policy 2026",
                source_page=8
            ),
            BrandRuleModel(
                id="RULE-CT-01",
                company_id="acme-global-brands",
                title="Prohibit Unsubstantiated Superlatives",
                category="content",
                rule_type="prohibited_term",
                term_or_pattern="only platform",
                preferred_alternative="a premier enterprise brand-governance solution",
                explanation="Phrases asserting singular market dominance like 'the only platform' or '100% foolproof' are prohibited unless cited.",
                severity="warning",
                status="approved",
                source_doc="BrandGuard Voice & Editorial Playbook",
                source_page=4
            ),
            BrandRuleModel(
                id="RULE-DS-01",
                company_id="acme-global-brands",
                title="WCAG 2.1 AA 4.5:1 Contrast Threshold",
                category="visual",
                rule_type="restriction",
                term_or_pattern="contrast ratio",
                preferred_alternative="Use Deep Ink (#0D1B2A) or Warm Ivory (#F7F5F0) to ensure >= 4.5:1 ratio",
                explanation="All on-screen typography on colored banners must sustain at least 4.5:1 contrast ratio against the background.",
                severity="critical",
                status="approved",
                source_doc="Visual Design Standards 2026",
                source_page=14
            ),
            BrandRuleModel(
                id="RULE-VD-01",
                company_id="acme-global-brands",
                title="Minimum 4.0s On-Screen Super Duration",
                category="videos",
                rule_type="restriction",
                term_or_pattern="super title duration",
                preferred_alternative="Hold disclaimer title card for 4.0 to 5.0 continuous seconds",
                explanation="Legal disclaimers in lower-third banners must remain on screen for a minimum of 4.0 seconds for viewer readability.",
                severity="warning",
                status="approved",
                source_doc="Broadcast Compliance Manual",
                source_page=9
            )
        ]
        for r in rules_to_seed:
            if not db.query(BrandRuleModel).filter(BrandRuleModel.id == r.id).first():
                db.add(r)
        db.commit()

        # Seed claims if missing
        claims_to_seed = [
            ApprovedClaimModel(
                id="CLM-2026-081",
                company_id="acme-global-brands",
                claim_text="Processes over 100 million corporate governance checks annually with sub-second retrieval latency.",
                source_doc="Global Infrastructure Metrics Report 2026",
                source_page=14,
                owner="Chief Platform Architect",
                valid_from="2026-01-01",
                valid_to="2026-12-31",
                status="VERIFIED",
                context_notes="Validated across aggregated platform audit telemetry."
            ),
            ApprovedClaimModel(
                id="CLM-2026-042",
                company_id="acme-global-brands",
                claim_text="Delivers 99.9% commercially reasonable availability for hybrid cloud compliance workloads.",
                source_doc="Cloud SLA Verification Ledger",
                source_page=2,
                owner="VP Cloud Engineering",
                valid_from="2026-01-01",
                valid_to="2027-12-31",
                status="VERIFIED",
                context_notes="Authorized SLA figure for marketing brochures and client MSAs."
            )
        ]
        for c in claims_to_seed:
            if not db.query(ApprovedClaimModel).filter(ApprovedClaimModel.id == c.id).first():
                db.add(c)
        db.commit()

        # Seed default users with salted PBKDF2 passwords if empty
        if db.query(UserModel).count() == 0:
            p_hash, salt = hash_password("brandguard2026")
            users_to_seed = [
                UserModel(
                    id="usr-sarah",
                    email="sarah.chen@acme.com",
                    name="Sarah Chen (Company Submitter)",
                    password_hash=p_hash,
                    salt=salt,
                    role="company_user",
                    company_id="acme-global-brands",
                    company_name="Acme Global Brands",
                    is_active=True
                ),
                UserModel(
                    id="usr-elena",
                    email="elena.rostova@brandguard.io",
                    name="Elena Rostova (Operations Reviewer)",
                    password_hash=p_hash,
                    salt=salt,
                    role="operations_reviewer",
                    company_id="brandguard-ops",
                    company_name="BrandGuard Operations Hub",
                    is_active=True
                ),
                UserModel(
                    id="usr-alex",
                    email="admin@brandguard.io",
                    name="Alex Vance (Operations Admin)",
                    password_hash=p_hash,
                    salt=salt,
                    role="operations_admin",
                    company_id="brandguard-ops",
                    company_name="BrandGuard Operations Hub",
                    is_active=True
                )
            ]
            for u in users_to_seed:
                db.add(u)
            db.commit()

        # Seed initial review submissions across all lifecycle statuses if empty
        if db.query(ReviewSubmissionModel).count() == 0:
            subs_to_seed = [
                ReviewSubmissionModel(
                    id="sub-summer-legal",
                    project_id="proj-summer-2027",
                    company_id="acme-global-brands",
                    company_name="Acme Global Brands",
                    project_name="Summer Sale 2027",
                    review_type="legal",
                    file_id="f-01",
                    file_name="Master_Enterprise_Legal_Terms.docx",
                    version_number="1.0",
                    status="submitted",
                    submitted_by="Sarah Chen (Lead Marketer)",
                    submitted_by_id="usr-sarah",
                    submitted_at=datetime.utcnow(),
                    findings_count=2,
                    critical_count=1,
                    content_summary="Vendor liability and binding arbitration terms pending Human Operations review.",
                    content_text="The Vendor liability shall be totally unlimited under all circumstances without exception.",
                    findings_json=[
                        {
                            "id": "f-leg-01",
                            "severity": "critical",
                            "title": "Unlimited Liability Clause",
                            "explanation": "Vendor liability must be capped at 12 months fees paid.",
                            "ruleReference": "RULE-LEG-001 (Liability Cap Mandate)",
                            "suggestedCorrection": "The Vendor aggregate liability shall be capped at fees paid in prior 12 months."
                        }
                    ],
                    latest_report_id="proj-summer-2027-legal"
                ),
                ReviewSubmissionModel(
                    id="sub-summer-promo",
                    project_id="proj-summer-2027",
                    company_id="acme-global-brands",
                    company_name="Acme Global Brands",
                    project_name="Summer Sale 2027",
                    review_type="promotions",
                    file_id="f-02",
                    file_name="Promotional_Discount_Addendum.pdf",
                    version_number="1.0",
                    status="under_review",
                    assigned_reviewer="Elena Rostova (Operations Reviewer)",
                    assigned_reviewer_id="usr-elena",
                    submitted_by="Sarah Chen (Lead Marketer)",
                    submitted_by_id="usr-sarah",
                    submitted_at=datetime.utcnow(),
                    findings_count=1,
                    critical_count=0,
                    content_summary="50% promotional discount copy undergoing active evidentiary cross-verification.",
                    content_text="Save 50% on all enterprise subscriptions this summer season.",
                    findings_json=[
                        {
                            "id": "f-pro-01",
                            "severity": "warning",
                            "title": "Missing Expiry Date",
                            "explanation": "Discount claims must explicitly include campaign termination date.",
                            "ruleReference": "RULE-PROMO-001",
                            "suggestedCorrection": "Save 50% on all enterprise annual subscriptions through August 31, 2027."
                        }
                    ],
                    latest_report_id="proj-summer-2027-promotions"
                ),
                ReviewSubmissionModel(
                    id="sub-summer-content",
                    project_id="proj-summer-2027",
                    company_id="acme-global-brands",
                    company_name="Acme Global Brands",
                    project_name="Summer Sale 2027",
                    review_type="content",
                    file_id="f-03",
                    file_name="Summer_Campaign_Hero_Brief.docx",
                    version_number="1.0",
                    status="changes_requested",
                    assigned_reviewer="Elena Rostova (Operations Reviewer)",
                    assigned_reviewer_id="usr-elena",
                    submitted_by="Sarah Chen (Lead Marketer)",
                    submitted_by_id="usr-sarah",
                    submitted_at=datetime.utcnow(),
                    findings_count=3,
                    critical_count=1,
                    content_summary="Brand voice brief requires substantiated citation for speed claims.",
                    content_text="Our platform is guaranteed to be 70% faster than all legacy solutions.",
                    findings_json=[
                        {
                            "id": "f-cnt-01",
                            "severity": "critical",
                            "title": "Unsubstantiated Performance Superlative",
                            "explanation": "Speed comparisons must reference authorized benchmarking reports.",
                            "ruleReference": "RULE-CLM-002",
                            "suggestedCorrection": "Delivers 99.9% commercially reasonable availability for hybrid cloud compliance workloads."
                        }
                    ],
                    latest_report_id="proj-summer-2027-content"
                ),
                ReviewSubmissionModel(
                    id="sub-summer-images",
                    project_id="proj-summer-2027",
                    company_id="acme-global-brands",
                    company_name="Acme Global Brands",
                    project_name="Summer Sale 2027",
                    review_type="images",
                    file_id="f-04",
                    file_name="Hero_Banner_1200x630.png",
                    version_number="1.1",
                    status="resubmitted",
                    assigned_reviewer="Elena Rostova (Operations Reviewer)",
                    assigned_reviewer_id="usr-elena",
                    submitted_by="Sarah Chen (Lead Marketer)",
                    submitted_by_id="usr-sarah",
                    submitted_at=datetime.utcnow(),
                    findings_count=1,
                    critical_count=0,
                    content_summary="Resubmitted banner design with updated WCAG AA contrast ratio.",
                    content_text="Campaign Hero Banner 1200x630. Palette: Deep Ink (#14212B) and Warm Ivory (#F7F5F0).",
                    findings_json=[],
                    latest_report_id="proj-summer-2027-images"
                ),
                ReviewSubmissionModel(
                    id="sub-summer-videos",
                    project_id="proj-summer-2027",
                    company_id="acme-global-brands",
                    company_name="Acme Global Brands",
                    project_name="Summer Sale 2027",
                    review_type="videos",
                    file_id="f-05",
                    file_name="Summer_Teaser_30s.mp4",
                    version_number="1.0",
                    status="approved",
                    approved_version_number="1.0",
                    assigned_reviewer="Elena Rostova (Operations Reviewer)",
                    assigned_reviewer_id="usr-elena",
                    submitted_by="Sarah Chen (Lead Marketer)",
                    submitted_by_id="usr-sarah",
                    submitted_at=datetime.utcnow(),
                    findings_count=0,
                    critical_count=0,
                    content_summary="30-second teaser footage certified compliant with audio disclaimers and token margins.",
                    content_text="Teaser video: 30 seconds duration. Disclaimer display: 4.2 seconds at 00:24.",
                    findings_json=[],
                    latest_report_id="proj-summer-2027-videos"
                )
            ]
            for s in subs_to_seed:
                db.add(s)
            db.commit()

            # Seed decision for changes_requested submission
            sub_c = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == "sub-summer-content").first()
            if sub_c:
                dec = ReviewDecisionModel(
                    id="dec-init-01",
                    submission_id=sub_c.id,
                    project_id=sub_c.project_id,
                    company_id=sub_c.company_id,
                    review_type=sub_c.review_type,
                    version_number="1.0",
                    reviewer_id="usr-elena",
                    reviewer_name="Elena Rostova (Operations Reviewer)",
                    reviewer_role="operations_reviewer",
                    decision="changes_requested",
                    previous_status="under_review",
                    resulting_status="changes_requested",
                    comments="The 70% speed claim violates corporate claim rules. Please revise using our authorized ledger claim CLM-2026-081.",
                    actionable_instructions="Replace superlative speed statement with verified latency or uptime claim from our approved ledger."
                )
                db.add(dec)

                cr = ChangeRequestModel(
                    id="cr-init-01",
                    submission_id=sub_c.id,
                    project_id=sub_c.project_id,
                    company_id=sub_c.company_id,
                    title="Required Performance Claim Revision (Summer Sale 2027)",
                    request_type="Reviewer Requested Revision",
                    description="Replace superlative speed statement with verified latency or uptime claim from our approved ledger.",
                    priority="high",
                    requested_by="Elena Rostova (BrandGuard Operations)",
                    submitted_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                    status="changes_requested",
                    reviewer_feedback="The 70% speed claim violates corporate claim rules. Please revise using our authorized ledger claim CLM-2026-081.",
                    target_version="1.0"
                )
                db.add(cr)
                db.commit()

            # Seed approval decision for videos
            sub_v = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == "sub-summer-videos").first()
            if sub_v:
                dec_v = ReviewDecisionModel(
                    id="dec-init-02",
                    submission_id=sub_v.id,
                    project_id=sub_v.project_id,
                    company_id=sub_v.company_id,
                    review_type=sub_v.review_type,
                    version_number="1.0",
                    reviewer_id="usr-elena",
                    reviewer_name="Elena Rostova (Operations Reviewer)",
                    reviewer_role="operations_reviewer",
                    decision="approved",
                    previous_status="under_review",
                    resulting_status="approved",
                    comments="All on-screen durations exceed the 4.0s threshold and logo margins use official palette tokens. Approved for distribution.",
                    actionable_instructions=None
                )
                db.add(dec_v)
                db.commit()

        # Seed initial certified Brand Passport for approved video submission if empty
        if db.query(BrandPassportModel).count() == 0:
            from app.crypto_service import mint_brand_passport
            user_elena = db.query(UserModel).filter(UserModel.id == "usr-elena").first()
            sub_v = db.query(ReviewSubmissionModel).filter(ReviewSubmissionModel.id == "sub-summer-videos").first()
            if user_elena and sub_v and sub_v.status == "approved":
                try:
                    mint_brand_passport(db, "sub-summer-videos", user_elena, guideline_version="2026.1")
                except Exception as e:
                    print(f"Seed passport notice: {e}")

        # Seed initial request-form submissions in Inbox if empty
        if db.query(InboxSubmissionModel).count() == 0:
            initial_inbox = [
                InboxSubmissionModel(
                    id="inbox-sub-001",
                    contact_name="Victoria Sterling",
                    email="v.sterling@novartis-pharma.com",
                    company_name="Novartis Healthcare AG",
                    job_title="VP Global Regulatory Affairs",
                    phone="+41 61 324 1111",
                    website="https://www.novartis.com",
                    team_size="50-200 reviewers",
                    request_type="Enterprise Evaluation",
                    service_interest="Legal Document Review & Promotion Claims",
                    campaign_details="Q4 Multi-jurisdiction clinical trial promotional collateral rollout across EU and US.",
                    message="We need automated RAG-grounded pre-clearance for our European prescription claim statements and localized French/German disclaimer standards. Looking to integrate into our editorial workflow.",
                    source_page="/#contact",
                    source_form="enterprise_evaluation_contact",
                    status="new",
                    assigned_to_id="usr-elena",
                    assigned_to_name="Elena Rostova (Operations Reviewer)",
                    internal_notes="High-priority enterprise pharma account. Evaluating compliance rules against EMA directives.",
                    created_at=datetime.utcnow()
                ),
                InboxSubmissionModel(
                    id="inbox-sub-002",
                    contact_name="Marcus Vance",
                    email="marcus.vance@fintech-apex.io",
                    company_name="Apex Global Financial",
                    job_title="Head of Growth Marketing",
                    phone="+1 415 555 8920",
                    website="https://fintech-apex.io",
                    team_size="10-50 reviewers",
                    request_type="Demo Request",
                    service_interest="Promotion & Offer Claims Review",
                    campaign_details="Summer Tier-1 Consumer Yield campaign launching June 2027.",
                    message="Our copywriters frequently draft interest rate and cashback offers that require strict SEC/FINRA disclaimers. We need automated claim ledger verification and brand passports for ad networks.",
                    source_page="/#demo",
                    source_form="demo_request_modal",
                    status="in_review",
                    assigned_to_id="usr-elena",
                    assigned_to_name="Elena Rostova (Operations Reviewer)",
                    internal_notes="Demo scheduled. Reviewing their sample disclaimers against financial rule templates.",
                    created_at=datetime.utcnow()
                ),
                InboxSubmissionModel(
                    id="inbox-sub-003",
                    contact_name="Hanna Lindqvist",
                    email="hanna.l@nordicretail.se",
                    company_name="Nordic Retail Group",
                    job_title="Brand Governance Director",
                    phone="+46 8 123 4567",
                    website="https://nordicretail.se",
                    team_size="10-50 reviewers",
                    request_type="Contact Inquiry",
                    service_interest="Image & Design Review",
                    campaign_details="Omnichannel spring catalog and digital signage video spots.",
                    message="Requesting technical evaluation of automated contrast ratio checks (WCAG 2.1 AA) and palette compliance for high-resolution video and banner assets.",
                    source_page="/#contact",
                    source_form="enterprise_evaluation_contact",
                    status="awaiting_info",
                    assigned_to_id="usr-elena",
                    assigned_to_name="Elena Rostova (Operations Reviewer)",
                    internal_notes="Awaiting sample brand guidelines PDF and color palette token specifications.",
                    created_at=datetime.utcnow()
                )
            ]
            for item in initial_inbox:
                db.add(item)
            db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    init_database()
    print("Database tables initialized successfully.")

