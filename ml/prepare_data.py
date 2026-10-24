"""
BrandProof Data Preparation Module.

Loads raw marketing tone dataset, validates schema and labels, performs quality checks,
removes exact duplicates, and generates stratified train/val/test splits.
"""

import sys
import json
import argparse
import logging
from pathlib import Path
import pandas as pd
from sklearn.model_selection import StratifiedShuffleSplit

# Support importing config when run directly or as a module
try:
    from ml.config import (
        RAW_DATA_PATH,
        PROCESSED_DATA_DIR,
        TRAIN_DATA_PATH,
        VAL_DATA_PATH,
        TEST_DATA_PATH,
        DATA_SUMMARY_PATH,
        LABELS,
        RANDOM_SEED,
        TRAIN_RATIO,
        VAL_RATIO,
        TEST_RATIO,
        MIN_TEXT_LENGTH,
        MAX_TEXT_LENGTH,
    )
except ImportError:
    # Standalone execution fallback
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from ml.config import (
        RAW_DATA_PATH,
        PROCESSED_DATA_DIR,
        TRAIN_DATA_PATH,
        VAL_DATA_PATH,
        TEST_DATA_PATH,
        DATA_SUMMARY_PATH,
        LABELS,
        RANDOM_SEED,
        TRAIN_RATIO,
        VAL_RATIO,
        TEST_RATIO,
        MIN_TEXT_LENGTH,
        MAX_TEXT_LENGTH,
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("prepare_data")


def clean_text(text: str) -> str:
    """
    Normalizes whitespace while preserving tone-carrying capitalization and punctuation.
    """
    if not isinstance(text, str):
        return ""
    # Normalize multiple whitespace, tabs, and newlines into single spaces
    normalized = " ".join(text.strip().split())
    return normalized


def validate_and_clean_record(row: dict) -> tuple[bool, str]:
    """
    Validates a single data record.
    Returns (is_valid, rejection_reason).
    """
    text = row.get("text", "")
    label = row.get("label", "")

    if not isinstance(text, str) or not text.strip():
        return False, "EMPTY_TEXT"

    cleaned = clean_text(text)
    if len(cleaned) < MIN_TEXT_LENGTH:
        return False, f"TEXT_TOO_SHORT (<{MIN_TEXT_LENGTH} chars)"

    if len(cleaned) > MAX_TEXT_LENGTH:
        return False, f"TEXT_TOO_LONG (>{MAX_TEXT_LENGTH} chars)"

    if label not in LABELS:
        return False, f"INVALID_LABEL: '{label}'"

    return True, "VALID"


def load_and_preprocess_dataset(csv_path: Path) -> tuple[pd.DataFrame, dict]:
    """
    Loads raw CSV dataset, performs validation, deduplication, and quality tracking.
    """
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset file not found at: {csv_path}")

    logger.info("Loading raw dataset from %s", csv_path)
    df = pd.read_csv(csv_path)

    required_cols = {"text", "label"}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise ValueError(f"Dataset missing required columns: {missing_cols}")

    initial_count = len(df)
    logger.info("Initial record count: %d", initial_count)

    valid_rows = []
    rejected_reasons = {}

    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        is_valid, reason = validate_and_clean_record(row_dict)
        if is_valid:
            row_dict["text"] = clean_text(row_dict["text"])
            valid_rows.append(row_dict)
        else:
            rejected_reasons[reason] = rejected_reasons.get(reason, 0) + 1

    clean_df = pd.DataFrame(valid_rows)
    valid_count = len(clean_df)

    # Deduplication based on normalized text
    before_dedup = valid_count
    clean_df = clean_df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    duplicate_count = before_dedup - len(clean_df)

    logger.info("Validation complete: %d valid records, %d rejected, %d duplicate rows removed",
                len(clean_df), sum(rejected_reasons.values()), duplicate_count)

    class_distribution = clean_df["label"].value_counts().to_dict()
    logger.info("Cleaned Class Distribution: %s", class_distribution)

    quality_summary = {
        "raw_path": str(csv_path),
        "initial_records": initial_count,
        "valid_records": len(clean_df),
        "rejected_records": sum(rejected_reasons.values()),
        "rejection_reasons": rejected_reasons,
        "exact_duplicates_removed": duplicate_count,
        "final_clean_records": len(clean_df),
        "class_distribution": class_distribution,
    }

    return clean_df, quality_summary


def split_dataset(df: pd.DataFrame, random_seed: int = RANDOM_SEED) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Performs stratified 70% Train, 15% Validation, 15% Test split.
    Guarantees no duplicate text leakage across splits.
    """
    total_len = len(df)
    if total_len < len(LABELS) * 5:
        raise ValueError(f"Dataset too small ({total_len} records) for reliable stratified 3-way split.")

    # Step 1: Split into Train (70%) and Temp (30%)
    split_1 = StratifiedShuffleSplit(n_splits=1, test_size=(VAL_RATIO + TEST_RATIO), random_state=random_seed)
    train_idx, temp_idx = next(split_1.split(df, df["label"]))

    train_df = df.iloc[train_idx].copy().reset_index(drop=True)
    temp_df = df.iloc[temp_idx].copy().reset_index(drop=True)

    # Step 2: Split Temp into Validation (50% of 30% = 15%) and Test (50% of 30% = 15%)
    split_2 = StratifiedShuffleSplit(n_splits=1, test_size=0.5, random_state=random_seed)
    val_idx, test_idx = next(split_2.split(temp_df, temp_df["label"]))

    val_df = temp_df.iloc[val_idx].copy().reset_index(drop=True)
    test_df = temp_df.iloc[test_idx].copy().reset_index(drop=True)

    # Assert zero cross-split leakage
    train_texts = set(train_df["text"])
    val_texts = set(val_df["text"])
    test_texts = set(test_df["text"])

    assert len(train_texts.intersection(val_texts)) == 0, "DATA LEAKAGE DETECTED: Train and Val overlap!"
    assert len(train_texts.intersection(test_texts)) == 0, "DATA LEAKAGE DETECTED: Train and Test overlap!"
    assert len(val_texts.intersection(test_texts)) == 0, "DATA LEAKAGE DETECTED: Val and Test overlap!"

    logger.info("Stratified Splits generated:")
    logger.info("  Train: %d (%.1f%%)", len(train_df), (len(train_df)/total_len)*100)
    logger.info("  Val:   %d (%.1f%%)", len(val_df), (len(val_df)/total_len)*100)
    logger.info("  Test:  %d (%.1f%%)", len(test_df), (len(test_df)/total_len)*100)

    return train_df, val_df, test_df


def prepare_data(raw_csv_path: Path = RAW_DATA_PATH, output_dir: Path = PROCESSED_DATA_DIR) -> dict:
    """
    Orchestrates full data preparation pipeline and saves outputs to disk.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    clean_df, summary = load_and_preprocess_dataset(raw_csv_path)

    train_df, val_df, test_df = split_dataset(clean_df, random_seed=RANDOM_SEED)

    train_path = output_dir / "train.csv"
    val_path = output_dir / "val.csv"
    test_path = output_dir / "test.csv"
    summary_path = output_dir / "dataset_summary.json"

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    summary["splits"] = {
        "train": {
            "path": str(train_path),
            "count": len(train_df),
            "class_distribution": train_df["label"].value_counts().to_dict(),
        },
        "val": {
            "path": str(val_path),
            "count": len(val_df),
            "class_distribution": val_df["label"].value_counts().to_dict(),
        },
        "test": {
            "path": str(test_path),
            "count": len(test_df),
            "class_distribution": test_df["label"].value_counts().to_dict(),
        },
    }

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    logger.info("Data preparation complete! Summary saved to %s", summary_path)
    return summary


def main():
    parser = argparse.ArgumentParser(description="BrandProof Data Preparation Pipeline")
    parser.add_argument("--input", type=Path, default=RAW_DATA_PATH, help="Path to raw dataset CSV")
    parser.add_argument("--output-dir", type=Path, default=PROCESSED_DATA_DIR, help="Path to output directory")
    args = parser.parse_args()

    prepare_data(raw_csv_path=args.input, output_dir=args.output_dir)


if __name__ == "__main__":
    main()
