# ML Tests Directory

Automated test suites for the ML module using `pytest`:

- `test_preprocessor.py`: Verifies text normalization, tokenization, and stopword handling.
- `test_predictor.py`: Verifies `predict_tone` input/output contract, error handling, and thread safety.
- `test_data_leakage.py`: Asserts zero overlap between train and test splits.
- `test_benchmarks.py`: Regression test verifying known golden sentences are classified with expected labels.
