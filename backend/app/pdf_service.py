"""
BrandGuard Backend PDF Report Generation Service
Generates professional, multi-page, publication-grade compliance audit reports
using ReportLab with precise typography, BrandGuard brand tokens,
page numbering ('Page X of Y'), and robust text-wrapping.
"""

import io
import html
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable
)
from reportlab.pdfgen import canvas


# BrandGuard Brand Color Palette
COLOR_DEEP_INK = colors.HexColor("#0D1B2A")
COLOR_HEADER_BG = colors.HexColor("#14212B")
COLOR_SIGNAL_CORAL = colors.HexColor("#F16B50")
COLOR_ERROR_RED = colors.HexColor("#E63946")
COLOR_WARNING_ORANGE = colors.HexColor("#E76F51")
COLOR_EVIDENCE_TEAL = colors.HexColor("#167C78")
COLOR_WARM_IVORY = colors.HexColor("#F7F5F0")
COLOR_MUTED_SLATE = colors.HexColor("#64727D")
COLOR_BORDER_GRAY = colors.HexColor("#DDE2E2")
COLOR_LIGHT_BG = colors.HexColor("#FAF9F6")
COLOR_CARD_BG = colors.HexColor("#FFFFFF")
COLOR_REPLACEMENT_BG = colors.HexColor("#EDF6F5")


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' on all pages.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        page_w, page_h = letter

        # Running Top Header (Pages 2+)
        if self._pageNumber > 1:
            self.setFillColor(COLOR_MUTED_SLATE)
            self.setFont("Helvetica-Bold", 8)
            self.drawString(36, page_h - 26, "BRANDGUARD AI  |  GOVERNANCE AUDIT REPORT")
            self.setFont("Helvetica", 8)
            self.drawRightString(page_w - 36, page_h - 26, "CONFIDENTIAL")
            self.setStrokeColor(COLOR_BORDER_GRAY)
            self.setLineWidth(0.5)
            self.line(36, page_h - 30, page_w - 36, page_h - 30)

        # Running Footer (All Pages)
        self.setStrokeColor(COLOR_BORDER_GRAY)
        self.setLineWidth(0.5)
        self.line(36, 32, page_w - 36, 32)

        self.setFillColor(COLOR_MUTED_SLATE)
        self.setFont("Helvetica", 7.5)
        self.drawString(
            36, 20, 
            "BrandGuard AI Compliance Engine  •  Deterministic Enterprise Ground Truth"
        )
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(page_w - 36, 20, page_str)

        self.restoreState()


def safe_text(val: Optional[str]) -> str:
    """Escape arbitrary user strings to prevent ReportLab XML markup breakage."""
    if not val:
        return ""
    return html.escape(str(val))


def generate_review_pdf(report_data: Dict[str, Any]) -> bytes:
    """
    Build a multi-page PDF report from actual analysis data.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=44
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=COLOR_DEEP_INK
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=COLOR_MUTED_SLATE
    )
    section_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=COLOR_DEEP_INK,
        spaceBefore=14,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=COLOR_DEEP_INK
    )
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_DEEP_INK,
        leftIndent=12,
        spaceAfter=4
    )
    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=COLOR_MUTED_SLATE
    )
    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=COLOR_DEEP_INK
    )
    finding_title_style = ParagraphStyle(
        'FindingTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=COLOR_DEEP_INK
    )
    finding_explanation_style = ParagraphStyle(
        'FindingExplanation',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_DEEP_INK,
        spaceBefore=3,
        spaceAfter=4
    )
    citation_style = ParagraphStyle(
        'FindingCitation',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=COLOR_EVIDENCE_TEAL
    )
    replacement_label_style = ParagraphStyle(
        'ReplacementLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=COLOR_EVIDENCE_TEAL
    )
    replacement_text_style = ParagraphStyle(
        'ReplacementText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=COLOR_DEEP_INK
    )
    limitation_style = ParagraphStyle(
        'LimitationText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=COLOR_MUTED_SLATE
    )

    story: List[Any] = []

    # 1. Header Banner
    header_table_data = [
        [
            Paragraph('<font color="#F16B50"><b>BRANDGUARD</b></font>  |  Enterprise Governance', title_style),
            Paragraph(f"<b>Audit Date:</b> {safe_text(report_data.get('review_date', datetime.utcnow().strftime('%Y-%m-%d')))}<br/><b>Security:</b> Restricted Enterprise", subtitle_style)
        ]
    ]
    header_table = Table(header_table_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_SIGNAL_CORAL, spaceAfter=12))

    # 2. Project & Asset Metadata Block
    project_name = report_data.get("project_name", "Acme Enterprise Campaign")
    review_type = report_data.get("review_type", "legal").upper()
    file_name = report_data.get("file_name") or "Direct Submission"
    overall_result = report_data.get("overall_result", "Revisions Recommended")
    reviewer = report_data.get("reviewer") or "BrandGuard Automated AI Auditor"
    findings_list = report_data.get("findings", [])
    key_findings = report_data.get("key_findings", [])
    summary_narration = report_data.get("summary_narration") or "Automated compliance review complete."
    limitation_notice = report_data.get("limitation_notice")

    # Determine Verdict Color
    is_approved = any(w in overall_result.lower() for w in ["approved", "pass", "compliant"])
    is_critical = any(f.get("severity") in ["critical", "high"] for f in findings_list) or "changes required" in overall_result.lower()

    verdict_bg = colors.HexColor("#FDEDED") if is_critical else colors.HexColor("#E6F4EA") if is_approved else colors.HexColor("#FFF4E5")
    verdict_text_color = COLOR_ERROR_RED if is_critical else COLOR_EVIDENCE_TEAL if is_approved else COLOR_WARNING_ORANGE

    meta_cells = [
        [
            Paragraph("PROJECT", meta_label_style),
            Paragraph("REVIEW FEATURE", meta_label_style),
            Paragraph("SUBMITTED ASSET", meta_label_style),
            Paragraph("TOTAL FINDINGS", meta_label_style)
        ],
        [
            Paragraph(safe_text(project_name), meta_val_style),
            Paragraph(safe_text(review_type), meta_val_style),
            Paragraph(safe_text(file_name), meta_val_style),
            Paragraph(f"{len(findings_list)} Policy Flags", meta_val_style)
        ]
    ]
    meta_table = Table(meta_cells, colWidths=[160, 130, 160, 90])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Overall Result Verdict Banner
    verdict_content = [
        [
            Paragraph("<b>COMPLIANCE VERDICT:</b>", meta_label_style),
            Paragraph(f"<b><font size=11 color='{verdict_text_color.hexval()}'>{safe_text(overall_result.upper())}</font></b>", body_style)
        ]
    ]
    verdict_table = Table(verdict_content, colWidths=[140, 400])
    verdict_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), verdict_bg),
        ('BOX', (0, 0), (-1, -1), 1, verdict_text_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(verdict_table)
    story.append(Spacer(1, 12))

    # 4. Executive Summary
    story.append(Paragraph("Executive Summary", section_h1))
    story.append(Paragraph(safe_text(summary_narration), body_style))
    story.append(Spacer(1, 10))

    # 5. Key Findings Summary
    if key_findings:
        story.append(Paragraph("Key Priority Issues & Risks", section_h1))
        for bullet in key_findings:
            story.append(Paragraph(f"• {safe_text(bullet)}", bullet_style))
        story.append(Spacer(1, 10))

    # 6. Detailed Inspection Findings
    story.append(Paragraph(f"Detailed Inspection Findings ({len(findings_list)})", section_h1))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER_GRAY, spaceAfter=8))

    if not findings_list:
        no_findings_box = Table(
            [[Paragraph("<b>No Compliance Violations Detected</b><br/>Submitted content satisfies active brand governance rules, approved claim substantiations, and legal disclaimers.", body_style)]],
            colWidths=[540]
        )
        no_findings_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#E6F4EA")),
            ('BOX', (0, 0), (-1, -1), 1, COLOR_EVIDENCE_TEAL),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(no_findings_box)
    else:
        # Sort findings so Critical / Warning appear first
        def severity_order(f):
            s = f.get("severity", "advisory").lower()
            if s in ["critical", "high"]:
                return 0
            if s in ["warning", "medium"]:
                return 1
            return 2

        sorted_findings = sorted(findings_list, key=severity_order)

        for idx, finding in enumerate(sorted_findings, 1):
            severity = finding.get("severity", "advisory").lower()
            is_crit = severity in ["critical", "high"]
            is_warn = severity in ["warning", "medium"]

            badge_color = COLOR_ERROR_RED if is_crit else COLOR_WARNING_ORANGE if is_warn else COLOR_EVIDENCE_TEAL
            sev_label = severity.upper()

            title_text = safe_text(finding.get("title", f"Finding #{idx}"))
            timestamp = safe_text(finding.get("timestamp"))
            if timestamp:
                title_text += f" (Timestamp: {timestamp})"

            card_elements: List[Any] = []

            # Severity badge + Title
            title_p = Paragraph(
                f"<b><font color='{badge_color.hexval()}'>[{sev_label}]</font></b>  <b>{title_text}</b>",
                finding_title_style
            )
            card_elements.append(title_p)

            # Problem explanation
            exp_text = safe_text(finding.get("explanation", ""))
            if exp_text:
                card_elements.append(Paragraph(exp_text, finding_explanation_style))

            # Citations and Rule references
            meta_citations = []
            if finding.get("ruleReference"):
                meta_citations.append(f"<b>Rule:</b> {safe_text(finding['ruleReference'])}")
            if finding.get("sourceDoc"):
                page_str = f" (p. {finding['sourcePage']})" if finding.get("sourcePage") else ""
                meta_citations.append(f"<b>Evidence Source:</b> {safe_text(finding['sourceDoc'])}{page_str}")
            if finding.get("claimOwner"):
                meta_citations.append(f"<b>Owner:</b> {safe_text(finding['claimOwner'])}")

            if meta_citations:
                card_elements.append(Paragraph("  |  ".join(meta_citations), citation_style))

            # Suggested correction / Replacement text
            correction = safe_text(finding.get("suggestedCorrection", ""))
            if correction:
                correction_box = Table(
                    [
                        [
                            Paragraph("<b>RECOMMENDED REPLACEMENT WORDING / FIX:</b>", replacement_label_style)
                        ],
                        [
                            Paragraph(f'&ldquo;{correction}&rdquo;', replacement_text_style)
                        ]
                    ],
                    colWidths=[510]
                )
                correction_box.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), COLOR_REPLACEMENT_BG),
                    ('BOX', (0, 0), (-1, -1), 0.5, COLOR_EVIDENCE_TEAL),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ]))
                card_elements.append(Spacer(1, 4))
                card_elements.append(correction_box)

            # Wrap each finding inside a styled card container
            finding_table = Table([[card_elements]], colWidths=[540])
            finding_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), COLOR_CARD_BG),
                ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
                ('LINEBEFORE', (0, 0), (0, -1), 3.5, badge_color),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))

            story.append(KeepTogether(finding_table))
            story.append(Spacer(1, 8))

    # 7. Limitations & Caveats Notice
    if limitation_notice:
        story.append(Spacer(1, 6))
        limitation_table = Table(
            [[Paragraph(f"<b>Analysis Caveat / Scope Limitation:</b> {safe_text(limitation_notice)}", limitation_style)]],
            colWidths=[540]
        )
        limitation_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
            ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(limitation_table)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


def generate_passport_pdf(passport) -> bytes:
    """
    Generate an official, publication-grade Brand Passport Audit Certificate PDF
    using ReportLab, complete with cryptographic proof seals and Ed25519 signature details.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    cert_title_style = ParagraphStyle(
        'CertTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=COLOR_DEEP_INK
    )

    cert_sub_style = ParagraphStyle(
        'CertSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=COLOR_MUTED_SLATE
    )

    mono_style = ParagraphStyle(
        'CertMono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=COLOR_DEEP_INK
    )

    label_style = ParagraphStyle(
        'CertLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=COLOR_MUTED_SLATE
    )

    val_style = ParagraphStyle(
        'CertVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=COLOR_DEEP_INK
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("BRANDGUARD OFFICIAL BRAND PASSPORT", cert_title_style))
    story.append(Paragraph("Cryptographically Sealed Enterprise Governance Certificate", cert_sub_style))
    story.append(Spacer(1, 10))

    # 2. Status Badge & Passport Number
    is_revoked = passport.status == "REVOKED"
    status_bg = COLOR_ERROR_RED if is_revoked else COLOR_EVIDENCE_TEAL
    status_text = f"STATUS: {passport.status.upper()} (CRYPTOGRAPHIC ED25519 SEAL)"

    status_table = Table(
        [
            [
                Paragraph(f"<b>{status_text}</b>", ParagraphStyle('W', fontName='Helvetica-Bold', fontSize=10, textColor=colors.white)),
                Paragraph(f"<b>PASSPORT #: {passport.passport_number}</b>", ParagraphStyle('W2', fontName='Helvetica-Bold', fontSize=10, alignment=2, textColor=colors.white))
            ]
        ],
        colWidths=[340, 200]
    )
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), status_bg),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(status_table)
    story.append(Spacer(1, 14))

    # 3. Target Manuscript & Approval Metadata Grid
    meta_data = [
        [
            Paragraph("PROJECT NAME", label_style),
            Paragraph(safe_text(passport.project_name), val_style),
            Paragraph("COMPANY / CLIENT", label_style),
            Paragraph(safe_text(passport.company_name), val_style)
        ],
        [
            Paragraph("REVIEW TOOL", label_style),
            Paragraph(safe_text(passport.review_type.upper()), val_style),
            Paragraph("APPROVED VERSION", label_style),
            Paragraph(f"<b>v{safe_text(passport.approved_version_number)}</b>", val_style)
        ],
        [
            Paragraph("APPROVED FILE", label_style),
            Paragraph(safe_text(passport.approved_file_name), val_style),
            Paragraph("GOVERNANCE SCORE", label_style),
            Paragraph(f"<b>{passport.governance_score}/100 Compliant</b>", val_style)
        ],
        [
            Paragraph("AUTHORIZED REVIEWER", label_style),
            Paragraph(safe_text(passport.authorized_reviewer_name), val_style),
            Paragraph("ISSUED TIMESTAMP", label_style),
            Paragraph(passport.issued_at.strftime("%Y-%m-%d %H:%M:%S UTC") if passport.issued_at else "N/A", val_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[130, 140, 130, 140])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 4. Cryptographic Proof Seal
    story.append(Paragraph("<b>CRYPTOGRAPHIC SIGNATURE & PROOF OF INTEGRITY</b>", label_style))
    story.append(Spacer(1, 4))

    proof_data = [
        [
            Paragraph("<b>ALGORITHM & KEY ID:</b>", label_style),
            Paragraph(f"{passport.algorithm} (Key ID: {passport.key_id})", val_style)
        ],
        [
            Paragraph("<b>SHA-256 FILE HASH:</b>", label_style),
            Paragraph(safe_text(passport.approved_file_hash), mono_style)
        ],
        [
            Paragraph("<b>ED25519 PUBLIC KEY:</b>", label_style),
            Paragraph(safe_text(passport.public_key), mono_style)
        ],
        [
            Paragraph("<b>DIGITAL SIGNATURE:</b>", label_style),
            Paragraph(safe_text(passport.signature), mono_style)
        ]
    ]

    proof_table = Table(proof_data, colWidths=[140, 400])
    proof_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_EVIDENCE_TEAL),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(proof_table)

    # 5. Revocation details if revoked
    if is_revoked:
        story.append(Spacer(1, 10))
        revocation_table = Table(
            [[
                Paragraph(
                    f"<b>CERTIFICATE REVOKED:</b> This passport was officially revoked on {passport.revoked_at} by {passport.revoked_by}. Reason: {safe_text(passport.revocation_reason or 'Policy exception')}.",
                    ParagraphStyle('Rev', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_ERROR_RED)
                )
            ]],
            colWidths=[540]
        )
        revocation_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEE2E2")),
            ('BOX', (0, 0), (-1, -1), 1, COLOR_ERROR_RED),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(revocation_table)

    # 6. AI Disclosure & Legal Disclaimer
    story.append(Spacer(1, 14))
    disclaimer_text = (
        "<b>LEGAL & COMPLIANCE NOTICE:</b> This Brand Passport certifies that the designated content version was audited "
        "against registered brand rules, tone guidelines, and verified claim records, and authorized by a designated human "
        "Operations reviewer. The cryptographic signature guarantees data authenticity and file integrity."
    )
    story.append(Paragraph(disclaimer_text, cert_sub_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


