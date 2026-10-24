# ML Models Directory

This directory stores serialized local model artifacts (`.joblib`) produced by the reproducible training pipeline:

- `tone_vectorizer.joblib`: Fitted scikit-learn `TfidfVectorizer`.
- `tone_classifier.joblib`: Trained scikit-learn classifier (`LinearSVC` or `LogisticRegression`).
- `metadata.json`: Timestamp, commit hash, hyperparameters, and evaluation metrics achieved on the held-out test split.

### Rules:
- Model artifacts are generated via `python ml/scripts/train.py`.
- No model is committed without corresponding test-set evaluation metrics recorded in `metadata.json`.
