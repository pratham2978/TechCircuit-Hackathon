import json
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional
from app.config import GEMINI_API_KEY, GEMINI_MODEL


class GeminiConfigError(Exception):
    """Raised when GEMINI_API_KEY is missing or unconfigured."""
    pass


class GeminiApiError(Exception):
    """Raised when the Gemini API returns an error or fails."""
    pass


SYSTEM_INSTRUCTIONS = {
    "legal": (
        "You are BrandGuard's Legal Document Review Engine. Your task is to perform an uncompromising, deterministic "
        "compliance audit of legal agreements, terms of service, and contract clauses against enterprise governance standards.\n"
        "Key Legal Rules to Enforce:\n"
        "1. Absolute SLA Guarantees: Never permit unqualified 100% uptime guarantees without maintenance exclusions. Standard target must be 99.9% commercially reasonable availability with proportional service credits (Rule: SLA-ABS-01).\n"
        "2. Mandatory Disclaimers: Cross-border European cloud data transfers must explicitly include the EEA Standard Contractual Clauses (SCCs) disclosure (Rule: REG-EEA-04).\n"
        "3. Non-Legal Advice Boundary: Marketing or advisory documents must carry the non-legal advice disclaimer.\n"
        "4. Force Majeure: Agreements must limit liability for third-party public utility or regional cloud outages.\n"
        "You must return structured JSON matching the requested schema."
    ),
    "promotions": (
        "You are BrandGuard's Promotion & Offer Claims Auditor. Your task is to audit promotional copy, ad headlines, and sales offers "
        "against the enterprise approved claims ledger and consumer protection standards.\n"
        "Key Promotion Rules to Enforce:\n"
        "1. Claim Substantiation: Verify that discount figures (e.g. '70% off') match the authorized ledger claim and clearly state scope limitations (e.g., 'selected annual tiers only; consulting services excluded') (Rule: PROMO-TERMS-01).\n"
        "2. Expiration Dates: Verify that promotional expiry dates are explicit and do not exceed the authorized campaign window.\n"
        "3. Conspicuous Disclaimers: Terms notice must be clearly linked, not concealed in ambiguous asterisks.\n"
        "You must return structured JSON matching the requested schema."
    ),
    "content": (
        "You are BrandGuard's Brand Content & Editorial Review Engine. Your task is to evaluate marketing copy, blog posts, briefs, and sales collateral "
        "for tone, voice consistency, accuracy, and brand terminology standards.\n"
        "Key Content Rules to Enforce:\n"
        "1. Absolute Superlatives: Prohibit unsubstantiated superlatives like 'the only platform', '100% foolproof', or 'guaranteed perfection' unless backed by a cited fact record (Rule: BRAND-RULE-101).\n"
        "2. Active Voice: Prefer direct, active verbs over passive construction (Rule: TONE-042).\n"
        "3. Approved Terminology: Enforce preferred terms (e.g., 'high availability' over 'unbreakable uptime') (Rule: TERM-ALT-02).\n"
        "4. Professional Tone: Maintain an elevated corporate posture; avoid informal or derogatory characterizations.\n"
        "You must return structured JSON matching the requested schema."
    ),
    "images": (
        "You are BrandGuard's Image & Design Brand Governance Auditor. Your task is to inspect images, banners, and graphical collateral "
        "against visual design standards, color tokens, and accessibility guidelines.\n"
        "Key Design Standards to Enforce:\n"
        "1. Palette Tokens: Registered BrandGuard tokens are Deep Ink (#14212B), Warm Ivory (#F7F5F0), Signal Coral (#F16B50), Evidence Teal (#167C78), Muted Slate (#64727D), Border Gray (#DDE2E2). Flag any unapproved off-palette colors.\n"
        "2. WCAG 2.1 AA Contrast: Text overlays on background panels must sustain at least 4.5:1 contrast for normal body copy (Rule: ACCESSIBILITY-WCAG-AA).\n"
        "3. Logo Safety Zone: The brand logo wordmark must have minimum 16px clear space on all edges with no encroaching typography (Rule: LOGO-CLEARSPACE-02).\n"
        "4. Visual Claims: Any text overlay expressing a promotional or factual claim must carry the required legal disclaimer.\n"
        "You must return structured JSON matching the requested schema."
    ),
    "videos": (
        "You are BrandGuard's Video Governance Auditor. Your task is to inspect video collateral, timing, super titles, and voiceovers "
        "for broadcast and digital compliance.\n"
        "Key Video Standards to Enforce:\n"
        "1. On-Screen Super Title Duration: Legal disclaimers in lower-third banners must remain visible for at least 4.0 continuous seconds so viewers have adequate time to read them (Rule: VIDEO-SUPER-01).\n"
        "2. Mandatory Spoken Disclaimers: When a promotional discount or pricing is stated in voiceover narration, an audible disclaimer (e.g. 'Terms apply; annual plan required') must be voiced (Rule: AUDIO-DISCLAIM-03).\n"
        "3. Brand Intro & Outro Margins: Video bumpers and end cards must use registered palette tokens with proper isolation margins.\n"
        "4. Timestamped Findings: Each finding must identify the specific timestamp (e.g., '00:03', '00:15', '00:26') where the violation or risk occurs.\n"
        "You must return structured JSON matching the requested schema."
    )
}


def call_gemini_raw(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Call Google Gemini generateContent REST endpoint using Python's standard library."""
    if not GEMINI_API_KEY:
        raise GeminiConfigError(
            "GEMINI_API_KEY is not configured on the backend server. "
            "Please configure GEMINI_API_KEY in your environment or .env file to enable live AI analysis."
        )

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    data_bytes = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        endpoint,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp_body = resp.read().decode("utf-8")
            return json.loads(resp_body)
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(error_msg)
            message = err_json.get("error", {}).get("message", error_msg)
        except Exception:
            message = error_msg
        raise GeminiApiError(f"Gemini API returned HTTP {e.code}: {message}")
    except urllib.error.URLError as e:
        raise GeminiApiError(f"Network error contacting Gemini API: {str(e.reason)}")
    except Exception as e:
        raise GeminiApiError(f"Unexpected error communicating with Gemini: {str(e)}")


def analyze_review_content(
    review_type: str,
    content: str,
    instructions: Optional[str] = None,
    media_data: Optional[str] = None,
    media_mime_type: Optional[str] = None,
    file_name: Optional[str] = None,
    retrieved_grounding: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Run structured analysis using Gemini 2.5 Flash for any of the 5 review features.
    Injects dynamic company-specific governance rules, approved claims, and guideline passages (RAG).
    Returns structured overallResult, keyFindings, and findings list.
    """
    system_inst = SYSTEM_INSTRUCTIONS.get(review_type, SYSTEM_INSTRUCTIONS["content"])
    
    parts: List[Dict[str, Any]] = []

    # If media (image / video) is attached
    if media_data and media_mime_type:
        parts.append({
            "inlineData": {
                "mimeType": media_mime_type,
                "data": media_data
            }
        })

    # Prepare review prompt
    prompt_text = (
        f"Review Feature: {review_type.upper()}\n"
        f"File Name: {file_name or 'unnamed_asset'}\n\n"
        f"Content / Text to inspect:\n\"\"\"\n{content}\n\"\"\"\n\n"
    )
    if instructions:
        prompt_text += f"User Review Instructions / Guidance:\n\"\"\"\n{instructions}\n\"\"\"\n\n"

    # Inject dynamic RAG retrieval context
    if retrieved_grounding and retrieved_grounding.get("grounding_text"):
        prompt_text += (
            "=======================================================\n"
            "ACTIVE COMPANY-SPECIFIC GOVERNANCE POLICIES & CLAIMS (GROUND TRUTH):\n"
            f"{retrieved_grounding['grounding_text']}\n"
            "=======================================================\n"
            "STRICT GROUNDING INSTRUCTIONS:\n"
            "1. Cross-reference the submitted content against the active company-specific rules, claim ledger, and guideline passages above.\n"
            "2. Whenever citing a violation or risk, cite the exact Rule ID (e.g. 'RULE-LG-01: Prohibit Absolute SLA Guarantees') and Source Document from the active policies above.\n"
            "3. If a promotional claim is made, verify if it matches an authorized claim in the ledger; if unsubstantiated, cite the claim restriction.\n\n"
        )
    else:
        prompt_text += (
            "NOTICE: No company-specific guidelines or claim records are configured for this workspace. "
            "Evaluate against baseline governance standards and note that company-specific rules are unconfigured.\n\n"
        )

    prompt_text += (
        "Please analyze this content thoroughly and return ONLY a valid JSON object matching this exact schema:\n"
        "{\n"
        "  \"overallResult\": \"Approved | Changes Required (summary of issue) | Revisions Recommended\",\n"
        "  \"keyFindings\": [\n"
        "    \"Key issue or requirement 1\",\n"
        "    \"Key issue or requirement 2\"\n"
        "  ],\n"
        "  \"findings\": [\n"
        "    {\n"
        "      \"id\": \"fnd-1\",\n"
        "      \"title\": \"Short finding title\",\n"
        "      \"severity\": \"critical | warning | advisory\",\n"
        "      \"explanation\": \"Detailed explanation of why this violates brand or legal guidelines\",\n"
        "      \"ruleReference\": \"RULE-ID: Standard Name\",\n"
        "      \"sourceDoc\": \"Name of policy document\",\n"
        "      \"sourcePage\": 12,\n"
        "      \"suggestedCorrection\": \"Exact suggested replacement wording or visual fix\",\n"
        "      \"confidence\": \"high | medium\",\n"
        "      \"timestamp\": \"00:15\" (only if video review, otherwise omit)\n"
        "    }\n"
        "  ],\n"
        "  \"summaryNarration\": \"A short 2-sentence conversational explanation of your audit conclusions for the user.\"\n"
        "}"
    )

    parts.append({"text": prompt_text})

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": parts
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system_inst}]
        },
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    raw_response = call_gemini_raw(payload)

    # Extract text from response
    try:
        candidates = raw_response.get("candidates", [])
        if not candidates:
            raise GeminiApiError("Gemini API returned no response candidates.")
        
        part_content = candidates[0].get("content", {}).get("parts", [])[0].get("text", "{}")
        parsed = json.loads(part_content)
        return parsed
    except json.JSONDecodeError:
        raise GeminiApiError("Failed to parse structured JSON from Gemini response.")
    except (IndexError, KeyError) as e:
        raise GeminiApiError(f"Unexpected response structure from Gemini: {e}")


def chat_followup(
    review_type: str,
    conversation_history: List[Dict[str, str]],
    user_message: str,
    context_notes: Optional[str] = None
) -> str:
    """
    Handle multi-turn follow-up questions about a review using Gemini.
    conversation_history is a list of {'role': 'user' | 'model', 'text': '...'}.
    """
    system_inst = (
        SYSTEM_INSTRUCTIONS.get(review_type, SYSTEM_INSTRUCTIONS["content"]) +
        "\nYou are answering a follow-up question from a user about the previous compliance findings or brand guidelines. "
        "Keep your answer clear, authoritative, and helpful, referencing specific brand rules or approved alternatives."
    )

    contents: List[Dict[str, Any]] = []

    if context_notes:
        contents.append({
            "role": "user",
            "parts": [{"text": f"Context of active review & findings:\n{context_notes}"}]
        })
        contents.append({
            "role": "model",
            "parts": [{"text": "Understood. I have loaded the context of the active review and findings. How can I assist you with this document?"}]
        })

    for msg in conversation_history:
        role = "user" if msg.get("role") in ["user", "human"] else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.get("text", "")}]
        })

    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_inst}]
        },
        "generationConfig": {
            "temperature": 0.3
        }
    }

    raw_response = call_gemini_raw(payload)

    try:
        candidates = raw_response.get("candidates", [])
        if not candidates:
            raise GeminiApiError("Gemini API returned no response candidates.")
        return candidates[0].get("content", {}).get("parts", [])[0].get("text", "")
    except (IndexError, KeyError) as e:
        raise GeminiApiError(f"Unexpected response structure from Gemini: {e}")

