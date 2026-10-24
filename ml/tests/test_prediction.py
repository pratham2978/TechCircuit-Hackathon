"""
Tests for Model Inference, Prediction Interface, and Edge Cases.
"""

import sys
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from ml.config import LABELS, MODEL_PATH, METADATA_PATH, MAX_TEXT_LENGTH
from ml.predict import predict_tone, get_model


def test_model_artifact_exists():
    assert MODEL_PATH.exists(), f"Trained model artifact missing at {MODEL_PATH}"
    assert METADATA_PATH.exists(), f"Model metadata missing at {METADATA_PATH}"


def test_predict_tone_valid_output():
    sample_text = "The quarterly financial report summarizes operational margins and capital expenses."
    result = predict_tone(sample_text)

    assert isinstance(result, dict)
    assert "label" in result
    assert result["label"] in LABELS
    assert "confidence" in result
    assert 0.0 <= result["confidence"] <= 1.0
    assert "probabilities" in result
    assert isinstance(result["probabilities"], dict)
    assert set(result["probabilities"].keys()) == set(LABELS)
    assert "model_version" in result
    assert "is_uncertain" in result
    assert isinstance(result["is_uncertain"], bool)


def test_predict_tone_empty_input_raises_error():
    with pytest.raises(ValueError, match="cannot be empty"):
        predict_tone("")

    with pytest.raises(ValueError, match="cannot be empty"):
        predict_tone("    \n\t  ")


def test_predict_tone_invalid_type_raises_error():
    with pytest.raises(ValueError, match="must be a string"):
        predict_tone(None)

    with pytest.raises(ValueError, match="must be a string"):
        predict_tone(12345)


def test_predict_tone_excessive_length_raises_error():
    long_text = "word " * (MAX_TEXT_LENGTH + 50)
    with pytest.raises(ValueError, match="exceeds maximum length"):
        predict_tone(long_text)


def test_predict_tone_short_text_flags_uncertainty():
    short_text = "Hey"
    result = predict_tone(short_text)
    assert result["is_uncertain"] is True
    assert "warning" in result


def test_predict_tone_cached_instance():
    model1, meta1 = get_model()
    model2, meta2 = get_model()
    # Identical memory reference confirms caching without disk reload
    assert model1 is model2
    assert meta1 is meta2


def test_predict_tone_all_categories():
    test_cases = [
        ("The system architecture complies with standard enterprise security protocols.", "professional"),
        ("ACT NOW! Flash sale ends in 30 minutes! Claim your 80% discount immediately!", "urgent"),
        ("Hey folks! Just dropping by to say hello and hope your week is off to an awesome start.", "casual"),
        ("Our revolutionary magical platform will completely blow your mind with miracles!", "promotional"),
        ("Their software is absolute garbage and their incompetent CEO is a pathetic clown.", "aggressive_inappropriate"),
    ]

    for text, expected_label in test_cases:
        res = predict_tone(text)
        assert res["label"] in LABELS
        assert res["label"] == expected_label, f"Text '{text}' expected '{expected_label}', got '{res['label']}'"
