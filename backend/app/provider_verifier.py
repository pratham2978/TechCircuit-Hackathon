import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from app.config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL, ACTIVE_AI_PROVIDER


def detect_provider_from_key(key: str) -> str:
    """Detect which AI service provider an API key belongs to based on standard prefixes and formats."""
    if not key or not isinstance(key, str):
        return "none"
    k = key.strip()
    if k.startswith("AIzaSy") or (k.startswith("AIza") and len(k) == 39):
        return "gemini"
    elif k.startswith("sk-proj-") or (k.startswith("sk-") and not k.startswith("sk-ant-")):
        return "openai"
    elif k.startswith("sk-ant-"):
        return "anthropic"
    elif k.startswith("gsk_"):
        return "groq"
    else:
        return "unknown"


def mask_api_key(key: str) -> str:
    """Mask key safely for logging or status displays (e.g., AIzaSy...x89A)."""
    if not key:
        return "NOT_SET"
    k = key.strip()
    if len(k) <= 8:
        return "***"
    return f"{k[:6]}...{k[-4:]}"


def verify_gemini_key(key: str) -> Dict[str, Any]:
    """
    Safely ping Google Gemini models endpoint to verify key validity and model availability.
    """
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    req = urllib.request.Request(endpoint, headers={"Content-Type": "application/json"}, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("name", "").replace("models/", "") for m in data.get("models", [])]
            has_target_model = any(GEMINI_MODEL in m for m in models) or any("gemini-2.5-flash" in m or "gemini-1.5-flash" in m for m in models)
            return {
                "valid": True,
                "provider": "google_gemini",
                "status": "authenticated",
                "target_model_supported": has_target_model,
                "models_available_count": len(models),
                "message": f"Successfully authenticated with Google Gemini. Target model ({GEMINI_MODEL}) is available."
            }
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(error_msg)
            msg = err_json.get("error", {}).get("message", error_msg)
            status_desc = err_json.get("error", {}).get("status", "")
        except Exception:
            msg = error_msg
            status_desc = ""

        if e.code == 400 and ("API_KEY_INVALID" in msg or "API key not valid" in msg):
            return {
                "valid": False,
                "provider": "google_gemini",
                "status": "invalid_key",
                "message": "Google Gemini API key provided, but Google reported the key is invalid or revoked."
            }
        elif e.code == 403:
            return {
                "valid": False,
                "provider": "google_gemini",
                "status": "forbidden_or_quota",
                "message": f"Google Gemini returned HTTP 403: {msg}"
            }
        return {
            "valid": False,
            "provider": "google_gemini",
            "status": f"http_error_{e.code}",
            "message": f"Gemini verification error ({e.code}): {msg}"
        }
    except urllib.error.URLError as e:
        return {
            "valid": False,
            "provider": "google_gemini",
            "status": "network_unreachable",
            "message": f"Network connection to Google Gemini API failed: {e.reason}"
        }
    except Exception as e:
        return {
            "valid": False,
            "provider": "google_gemini",
            "status": "error",
            "message": f"Verification error: {str(e)}"
        }


def verify_groq_key(key: str) -> Dict[str, Any]:
    """
    Safely ping Groq models endpoint to verify key validity.
    """
    endpoint = "https://api.groq.com/openai/v1/models"
    req = urllib.request.Request(
        endpoint,
        headers={
            "Authorization": f"Bearer {key}",
            "User-Agent": "BrandGuard/1.0"
        },
        method="GET"
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("id", "") for m in data.get("data", [])]
            return {
                "valid": True,
                "provider": "groq",
                "status": "authenticated",
                "target_model_supported": True,
                "models_available_count": len(models),
                "message": f"Successfully authenticated with Groq Cloud. Model: {GROQ_MODEL}."
            }
    except Exception as e:
        return {
            "valid": False,
            "provider": "groq",
            "status": "error",
            "message": f"Groq verification error: {str(e)}"
        }


def check_current_ai_configuration() -> Dict[str, Any]:
    """
    Inspect the configured key in backend environment and verify provider compatibility.
    """
    key = GROQ_API_KEY or GEMINI_API_KEY
    if not key:
        return {
            "configured": False,
            "provider": None,
            "masked_key": "NOT_SET",
            "message": (
                "No API key is configured in backend environment or .env file. "
                "Set GROQ_API_KEY or GEMINI_API_KEY in backend/.env to connect live AI review."
            )
        }

    provider = detect_provider_from_key(key)
    masked = mask_api_key(key)

    if provider == "groq" or GROQ_API_KEY:
        verification = verify_groq_key(key)
        return {
            "configured": True,
            "provider": "groq",
            "masked_key": masked,
            "compatible": True,
            "target_model": GROQ_MODEL,
            **verification
        }
    elif provider == "gemini":
        verification = verify_gemini_key(key)
        return {
            "configured": True,
            "provider": "google_gemini",
            "masked_key": masked,
            "compatible": True,
            "target_model": GEMINI_MODEL,
            **verification
        }
    elif provider == "openai":
        return {
            "configured": True,
            "provider": "openai",
            "masked_key": masked,
            "compatible": False,
            "status": "incompatible_provider",
            "message": (
                "The configured key starts with 'sk-', indicating an OpenAI API key. "
                "BrandGuard supports Groq Cloud (GROQ_API_KEY) and Google Gemini (GEMINI_API_KEY)."
            )
        }
    elif provider == "anthropic":
        return {
            "configured": True,
            "provider": "anthropic",
            "masked_key": masked,
            "compatible": False,
            "status": "incompatible_provider",
            "message": "The configured key is an Anthropic Claude key. BrandGuard supports Groq or Gemini."
        }
    else:
        return {
            "configured": True,
            "provider": "unknown",
            "masked_key": masked,
            "compatible": False,
            "status": "unrecognized_format",
            "message": "The configured API key format is not recognized. Use a Groq key (starts with 'gsk_') or Gemini key (starts with 'AIzaSy...')."
        }


