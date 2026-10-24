"""
BrandProof Model Training & Comparison Pipeline.

Trains, evaluates, and compares three scikit-learn models on TF-IDF features:
  1. Multinomial Naive Bayes (MultinomialNB)
  2. Logistic Regression (LogisticRegression)
  3. Linear Support Vector Classifier (LinearSVC)

Selects the best model based on validation macro-F1 score and serializes the
fitted pipeline and metadata to ml/models/.
"""

import sys
import json
import logging
import datetime
from pathlib import Path
import pandas as pd
import joblib

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, f1_score, accuracy_score

try:
    from ml.config import (
        TRAIN_DATA_PATH,
        VAL_DATA_PATH,
        MODEL_PATH,
        METADATA_PATH,
        MODEL_VERSION,
        LABELS,
        RANDOM_SEED,
        TFIDF_PARAMS,
    )
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from ml.config import (
        TRAIN_DATA_PATH,
        VAL_DATA_PATH,
        MODEL_PATH,
        METADATA_PATH,
        MODEL_VERSION,
        LABELS,
        RANDOM_SEED,
        TFIDF_PARAMS,
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train")


def load_train_and_val_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Loads training and validation datasets."""
    if not TRAIN_DATA_PATH.exists() or not VAL_DATA_PATH.exists():
        raise FileNotFoundError(
            f"Processed data files missing. Expected {TRAIN_DATA_PATH} and {VAL_DATA_PATH}. "
            "Please run prepare_data.py first."
        )

    train_df = pd.read_csv(TRAIN_DATA_PATH)
    val_df = pd.read_csv(VAL_DATA_PATH)

    logger.info("Loaded Train set: %d rows, Validation set: %d rows", len(train_df), len(val_df))
    return train_df, val_df


def build_candidate_models() -> dict[str, Pipeline]:
    """
    Builds the 3 candidate scikit-learn pipelines with TF-IDF feature extraction.
    """
    vectorizer = TfidfVectorizer(**TFIDF_PARAMS)

    # Candidate 1: Multinomial Naive Bayes
    nb_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(**TFIDF_PARAMS)),
        ("classifier", MultinomialNB(alpha=0.5)),
    ])

    # Candidate 2: Logistic Regression (balanced class weights)
    lr_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(**TFIDF_PARAMS)),
        ("classifier", LogisticRegression(
            C=1.0,
            max_iter=1000,
            class_weight="balanced",
            random_state=RANDOM_SEED,
        )),
    ])

    # Candidate 3: Calibrated Linear SVM (Platt scaling for probability support)
    svm_base = LinearSVC(
        C=1.0,
        class_weight="balanced",
        random_state=RANDOM_SEED,
    )
    svm_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(**TFIDF_PARAMS)),
        ("classifier", CalibratedClassifierCV(estimator=svm_base, cv=3)),
    ])

    return {
        "Multinomial Naive Bayes": nb_pipeline,
        "Logistic Regression": lr_pipeline,
        "Linear SVM (Calibrated)": svm_pipeline,
    }


def evaluate_model_on_val(pipeline: Pipeline, X_val, y_val) -> dict:
    """Evaluates a fitted pipeline on validation data."""
    preds = pipeline.predict(X_val)
    macro_f1 = float(f1_score(y_val, preds, average="macro", zero_division=0))
    accuracy = float(accuracy_score(y_val, preds))
    report = classification_report(y_val, preds, labels=LABELS, output_dict=True, zero_division=0)

    per_class_metrics = {}
    for label in LABELS:
        if label in report:
            per_class_metrics[label] = {
                "precision": round(float(report[label]["precision"]), 4),
                "recall": round(float(report[label]["recall"]), 4),
                "f1": round(float(report[label]["f1-score"]), 4),
                "support": int(report[label]["support"]),
            }

    return {
        "macro_f1": round(macro_f1, 4),
        "accuracy": round(accuracy, 4),
        "per_class": per_class_metrics,
    }


def train_and_select_model() -> tuple[str, Pipeline, dict]:
    """
    Fits all 3 candidates on the training set, evaluates on the validation set,
    and selects the champion model based on macro-F1.
    """
    train_df, val_df = load_train_and_val_data()

    X_train = train_df["text"].tolist()
    y_train = train_df["label"].tolist()
    X_val = val_df["text"].tolist()
    y_val = val_df["label"].tolist()

    candidates = build_candidate_models()
    results = {}

    best_name = None
    best_pipeline = None
    best_macro_f1 = -1.0

    logger.info("--- Starting Model Training & Validation Comparison ---")
    for name, pipeline in candidates.items():
        logger.info("Fitting candidate: %s ...", name)
        pipeline.fit(X_train, y_train)

        metrics = evaluate_model_on_val(pipeline, X_val, y_val)
        results[name] = metrics

        logger.info("Candidate '%s' -> Validation Macro-F1: %.4f | Accuracy: %.4f",
                    name, metrics["macro_f1"], metrics["accuracy"])

        if metrics["macro_f1"] > best_macro_f1:
            best_macro_f1 = metrics["macro_f1"]
            best_name = name
            best_pipeline = pipeline

    logger.info("==================================================")
    logger.info("CHAMPION MODEL SELECTED: %s (Validation Macro-F1: %.4f)", best_name, best_macro_f1)
    logger.info("==================================================")

    # Persist the selected model
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipeline, MODEL_PATH)
    logger.info("Saved champion model pipeline to %s", MODEL_PATH)

    # Build and save metadata
    metadata = {
        "model_version": MODEL_VERSION,
        "selected_algorithm": best_name,
        "supported_labels": LABELS,
        "training_data_provenance": "ml/data/processed/train.csv",
        "dataset_type": "synthetic_development_data",
        "dataset_disclaimer": "Trained on curated synthetic development data. Real-world evaluation required for production.",
        "training_timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "random_seed": RANDOM_SEED,
        "training_examples_count": len(train_df),
        "validation_examples_count": len(val_df),
        "feature_extraction": TFIDF_PARAMS,
        "validation_macro_f1": best_macro_f1,
        "validation_metrics": results[best_name],
        "all_candidate_results": results,
        "known_limitations": [
            "Evaluates text snippets without broader campaign context.",
            "Trained on synthetic development examples; edge cases may require human review.",
            "Sub-sentence slogans (<5 words) may exhibit higher uncertainty.",
        ],
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved model metadata to %s", METADATA_PATH)

    return best_name, best_pipeline, metadata


if __name__ == "__main__":
    train_and_select_model()
