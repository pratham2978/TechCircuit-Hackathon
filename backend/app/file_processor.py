import os
import re
import uuid
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from fastapi import HTTPException
from app.config import UPLOAD_DIR, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB

# Maximum character count to pass to AI context in a single pass (~30,000 words)
MAX_DOCUMENT_CHARS = 120_000


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and unsafe character execution."""
    base_name = os.path.basename(filename)
    # Strip any directory traversal tokens
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', base_name)
    # Ensure not empty or dot-only
    if not clean or clean.startswith('.'):
        clean = f"file_{uuid.uuid4().hex[:8]}{clean}"
    return clean


def get_safe_destination_path(company_id: str, project_id: str, review_type: str, filename: str) -> Path:
    """
    Generate isolated, secure path for uploaded files partitioned by company and project.
    Prevents path traversal beyond UPLOAD_DIR.
    """
    safe_company = re.sub(r'[^a-zA-Z0-9_-]', '_', company_id or "default_company")
    safe_project = re.sub(r'[^a-zA-Z0-9_-]', '_', project_id or "default_project")
    safe_review = re.sub(r'[^a-zA-Z0-9_-]', '_', review_type or "general")
    clean_name = sanitize_filename(filename)

    # Prefix with short UUID to prevent overwriting existing files while keeping original name
    unique_filename = f"{uuid.uuid4().hex[:8]}_{clean_name}"

    target_dir = UPLOAD_DIR / safe_company / safe_project / safe_review
    target_dir.mkdir(parents=True, exist_ok=True)

    destination = (target_dir / unique_filename).resolve()

    # Enforce path containment
    if not str(destination).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid file destination path detected.")

    return destination


def validate_file(filename: str, file_size: int, allowed_extensions: List[str]) -> str:
    """
    Validate file extension and file size.
    Returns normalized extension.
    """
    if file_size <= 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB ({file_size / (1024*1024):.1f}MB uploaded)."
        )

    ext = Path(filename).suffix.lower()
    if ext not in [e.lower() for e in allowed_extensions]:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(allowed_extensions)}."
        )

    return ext


def extract_text_from_pdf(file_path: Path) -> Tuple[str, int]:
    """Extract text from PDF while preserving page markers."""
    try:
        import pypdf
        reader = pypdf.PdfReader(str(file_path))
        num_pages = len(reader.pages)
        pages_content = []

        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages_content.append(f"--- [Page {idx + 1}] ---\n{page_text.strip()}")

        extracted = "\n\n".join(pages_content)
        if not extracted.strip():
            return (
                "Notice: PDF contains no selectable text (scanned graphic or flattened raster). "
                "For visual or scanned documents, please inspect using Image & Design Review.",
                num_pages
            )
        return extracted, num_pages
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Corrupted or unreadable PDF document: {str(e)}"
        )


def extract_text_from_docx(file_path: Path) -> Tuple[str, int]:
    """Safely extract paragraph text from DOCX archive without heavy external dependencies."""
    try:
        with zipfile.ZipFile(str(file_path)) as docx_zip:
            if "word/document.xml" not in docx_zip.namelist():
                raise ValueError("Not a valid DOCX document (missing word/document.xml)")

            xml_data = docx_zip.read("word/document.xml")
            tree = ET.fromstring(xml_data)

            # XML namespaces used by WordprocessingML
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

            paragraphs = []
            for p in tree.iter(f"{{{ns['w']}}}p"):
                texts = [node.text for node in p.iter(f"{{{ns['w']}}}t") if node.text]
                if texts:
                    paragraphs.append("".join(texts))

            full_text = "\n\n".join(paragraphs)
            # Estimate pages from word count (~300 words per standard page)
            word_count = len(full_text.split())
            estimated_pages = max(1, round(word_count / 300))
            return full_text, estimated_pages
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Corrupted or invalid DOCX archive: {str(e)}"
        )


def extract_document_text(file_path: Path, filename: str) -> Dict[str, Any]:
    """
    Extract readable text from supported document formats.
    Handles length limits and truncation warnings.
    """
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        raw_text, pages = extract_text_from_pdf(file_path)
    elif ext == ".docx":
        raw_text, pages = extract_text_from_docx(file_path)
    elif ext in [".txt", ".html", ".md"]:
        try:
            raw_text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raw_text = file_path.read_text(encoding="latin-1", errors="replace")
        page_markers = re.findall(r'---\s*\[Page\s+(\d+)\]\s*---', raw_text)
        if page_markers:
            pages = max(int(m) for m in page_markers)
        else:
            pages = max(1, round(len(raw_text.split()) / 300))
    else:
        raise HTTPException(
            status_code=415,
            detail=f"Document format '{ext}' is not supported for text extraction."
        )

    # Context window & truncation protection
    truncated = False
    limitation_notice = None

    if len(raw_text) > MAX_DOCUMENT_CHARS:
        raw_text = raw_text[:MAX_DOCUMENT_CHARS]
        truncated = True
        limitation_notice = (
            f"Document exceeds maximum single-pass context limit ({len(raw_text)} chars). "
            f"The first {MAX_DOCUMENT_CHARS} characters (~{pages} pages) were extracted and evaluated."
        )

    return {
        "text": raw_text,
        "page_count": pages,
        "truncated": truncated,
        "limitation_notice": limitation_notice,
        "char_count": len(raw_text)
    }

