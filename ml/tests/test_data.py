"""
Tests for Data Preparation and Dataset Quality.
"""

import sys
from pathlib import Path
import pytest
import pandas as pd

# Add repo root to sys.path so ml imports work cleanly
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from ml.config import (
    RAW_DATA_PATH,
    TRAIN_DATA_PATH,
    VAL_DATA_PATH,
    TEST_DATA_PATH,
    LABELS,
)
from ml.prepare_data import validate_and_clean_record, clean_text, split_dataset


def test_clean_text():
    assert clean_text("  hello   world  ") == "hello world"
    assert clean_text("line1\nline2\ttab") == "line1 line2 tab"
    assert clean_text("") == ""
    assert clean_text(None) == ""


def test_validate_and_clean_record():
    valid_record = {"text": "A valid professional marketing statement.", "label": "professional"}
    is_valid, reason = validate_and_clean_record(valid_record)
    assert is_valid is True
    assert reason == "VALID"

    # Empty text
    is_valid, reason = validate_and_clean_record({"text": "", "label": "professional"})
    assert is_valid is False
    assert reason == "EMPTY_TEXT"

    # Too short text
    is_valid, reason = validate_and_clean_record({"text": "Hi", "label": "casual"})
    assert is_valid is False
    assert "TEXT_TOO_SHORT" in reason

    # Invalid label
    is_valid, reason = validate_and_clean_record({"text": "Some text here.", "label": "unknown_tone"})
    assert is_valid is False
    assert "INVALID_LABEL" in reason


def test_raw_dataset_exists_and_valid():
    assert RAW_DATA_PATH.exists(), f"Raw dataset missing at {RAW_DATA_PATH}"
    df = pd.read_csv(RAW_DATA_PATH)
    assert len(df) >= 500, f"Expected at least 500 records, got {len(df)}"
    assert set(df.columns).issuperset({"text", "label", "source_type"})

    # Check that all labels belong to canonical set
    unique_labels = set(df["label"].unique())
    assert unique_labels.issubset(set(LABELS)), f"Unexpected labels found: {unique_labels - set(LABELS)}"


def test_processed_splits_exist_and_stratified():
    for path in [TRAIN_DATA_PATH, VAL_DATA_PATH, TEST_DATA_PATH]:
        assert path.exists(), f"Split missing at {path}"

    train_df = pd.read_csv(TRAIN_DATA_PATH)
    val_df = pd.read_csv(VAL_DATA_PATH)
    test_df = pd.read_csv(TEST_DATA_PATH)

    assert len(train_df) == 350
    assert len(val_df) == 75
    assert len(test_df) == 75

    # Check zero data leakage
    train_texts = set(train_df["text"])
    val_texts = set(val_df["text"])
    test_texts = set(test_df["text"])

    assert len(train_texts.intersection(val_texts)) == 0, "Train and Val share duplicate texts!"
    assert len(train_texts.intersection(test_texts)) == 0, "Train and Test share duplicate texts!"
    assert len(val_texts.intersection(test_texts)) == 0, "Val and Test share duplicate texts!"
