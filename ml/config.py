"""
BrandProof ML Configuration Module.

Centralized configuration for dataset paths, tone categories, feature extraction,
model hyperparameters, and artifact paths.
"""

from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"

# Ensure runtime directories exist
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Canonical Dataset Paths
RAW_DATA_PATH = RAW_DATA_DIR / "dataset.csv"
TRAIN_DATA_PATH = PROCESSED_DATA_DIR / "train.csv"
VAL_DATA_PATH = PROCESSED_DATA_DIR / "val.csv"
TEST_DATA_PATH = PROCESSED_DATA_DIR / "test.csv"
DATA_SUMMARY_PATH = PROCESSED_DATA_DIR / "dataset_summary.json"

# Artifact Paths
MODEL_PATH = MODELS_DIR / "brand_tone_model.joblib"
METADATA_PATH = MODELS_DIR / "model_metadata.json"
EVALUATION_REPORT_PATH = REPORTS_DIR / "evaluation_report.json"
EVALUATION_TEXT_PATH = REPORTS_DIR / "evaluation_report.txt"

# Model Identification
MODEL_VERSION = "brand-tone-v1.0.0-classical"

# Target Tone Categories (Canonical)
LABELS = [
    "professional",
    "promotional",
    "casual",
    "urgent",
    "aggressive_inappropriate",
]

# Label to ID and ID to Label mappings
LABEL_TO_ID = {label: i for i, label in enumerate(LABELS)}
ID_TO_LABEL = {i: label for i, label in enumerate(LABELS)}

# Split Ratios & Reproducibility Seed
RANDOM_SEED = 42
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

# Text Constraints
MIN_TEXT_LENGTH = 5
MAX_TEXT_LENGTH = 5000

# Feature Extraction Hyperparameters
TFIDF_PARAMS = {
    "ngram_range": (1, 2),
    "max_features": 15000,
    "sublinear_tf": True,
    "strip_accents": "unicode",
    "lowercase": True,
}
