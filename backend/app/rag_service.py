"""
BrandGuard Retrieval-Augmented Generation (RAG) & Guideline Ingestion Service
Provides:
1. Guideline Document Ingestion & Semantic Chunking (preserving page & section markers)
2. Multi-tenant company-isolated keyword and relevance retrieval
3. Feature-specific governance context assembly for Gemini AI review
4. Verification and grounding validation of AI findings against real DB records
"""

import os
import re
import uuid
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import (
    GuidelineDocModel,
    GuidelineChunkModel,
    BrandRuleModel,
    ApprovedClaimModel
)
from app.file_processor import extract_document_text


# Mapping review features to relevant brand rule categories & types
FEATURE_RULE_MAPPINGS = {
    "legal": {
        "categories": ["legal", "disclaimers", "brand_rules", "contracts"],
        "types": ["prohibited_term", "disclaimer", "restriction"]
    },
    "promotions": {
        "categories": ["promotions", "disclaimers", "claims", "brand_rules"],
        "types": ["restriction", "disclaimer", "prohibited_term"]
    },
    "content": {
        "categories": ["content", "tone", "voice", "terminology", "brand_rules"],
        "types": ["prohibited_term", "preferred_alternative", "voice", "disclaimer"]
    },
    "images": {
        "categories": ["visual", "images", "design", "accessibility", "brand_rules"],
        "types": ["restriction", "disclaimer", "preferred_alternative"]
    },
    "videos": {
        "categories": ["videos", "broadcast", "audio", "timing", "disclaimers", "brand_rules"],
        "types": ["restriction", "disclaimer", "prohibited_term"]
    }
}


def tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric words of length >= 3."""
    if not text:
        return []
    words = re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', text.lower())
    # Exclude common stop words
    stop_words = {
        'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'which',
        'will', 'would', 'there', 'their', 'what', 'about', 'when', 'make', 'like', 'time'
    }
    return [w for w in words if w not in stop_words]


def chunk_text_by_pages(full_text: str, chunk_size: int = 800, chunk_overlap: int = 50) -> List[Dict[str, Any]]:
    """
    Split document text into semantic chunks while preserving page numbers and section headers.
    Recognizes page markers in format '--- [Page X] ---'.
    """
    chunks: List[Dict[str, Any]] = []
    
    # Split by page marker if present
    page_blocks = re.split(r'---\s*\[Page\s+(\d+)\]\s*---', full_text)
    
    if len(page_blocks) > 1:
        # First element before first page marker (if any)
        current_page = 1
        idx = 1
        while idx < len(page_blocks):
            try:
                page_num = int(page_blocks[idx])
            except ValueError:
                page_num = current_page
            
            page_content = page_blocks[idx + 1] if idx + 1 < len(page_blocks) else ""
            idx += 2
            current_page = page_num

            # Split large pages into multiple chunks of chunk_size
            paragraphs = page_content.split('\n\n')
            current_chunk = ""
            current_section = None

            for p in paragraphs:
                p_clean = p.strip()
                if not p_clean:
                    continue
                
                # Check for section header (short line, heading, or title)
                if len(p_clean) < 80 and (
                    p_clean.isupper() 
                    or p_clean.startswith('Section') 
                    or p_clean.startswith('#')
                    or not p_clean.endswith(('.', ':', ';', ','))
                ):
                    current_section = p_clean.lstrip('#').strip()

                if len(current_chunk) + len(p_clean) > chunk_size and current_chunk:
                    chunks.append({
                        "page_number": page_num,
                        "section_title": current_section or f"Page {page_num}",
                        "content": current_chunk.strip()
                    })
                    current_chunk = p_clean + "\n\n"
                else:
                    current_chunk += p_clean + "\n\n"

            if current_chunk.strip():
                chunks.append({
                    "page_number": page_num,
                    "section_title": current_section or f"Page {page_num}",
                    "content": current_chunk.strip()
                })
    else:
        # Standard paragraph chunking without page markers
        paragraphs = full_text.split('\n\n')
        current_chunk = ""
        current_section = None
        page_estimate = 1
        words_count = 0

        for p in paragraphs:
            p_clean = p.strip()
            if not p_clean:
                continue

            words_count += len(p_clean.split())
            page_estimate = max(1, round(words_count / 300))

            if len(p_clean) < 60 and (p_clean.isupper() or p_clean.startswith('Section') or p_clean.startswith('#')):
                current_section = p_clean.lstrip('#').strip()

            if len(current_chunk) + len(p_clean) > chunk_size and current_chunk:
                chunks.append({
                    "page_number": page_estimate,
                    "section_title": current_section or f"Section ~p.{page_estimate}",
                    "content": current_chunk.strip()
                })
                current_chunk = p_clean + "\n\n"
            else:
                current_chunk += p_clean + "\n\n"

        if current_chunk.strip():
            chunks.append({
                "page_number": page_estimate,
                "section_title": current_section or f"Section ~p.{page_estimate}",
                "content": current_chunk.strip()
            })

    return chunks


def index_guideline_document(
    db: Session,
    company_id: str,
    file_path: Optional[str] = None,
    original_filename: Optional[str] = None,
    category: str = "Brand Guidelines",
    title_override: Optional[str] = None,
    document_id: Optional[str] = None,
    title: Optional[str] = None,
    file_name: Optional[str] = None,
    file_size_str: Optional[str] = None,
    raw_text: Optional[str] = None
) -> GuidelineDocModel:
    """
    Ingest a guideline document, extract text, split into searchable chunks,
    and persist in database under company_id tenant isolation.
    Returns the persisted GuidelineDocModel with chunks attached.
    """
    effective_filename = file_name or original_filename or "guideline_doc.pdf"
    effective_doc_id = document_id or f"g-{uuid.uuid4().hex[:6]}"
    effective_title = title_override or title or effective_filename.replace("_", " ").rsplit(".", 1)[0].title()

    file_size_display = file_size_str
    if not file_size_display and file_path and os.path.exists(file_path):
        size_bytes = os.path.getsize(file_path)
        file_size_display = f"{size_bytes / 1024:.1f} KB" if size_bytes < 1024 * 1024 else f"{size_bytes / (1024*1024):.1f} MB"
    if not file_size_display:
        file_size_display = "1.0 MB"

    if file_path:
        from pathlib import Path
        extracted = extract_document_text(Path(file_path), effective_filename)
        text_content = extracted["text"]
        pages = extracted["page_count"]
    else:
        text_content = raw_text or ""
        pages = max(1, round(len(text_content.split()) / 300))

    # Clean existing document and its chunks if updating
    existing = db.query(GuidelineDocModel).filter(
        GuidelineDocModel.id == effective_doc_id,
        GuidelineDocModel.company_id == company_id
    ).first()

    if existing:
        doc = existing
        doc.title = effective_title
        doc.file_name = effective_filename
        doc.file_size = file_size_display
        doc.pages_count = pages
        doc.extracted_text = text_content
        doc.sample_passage = text_content[:300] if text_content else None
    else:
        doc = GuidelineDocModel(
            id=effective_doc_id,
            company_id=company_id,
            title=effective_title,
            file_name=effective_filename,
            file_size=file_size_display,
            version="1.0",
            status="indexed",
            pages_count=pages,
            sample_passage=text_content[:300] if text_content else None,
            extracted_text=text_content
        )
        db.add(doc)

    db.flush()

    # Clear old chunks if any
    db.query(GuidelineChunkModel).filter(
        GuidelineChunkModel.document_id == effective_doc_id
    ).delete()

    # Create semantic chunks
    chunks_data = chunk_text_by_pages(text_content)
    chunk_models = []
    for idx, c in enumerate(chunks_data):
        chunk_obj = GuidelineChunkModel(
            id=f"chk-{uuid.uuid4().hex[:12]}",
            document_id=effective_doc_id,
            company_id=company_id,
            chunk_index=idx,
            page_number=c["page_number"],
            section_title=c.get("section_title"),
            content=c["content"]
        )
        chunk_models.append(chunk_obj)

    db.add_all(chunk_models)
    doc.proposed_rules_count = min(len(chunks_data), 5)
    doc.chunks = chunk_models
    db.commit()

    return doc


def retrieve_governance_context(
    company_id: Optional[str] = "acme-global-brands",
    review_type: Optional[str] = "content",
    content: str = "",
    instructions: str = "",
    query_text: Optional[str] = None,
    db: Optional[Session] = None,
    top_k_rules: int = 6,
    top_k_claims: int = 4,
    top_k_chunks: int = 4,
    *args,
    **kwargs
) -> Dict[str, Any]:
    """
    Multi-tenant RAG retrieval service:
    Queries company-specific brand rules, approved claims, and guideline chunks.
    Ranks them by keyword overlap and semantic category relevance against submitted content.
    Returns structured grounding context to feed into Gemini.
    """
    # Flexible argument parsing
    if hasattr(company_id, "query"):
        # First positional argument was db
        real_db = company_id
        safe_company = review_type or "acme-global-brands"
        real_review_type = content or "content"
        real_content = instructions or ""
        real_instructions = query_text or ""
    else:
        real_db = db
        safe_company = company_id or "acme-global-brands"
        real_review_type = review_type or "content"
        real_content = content or ""
        real_instructions = instructions or (query_text or "")

    should_close_db = False
    if real_db is None:
        from app.database import SessionLocal
        real_db = SessionLocal()
        should_close_db = True

    try:
        combined_query = f"{real_content} {real_instructions} {kwargs.get('query', '')}"
        mapping = FEATURE_RULE_MAPPINGS.get(real_review_type, FEATURE_RULE_MAPPINGS["content"])
        target_categories = mapping["categories"]
        target_types = mapping["types"]

        query_tokens = set(tokenize(combined_query))

        # 1. Retrieve & Rank Rules
        rules_query = real_db.query(BrandRuleModel).filter(
            BrandRuleModel.company_id == safe_company,
            BrandRuleModel.status == "approved"
        )
        all_company_rules = rules_query.all()

        scored_rules: List[Tuple[float, BrandRuleModel]] = []
        for r in all_company_rules:
            cat_match = 3.0 if r.category.lower() in target_categories else 0.5
            type_match = 2.0 if r.rule_type.lower() in target_types else 0.5
            rule_tokens = set(tokenize(f"{r.title} {r.explanation} {r.term_or_pattern or ''} {r.preferred_alternative or ''}"))
            overlap = len(query_tokens.intersection(rule_tokens))
            sev_boost = 2.0 if r.severity == 'critical' else 1.0

            score = (cat_match + type_match + (overlap * 2.5)) * sev_boost
            scored_rules.append((score, r))

        scored_rules.sort(key=lambda x: x[0], reverse=True)
        selected_rules = [item[1] for item in scored_rules[:top_k_rules]]

        # 2. Retrieve & Rank Claims (Crucial for promotions & content)
        selected_claims: List[ApprovedClaimModel] = []
        if real_review_type in ["promotions", "content", "legal"]:
            claims_query = real_db.query(ApprovedClaimModel).filter(
                ApprovedClaimModel.company_id == safe_company,
                ApprovedClaimModel.status.in_(["VERIFIED", "EXPIRING_SOON"])
            )
            all_company_claims = claims_query.all()

            scored_claims: List[Tuple[float, ApprovedClaimModel]] = []
            for c in all_company_claims:
                claim_tokens = set(tokenize(f"{c.claim_text} {c.context_notes or ''} {c.source_doc}"))
                overlap = len(query_tokens.intersection(claim_tokens))
                scored_claims.append((overlap, c))

            scored_claims.sort(key=lambda x: x[0], reverse=True)
            selected_claims = [item[1] for item in scored_claims[:top_k_claims]]

        # 3. Retrieve Guideline Chunks (Passage Search)
        chunks_query = real_db.query(GuidelineChunkModel).filter(
            GuidelineChunkModel.company_id == safe_company
        )
        all_chunks = chunks_query.all()

        scored_chunks: List[Tuple[float, GuidelineChunkModel]] = []
        for chk in all_chunks:
            chk_tokens = set(tokenize(f"{chk.section_title or ''} {chk.content}"))
            overlap = len(query_tokens.intersection(chk_tokens))
            if overlap > 0 or len(all_chunks) <= top_k_chunks:
                scored_chunks.append((overlap, chk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        selected_chunks = [item[1] for item in scored_chunks[:top_k_chunks]]

        has_company_guidelines = bool(selected_rules or selected_claims or selected_chunks)

        # Format human & AI readable grounding text
        grounding_parts: List[str] = []

        if not has_company_guidelines:
            grounding_parts.append(
                f"NOTICE: No active company brand guidelines or governance rules configured for tenant '{safe_company}'. "
                "Evaluate content against general professional clarity and regulatory baseline principles, "
                "but explicitly indicate that the review lacks company-specific governance guidance."
            )

        if selected_rules:
            grounding_parts.append("### ACTIVE COMPANY-SPECIFIC GOVERNANCE RULES:")
            for r in selected_rules:
                grounding_parts.append(
                    f"- [Rule ID: {r.id}] \"{r.title}\" (Severity: {r.severity.upper()}, Category: {r.category})\n"
                    f"  Rule Type: {r.rule_type}\n"
                    f"  Term / Trigger: {r.term_or_pattern or 'N/A'}\n"
                    f"  Mandated Standard: {r.explanation}\n"
                    f"  Preferred Alternative: {r.preferred_alternative or 'N/A'}\n"
                    f"  Source Document: {r.source_doc} (Page {r.source_page})"
                )

        if selected_claims:
            grounding_parts.append("\n### AUTHORIZED FACT & CLAIM LEDGER:")
            for c in selected_claims:
                grounding_parts.append(
                    f"- [Claim ID: {c.id}] \"{c.claim_text}\"\n"
                    f"  Valid Dates: {c.valid_from} to {c.valid_to} (Status: {c.status})\n"
                    f"  Citation: {c.source_doc} (Page {c.source_page}) | Owner: {c.owner}\n"
                    f"  Context: {c.context_notes or 'Standard verification'}"
                )

        if selected_chunks:
            grounding_parts.append("\n### RELEVANT POLICY GUIDELINE PASSAGES:")
            for chk in selected_chunks:
                grounding_parts.append(
                    f"- [Guideline Source: Document {chk.document_id}, Page {chk.page_number}] ({chk.section_title or 'Section'}):\n"
                    f"  \"{chk.content[:400]}...\""
                )

        summary_grounding_text = "\n".join(grounding_parts)

        rules_list = [
            {
                "id": r.id,
                "title": r.title,
                "category": r.category,
                "rule_type": r.rule_type,
                "severity": r.severity,
                "source_doc": r.source_doc,
                "source_page": r.source_page,
                "explanation": r.explanation,
                "preferred_alternative": r.preferred_alternative
            }
            for r in selected_rules
        ]

        claims_list = [
            {
                "id": c.id,
                "claim_text": c.claim_text,
                "source_doc": c.source_doc,
                "source_page": c.source_page,
                "owner": c.owner,
                "valid_from": c.valid_from,
                "valid_to": c.valid_to,
                "status": c.status
            }
            for c in selected_claims
        ]

        chunks_list = [
            {
                "document_id": chk.document_id,
                "page_number": chk.page_number,
                "section_title": chk.section_title,
                "content": chk.content
            }
            for chk in selected_chunks
        ]

        return {
            "has_company_guidelines": has_company_guidelines,
            "company_id": safe_company,
            "rules_count": len(selected_rules),
            "claims_count": len(selected_claims),
            "chunks_count": len(selected_chunks),
            "retrieved_rules": rules_list,
            "rules": rules_list,
            "retrieved_claims": claims_list,
            "claims": claims_list,
            "retrieved_chunks": chunks_list,
            "chunks": chunks_list,
            "prompt_grounding_text": summary_grounding_text,
            "grounding_text": summary_grounding_text
        }
    finally:
        if should_close_db:
            real_db.close()


def validate_and_ground_findings(
    findings: Optional[List[Dict[str, Any]]] = None,
    raw_findings: Optional[List[Dict[str, Any]]] = None,
    retrieved_rules: Optional[List[Dict[str, Any]]] = None,
    retrieved_claims: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Post-process and validate AI findings against real retrieved database records:
    1. Verifies ruleReference against real rules.
    2. Verifies claims and citation sources.
    3. Prevents fabricated rules from being labeled as confirmed policy violations.
    """
    target_findings = raw_findings if raw_findings is not None else (findings or [])
    safe_rules = retrieved_rules or []
    safe_claims = retrieved_claims or []

    rule_lookup = {r["id"].lower(): r for r in safe_rules}
    for r in safe_rules:
        rule_lookup[r["title"].lower()] = r

    claim_lookup = {c["id"].lower(): c for c in safe_claims}

    validated_findings = []
    for f in target_findings:
        f_copy = dict(f)
        ref = (f.get("ruleReference") or "").lower()

        # Check if rule matches a real database record
        matched_rule = None
        for key, r_obj in rule_lookup.items():
            if key in ref or r_obj["id"].lower() in ref:
                matched_rule = r_obj
                break

        if matched_rule:
            f_copy["ruleReference"] = f"{matched_rule['id']}: {matched_rule['title']}"
            f_copy["sourceDoc"] = matched_rule["source_doc"]
            f_copy["source_doc"] = matched_rule["source_doc"]
            f_copy["sourcePage"] = matched_rule["source_page"]
            f_copy["source_page"] = matched_rule["source_page"]
            f_copy["is_grounded_in_db"] = True
            f_copy["citation_status"] = "verified against database"
            if not f_copy.get("suggestedCorrection") and matched_rule.get("preferred_alternative"):
                f_copy["suggestedCorrection"] = matched_rule["preferred_alternative"]
        else:
            # Check against claims
            matched_claim = None
            for key, c_obj in claim_lookup.items():
                if key in ref or c_obj["id"].lower() in ref:
                    matched_claim = c_obj
                    break

            if matched_claim:
                f_copy["ruleReference"] = f"CLAIM-LEDGER: {matched_claim['id']}"
                f_copy["sourceDoc"] = matched_claim["source_doc"]
                f_copy["source_doc"] = matched_claim["source_doc"]
                f_copy["sourcePage"] = matched_claim["source_page"]
                f_copy["source_page"] = matched_claim["source_page"]
                f_copy["claimOwner"] = matched_claim["owner"]
                f_copy["is_grounded_in_db"] = True
                f_copy["citation_status"] = "verified against database"
            else:
                # Flag as unverified / recommendation
                f_copy["is_grounded_in_db"] = False
                f_copy["citation_status"] = "unverified against current database"
                if not f_copy.get("ruleReference"):
                    f_copy["ruleReference"] = "BASELINE-GOVERNANCE: Policy Recommendation"

        validated_findings.append(f_copy)

    return validated_findings

