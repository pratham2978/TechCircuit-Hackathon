import os
from pathlib import Path

# Load .env — prefer python-dotenv if installed, otherwise parse manually
def load_dotenv():
    try:
        from dotenv import load_dotenv as _load
        # Check backend directory first, then cwd
        possible_env_paths = [
            Path(__file__).resolve().parent.parent / ".env",
            Path.cwd() / "backend" / ".env",
            Path.cwd() / ".env",
            Path(__file__).resolve().parent.parent.parent / ".env",
        ]
        for env_path in possible_env_paths:
            if env_path.is_file():
                _load(dotenv_path=env_path, override=False)
                break
    except ImportError:
        # Fallback: manual parser (no external deps)
        possible_env_paths = [
            Path(__file__).resolve().parent.parent / ".env",
            Path.cwd() / "backend" / ".env",
            Path.cwd() / ".env",
            Path(__file__).resolve().parent.parent.parent / ".env",
        ]
        for env_path in possible_env_paths:
            if env_path.is_file():
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                key, val = line.split("=", 1)
                                key = key.strip()
                                val = val.strip().strip('"').strip("'")
                                if key and key not in os.environ:
                                    os.environ[key] = val
                except Exception:
                    pass
                break

load_dotenv()

# Server Settings
PORT = int(os.getenv("PORT", "8000"))
NODE_ENV = os.getenv("NODE_ENV", "development").strip()
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").strip()

# AI Provider Settings
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

# Database Settings
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./brandguard.db").strip()

# Storage Settings
raw_upload_dir = os.getenv("UPLOAD_DIR", "uploads").strip()
if os.path.isabs(raw_upload_dir):
    UPLOAD_DIR = Path(raw_upload_dir)
else:
    # Anchor to backend directory
    UPLOAD_DIR = Path(__file__).resolve().parent.parent / raw_upload_dir

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Ensure base uploads directory exists securely
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
