"""
BrandProof Tone Prediction Module.

Provides a clean, reusable inference interface for Person 2 (Backend Application):
    from ml.predict import predict_tone
    result = predict_tone("Discover our powerful new product today!")

Also supports direct CLI invocation:
    python ml/predict.py "Discover our powerful new product today!"
"""

import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import joblib

try:
    from ml.config import (
        MODEL_PATH,
        METADATA_PATH,
        MODEL_VERSION,
        LABELS,
        MIN_TEXT_LENGTH,
        MAX_TEXT_LENGTH,
    )
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from ml.config import (
        MODEL_PATH,
        METADATA_PATH,
        MODEL_VERSION,
        LABELS,
        MIN_TEXT_LENGTH,
        MAX_TEXT_LENGTH,
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("predict")

# Cached model instance for thread-safe in-memory inference
_CACHED_MODEL = None
_CACHED_METADATA: Optional[Dict[str, Any]] = None


class ModelNotLoadedError(RuntimeError):
    """Raised when the trained model artifact cannot be found or loaded."""
    pass


def get_model():
    """
    Retrieves or loads the cached model pipeline.
    Avoids expensive disk reads on every inference call.
    """
    global _CACHED_MODEL, _CACHED_METADATA

    if _CACHED_MODEL is None:
        if not MODEL_PATH.exists():
            raise ModelNotLoadedError(
                f"Model artifact not found at {MODEL_PATH}. "
                "Please run `python ml/train.py` to train and serialize the model first."
            )
        try:
            _CACHED_MODEL = joblib.load(MODEL_PATH)
            logger.info("Successfully loaded and cached model from %s", MODEL_PATH)
        except Exception as e:
            raise ModelNotLoadedError(f"Failed to deserialize model at {MODEL_PATH}: {e}") from e

        if METADATA_PATH.exists():
            try:
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    _CACHED_METADATA = json.load(f)
            except Exception:
                _CACHED_METADATA = {"model_version": MODEL_VERSION}
        else:
            _CACHED_METADATA = {"model_version": MODEL_VERSION}

    return _CACHED_MODEL, _CACHED_METADATA


def extract_top_features(pipeline, text: str, predicted_label: str, top_k: int = 3) -> list[str]:
    """
    Extracts the n-grams in the input text that contributed most strongly
    to the predicted class using the fitted linear coefficients.
    """
    try:
        vectorizer = pipeline.named_steps.get("tfidf")
        classifier = pipeline.named_steps.get("classifier")

        if vectorizer is None or classifier is None:
            return []

        # Check if classifier exposes coef_ (LogisticRegression or LinearSVC)
        if not hasattr(classifier, "coef_"):
            return []

        coef = classifier.coef_
        classes = list(classifier.classes_)
        if predicted_label not in classes:
            return []

        class_idx = classes.index(predicted_label)
        weights = coef[class_idx]

        # Transform single input text
        feature_names = vectorizer.get_feature_names_out()
        tfidf_vec = vectorizer.transform([text]).tocoo()

        scored_features = []
        for col_idx, tfidf_val in zip(tfidf_vec.col, tfidf_vec.data):
            score = tfidf_val * weights[col_idx]
            scored_features.append((feature_names[col_idx], score))

        # Sort by contribution score descending
        scored_features.sort(key=lambda x: x[1], reverse=True)
        return [feat for feat, sc in scored_features[:top_k] if sc > 0]
    except Exception:
        return []


def predict_tone(text: str) -> dict:
    """
    Classifies the marketing tone of the provided text string.

    Args:
        text (str): Input text snippet to evaluate.

    Returns:
        dict: {
            "label": str,
            "confidence": float,
            "probabilities": dict[str, float],
            "informative_features": list[str],
            "model_version": str,
            "is_uncertain": bool
        }
    """
    if not isinstance(text, str):
        raise ValueError(f"Input text must be a string, got {type(text).__name__}")

    cleaned = " ".join(text.strip().split())

    if len(cleaned) == 0:
        raise ValueError("Input text cannot be empty or solely whitespace.")

    if len(cleaned) > MAX_TEXT_LENGTH:
        raise ValueError(
            f"Input text exceeds maximum length of {MAX_TEXT_LENGTH} characters "
            f"(received {len(cleaned)} characters)."
        )

    pipeline, metadata = get_model()
    version_str = metadata.get("model_version", MODEL_VERSION)

    # Edge case: Very short snippet (< MIN_TEXT_LENGTH chars)
    if len(cleaned) < MIN_TEXT_LENGTH:
        return {
            "label": "professional",
            "confidence": 0.0,
            "probabilities": {lbl: 0.20 for lbl in LABELS},
            "informative_features": [],
            "model_version": version_str,
            "is_uncertain": True,
            "warning": f"Text too short (<{MIN_TEXT_LENGTH} chars) for reliable tone classification.",
        }

    # Model inference
    pred_label = str(pipeline.predict([cleaned])[0])

    # Probability calibration check
    probabilities = {}
    confidence = 0.0
    if hasattr(pipeline, "predict_proba"):
        proba_array = pipeline.predict_proba([cleaned])[0]
        classes = list(pipeline.classes_)
        for cls_name, prob in zip(classes, proba_array):
            probabilities[cls_name] = round(float(prob), 4)
        confidence = probabilities.get(pred_label, 0.0)
    else:
        # Fallback if model doesn't expose predict_proba
        probabilities = {lbl: (1.0 if lbl == pred_label else 0.0) for lbl in LABELS}
        confidence = 1.0

    # Uncertainty heuristic: confidence < 0.50 or narrow margin between top 2 classes
    sorted_probs = sorted(probabilities.values(), reverse=True)
    margin = (sorted_probs[0] - sorted_probs[1]) if len(sorted_probs) > 1 else 1.0
    is_uncertain = bool(confidence < 0.50 or margin < 0.10)

    # Extract top contributing features
    top_features = extract_top_features(pipeline, cleaned, pred_label, top_k=3)

    return {
        "label": pred_label,
        "confidence": confidence,
        "probabilities": probabilities,
        "informative_features": top_features,
        "model_version": version_str,
        "is_uncertain": is_uncertain,
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python ml/predict.py \"<marketing text snippet>\"")
        print("\nExample:")
        print("  python ml/predict.py \"Our revolutionary platform will blow your mind with magical results!\"")
        sys.exit(1)

    input_text = " ".join(sys.argv[1:])
    try:
        result = predict_tone(input_text)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
