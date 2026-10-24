# ML Scripts Directory

Contains standalone, reproducible command-line scripts for data engineering, model training, and evaluation:

1. `validate_dataset.py`: Validates schema, class counts, and checks for duplicates.
2. `make_splits.py`: Performs stratified 70/15/15 train/val/test splitting with SHA-256 deduplication.
3. `train.py`: Trains MultinomialNB, LogisticRegression, and LinearSVC on the training split, selects best model via validation split, and serializes artifacts to `ml/models/`.
4. `evaluate.py`: Generates confusion matrix, classification report, and latency metrics on the held-out test split.
