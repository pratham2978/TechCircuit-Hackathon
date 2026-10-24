"""
BrandProof Test Set Evaluation Module.

Evaluates the champion trained model against the reserved, held-out test set.
Generates accuracy, macro-F1, per-class metrics, confusion matrix, and misclassification analysis.
Saves readable text and JSON reports to ml/reports/.
"""

import sys
import json
import logging
from pathlib import Path
import pandas as pd
import joblib

from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    classification_report,
    confusion_matrix,
)

try:
    from ml.config import (
        TEST_DATA_PATH,
        MODEL_PATH,
        METADATA_PATH,
        EVALUATION_REPORT_PATH,
        EVALUATION_TEXT_PATH,
        REPORTS_DIR,
        LABELS,
    )
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from ml.config import (
        TEST_DATA_PATH,
        MODEL_PATH,
        METADATA_PATH,
        EVALUATION_REPORT_PATH,
        EVALUATION_TEXT_PATH,
        REPORTS_DIR,
        LABELS,
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluate")


def load_model_and_test_data():
    """Loads the serialized champion model and the reserved test dataset."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Run train.py first.")
    if not TEST_DATA_PATH.exists():
        raise FileNotFoundError(f"Test data file not found at {TEST_DATA_PATH}. Run prepare_data.py first.")

    pipeline = joblib.load(MODEL_PATH)
    test_df = pd.read_csv(TEST_DATA_PATH)

    logger.info("Loaded model from %s and test dataset (%d records) from %s",
                MODEL_PATH, len(test_df), TEST_DATA_PATH)
    return pipeline, test_df


def evaluate_test_set():
    """Executes full evaluation on the reserved test dataset."""
    pipeline, test_df = load_model_and_test_data()

    X_test = test_df["text"].tolist()
    y_test = test_df["label"].tolist()

    # Model predictions
    y_pred = pipeline.predict(X_test)
    y_proba = None
    if hasattr(pipeline, "predict_proba"):
        y_proba = pipeline.predict_proba(X_test)

    # Core Metrics
    accuracy = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    macro_precision = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    macro_recall = float(recall_score(y_test, y_pred, average="macro", zero_division=0))

    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred, labels=LABELS)
    cm_dict = {
        true_lbl: {pred_lbl: int(cm[i][j]) for j, pred_lbl in enumerate(LABELS)}
        for i, true_lbl in enumerate(LABELS)
    }

    # Classification Report
    cls_report = classification_report(y_test, y_pred, labels=LABELS, output_dict=True, zero_division=0)
    cls_text = classification_report(y_test, y_pred, labels=LABELS, zero_division=0)

    # Misclassification analysis
    misclassified = []
    for idx, (text, true_lbl, pred_lbl) in enumerate(zip(X_test, y_test, y_pred)):
        if true_lbl != pred_lbl:
            top_prob = None
            if y_proba is not None:
                top_prob = round(float(max(y_proba[idx])), 4)
            misclassified.append({
                "test_index": idx,
                "text": text,
                "ground_truth": true_lbl,
                "predicted": pred_lbl,
                "confidence": top_prob,
            })

    # Load training metadata if available
    metadata = {}
    if METADATA_PATH.exists():
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            metadata = json.load(f)

    # JSON evaluation report
    report_data = {
        "evaluation_timestamp": str(pd.Timestamp.now(tz="UTC")),
        "model_version": metadata.get("model_version", "unknown"),
        "selected_algorithm": metadata.get("selected_algorithm", "unknown"),
        "dataset_type": "synthetic_development_data",
        "dataset_disclaimer": (
            "NOTICE: This evaluation was conducted on a held-out synthetic development dataset. "
            "It establishes pipeline correctness and functional baseline validity, but does NOT "
            "prove production generalization to arbitrary unseen real-world corporate copy."
        ),
        "test_records_count": len(test_df),
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "macro_precision": round(macro_precision, 4),
        "macro_recall": round(macro_recall, 4),
        "per_class_metrics": {
            lbl: {
                "precision": round(float(cls_report[lbl]["precision"]), 4),
                "recall": round(float(cls_report[lbl]["recall"]), 4),
                "f1_score": round(float(cls_report[lbl]["f1-score"]), 4),
                "support": int(cls_report[lbl]["support"]),
            }
            for lbl in LABELS if lbl in cls_report
        },
        "confusion_matrix": cm_dict,
        "misclassifications_count": len(misclassified),
        "misclassifications": misclassified,
    }

    # Save JSON report
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(EVALUATION_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # Save human-readable text report
    with open(EVALUATION_TEXT_PATH, "w", encoding="utf-8") as f:
        f.write("=======================================================\n")
        f.write("      BRANDPROOF TONE CLASSIFIER EVALUATION REPORT     \n")
        f.write("=======================================================\n\n")
        f.write(f"Model Version:       {report_data['model_version']}\n")
        f.write(f"Selected Algorithm:  {report_data['selected_algorithm']}\n")
        f.write(f"Dataset Type:        {report_data['dataset_type']}\n")
        f.write(f"Test Set Records:    {len(test_df)}\n")
        f.write(f"Overall Accuracy:    {accuracy:.4f} ({accuracy*100:.1f}%)\n")
        f.write(f"Macro F1-Score:      {macro_f1:.4f}\n")
        f.write(f"Macro Precision:     {macro_precision:.4f}\n")
        f.write(f"Macro Recall:        {macro_recall:.4f}\n\n")
        f.write("--- Classification Report ---\n")
        f.write(cls_text)
        f.write("\n--- Confusion Matrix (Rows=True, Cols=Predicted) ---\n")
        col_header = "                " + "".join(f"{lbl[:10]:>12}" for lbl in LABELS)
        f.write(col_header + "\n")
        for true_lbl in LABELS:
            row_str = f"{true_lbl[:15]:<16}" + "".join(f"{cm_dict[true_lbl][pred_lbl]:>12}" for pred_lbl in LABELS)
            f.write(row_str + "\n")

        f.write(f"\n--- Misclassifications ({len(misclassified)} total) ---\n")
        if not misclassified:
            f.write("None! 100% correct predictions on held-out test split.\n")
        else:
            for item in misclassified:
                f.write(f"- Text: '{item['text']}'\n")
                f.write(f"  True: {item['ground_truth']} | Pred: {item['predicted']} (Conf: {item['confidence']})\n")

        f.write("\n--- Integrity Disclaimer ---\n")
        f.write(report_data["dataset_disclaimer"] + "\n")

    logger.info("Evaluation complete! Reports saved to:\n  - %s\n  - %s",
                EVALUATION_REPORT_PATH, EVALUATION_TEXT_PATH)
    logger.info("Test Macro-F1: %.4f | Accuracy: %.4f | Misclassifications: %d",
                macro_f1, accuracy, len(misclassified))

    return report_data


if __name__ == "__main__":
    evaluate_test_set()
