"""
BrandGuard Genuine Local ML Model Training Pipeline
Uses scikit-learn: TF-IDF Vectorization + Logistic Regression
Saves fitted model artifact to ml/artifacts/tone_model.joblib
Saves held-out test metrics to ml/reports/evaluation_metrics.json
"""

import os
import sys
import json
import joblib

if hasattr(sys.stdout, 'reconfigure'):
  sys.stdout.reconfigure(encoding='utf-8')

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
  accuracy_score,
  precision_score,
  recall_score,
  f1_score,
  classification_report,
  confusion_matrix
)
from dataset import TRAINING_DATA, TEST_DATA

def train_and_evaluate():
  print("=" * 60)
  print("[ML ENGINE] Training BrandGuard Local Tone & Emotion Classifier")
  print("=" * 60)

  X_train = [text for text, label in TRAINING_DATA]
  y_train = [label for text, label in TRAINING_DATA]

  X_test = [text for text, label in TEST_DATA]
  y_test = [label for text, label in TEST_DATA]

  print(f"Training samples: {len(X_train)} across 5 tone classes.")
  print(f"Held-out test samples: {len(X_test)}.")

  # Construct scikit-learn pipeline
  pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(
      ngram_range=(1, 2),
      lowercase=True,
      max_features=1000,
      sublinear_tf=True
    )),
    ('clf', LogisticRegression(
      random_state=42,
      C=2.0,
      max_iter=300
    ))
  ])

  # Fit pipeline
  pipeline.fit(X_train, y_train)
  print("Model training complete.")

  # Predict on held-out test set
  y_pred = pipeline.predict(X_test)
  y_proba = pipeline.predict_proba(X_test)

  # Compute authentic metrics
  acc = float(accuracy_score(y_test, y_pred))
  prec = float(precision_score(y_test, y_pred, average='macro', zero_division=0))
  rec = float(recall_score(y_test, y_pred, average='macro', zero_division=0))
  f1 = float(f1_score(y_test, y_pred, average='macro', zero_division=0))
  report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
  cm = confusion_matrix(y_test, y_pred).tolist()

  labels = sorted(list(set(y_train)))

  metrics = {
    "model_name": "BrandGuard Local Tone Classifier",
    "architecture": "TF-IDF (1-2 ngrams) + Multiclass Logistic Regression",
    "training_samples": len(X_train),
    "test_samples": len(X_test),
    "labels": labels,
    "accuracy": round(acc, 4),
    "precision_macro": round(prec, 4),
    "recall_macro": round(rec, 4),
    "f1_macro": round(f1, 4),
    "confusion_matrix": cm,
    "classification_report": report_dict
  }

  # Ensure directories exist
  base_dir = os.path.dirname(os.path.abspath(__file__))
  artifacts_dir = os.path.join(base_dir, "artifacts")
  reports_dir = os.path.join(base_dir, "reports")
  os.makedirs(artifacts_dir, exist_ok=True)
  os.makedirs(reports_dir, exist_ok=True)

  # Save artifact and metrics
  model_path = os.path.join(artifacts_dir, "tone_model.joblib")
  metrics_path = os.path.join(reports_dir, "evaluation_metrics.json")

  joblib.dump(pipeline, model_path)
  with open(metrics_path, "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2)

  print(f"\nArtifact saved: {model_path}")
  print(f"Metrics saved: {metrics_path}")
  print(f"\n--- Model Evaluation Summary ---")
  print(f"Accuracy:  {acc * 100:.2f}%")
  print(f"Precision: {prec * 100:.2f}%")
  print(f"Recall:    {rec * 100:.2f}%")
  print(f"Macro F1:  {f1 * 100:.2f}%")
  print("=" * 60)

  return metrics

if __name__ == "__main__":
  train_and_evaluate()
