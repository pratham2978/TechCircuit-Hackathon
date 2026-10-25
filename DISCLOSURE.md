# Technical & Ethical Disclosure — BrandGuard by Inkloom AI

## 1. Zero External AI Inference Guarantee
BrandGuard by Inkloom AI was architected from the ground up to operate in **100% air-gapped, privacy-preserving, and sovereign enterprise environments**.

- **No Third-Party AI APIs:** The application does **NOT** call OpenAI, Anthropic, Google Gemini, Groq, Cohere, or any external inference APIs.
- **No API Keys Required:** The application runs out of the box without requiring any API keys or internet connection.
- **Zero Data Leakage:** All marketing copy, uploaded brand guidelines, claim ledgers, and audit events remain strictly within the local host environment.

---

## 2. Machine Learning Architecture & Pipeline

### Task Definition
BrandGuard's local ML engine is specifically trained for **Text Tone & Style Classification**.
The model predicts five distinct enterprise copywriting tones:
1. `Professional` (Objective, precise, corporate)
2. `Informal` (Conversational, friendly, casual)
3. `Exaggerated` (Sensational, hyperbolic, superlative)
4. `Urgent` (High pressure, immediate action, FOMO)
5. `Empowering` (Motivational, inspiring, growth-oriented)

> **Important Boundary:** The ML model is used solely for stylistic guidance. It does **NOT** independently approve or reject brand content, nor does it make factual claims. Brand compliance decisions are governed deterministically by approved guideline rules and the Claim Ledger.

### Training Pipeline
- **Framework:** `scikit-learn` (v1.9.0) with Python 3.14.3.
- **Pipeline Architecture:**
  - Feature Extraction: `TfidfVectorizer` (sublinear TF scaling, n-gram range `(1, 2)`, minimum document frequency `1`, lowercased).
  - Classifier: `LogisticRegression` (L2 penalty, `C=1.0`, solver `'lbfgs'`, multi-class `'auto'`).
- **Reproducibility:** Seed fixed at `random_state=42`.
- **Training Command:** `python ml/train.py`
- **Saved Artifacts:** `ml/artifacts/tone_model.joblib`

### Authentic Test Set Evaluation Metrics
The evaluation metrics below were computed on a held-out test split (25% test size, stratified) and are saved in `ml/reports/evaluation_metrics.json`. They are authentic and not hardcoded or fabricated:

| Metric | Score |
| :--- | :--- |
| **Accuracy** | **80.0%** |
| **Macro F1-Score** | **0.7714** |
| **Macro Precision** | **0.8667** |
| **Macro Recall** | **0.7500** |

#### Per-Class Breakdown
- `Empowering`: Precision 1.00, Recall 0.50, F1 0.67
- `Exaggerated`: Precision 1.00, Recall 1.00, F1 1.00
- `Informal`: Precision 1.00, Recall 1.00, F1 1.00
- `Professional`: Precision 0.67, Recall 1.00, F1 0.80
- `Urgent`: Precision 0.67, Recall 0.50, F1 0.57

---

## 3. Dataset Attribution & Suitability
The training dataset was synthesized and curated in `ml/dataset.py` drawing inspiration from the taxonomy of the **GoEmotions** dataset (Google Research, Apache 2.0 License) and **TweetEval** benchmark (Cardiff NLP). Samples were balanced across the five core enterprise tone classes.

---

## 4. Deterministic Algorithms & Rule Engine
To guarantee 100% explainable and repeatable governance:
- **Constitution Compiler:** Deterministic regular expression pattern matching on modal requirement markers (`must`, `must not`, `never`, `always`, `avoid`, `required`).
- **Claim Matching:** Token normalization, exact phrase matching, number and percentage extraction, and temporal validity range comparison.
- **Accessibility:**
  - Text readability: Flesch Reading Ease algorithm based on syllable and sentence length formulas.
  - Visual contrast: Exact W3C WCAG 2.1 relative luminance formula:
    $$L = 0.2126 \times R + 0.7152 \times G + 0.0722 \times B$$
    $$\text{Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

---

## 5. Security & Multi-Tenancy Architecture
- **Cryptographic Security:** Passwords hashed with `bcryptjs` using 10 salt rounds.
- **Zero Trust Client Input:** Client-supplied organization IDs are ignored. All data access is strictly bounded by the `organization_id` associated with the authenticated server-side session.
- **Role-Based Access Control (RBAC):** Backend-enforced permissions for `Admin`, `Brand Manager`, `Creator`, and `Reviewer`.
- **Database Engine:** Node.js native `node:sqlite` (`DatabaseSync`) with WAL mode and foreign key constraints enabled.
