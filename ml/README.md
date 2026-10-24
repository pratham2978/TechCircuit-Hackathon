# BrandProof — Machine Learning Module (`ml/`)

**Role Owner:** Person 3 (Machine Learning Engineer)  
**Status:** Phase 1 Design, Specification & Workspace Setup (Pre-Training)  
**Hardware Profile:** Standard Host CPU (Local execution, zero external AI APIs)

---

## 1. Overview & Purpose

The `ml/` directory encapsulates all machine learning engineering for the BrandProof platform:
- Data collection, annotation, and stratified splitting.
- Offline training, hyperparameter exploration, and model selection.
- Serialization and evaluation of lightweight classical NLP models.
- The local inference module (`predict_tone`) consumed by Person 2's backend services.

---

## 2. Directory Layout

```
ml/
├── README.md                      # ML module documentation & quickstart
├── requirements.txt               # scikit-learn, pandas, numpy, joblib, pytest
├── docs/                          # Detailed ML architecture & planning documents
│   ├── ML_SPECIFICATION.md        # Problem statement, 5 tone categories, evaluation criteria
│   ├── DATASET_PLAN.md            # Public dataset review, seed schema, licensing verification
│   └── BACKEND_INTEGRATION_CONTRACT.md # Function signature & schema agreement for Person 2
├── data/                          # Seed datasets, train/val/test splits, benchmark data
├── models/                        # Serialized .joblib artifacts and training metadata
├── scripts/                       # Training, validation, and evaluation CLI tools
└── tests/                         # Unit tests, data leakage tests, and benchmark regression suites
```

---

## 3. Core Decisions Summary

| Dimension | Decision | Rationale |
| :--- | :--- | :--- |
| **Model Architecture** | TF-IDF (1-2 n-grams) + Logistic Regression / LinearSVC | Sub-5 second training on CPU; sub-15ms inference; full linear explainability; zero GPU dependency. |
| **Tone Taxonomy** | 5 non-overlapping classes (`professional`, `promotional`, `casual`, `urgent`, `aggressive_inappropriate`) | Captures the primary commercial compliance failure modes in enterprise marketing copy. |
| **No External APIs** | 100% local execution using `scikit-learn` and `joblib` | Strictly adheres to competition constraints; preserves complete confidentiality of marketing drafts. |
| **Backend Contract** | Single Python function: `predict_tone(text: str) -> dict` | Decouples backend API routing from internal scikit-learn pipeline mechanics. |

---

## 4. Documentation Links

- Detailed ML Specification: [ml/docs/ML_SPECIFICATION.md](file:///c:/Users/Praveen/Documents/Hackathon%20Project/Inkloom%20AI/ml/docs/ML_SPECIFICATION.md)
- Dataset Strategy & Investigation Plan: [ml/docs/DATASET_PLAN.md](file:///c:/Users/Praveen/Documents/Hackathon%20Project/Inkloom%20AI/ml/docs/DATASET_PLAN.md)
- Backend Integration Contract: [ml/docs/BACKEND_INTEGRATION_CONTRACT.md](file:///c:/Users/Praveen/Documents/Hackathon%20Project/Inkloom%20AI/ml/docs/BACKEND_INTEGRATION_CONTRACT.md)
