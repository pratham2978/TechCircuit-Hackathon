# BrandProof — Machine Learning Tone Classification Specification

**Module:** `ml` (Brand Tone Classifier)  
**Role Owner:** Person 3 (Machine Learning Engineer)  
**Document Version:** 1.0.0-PHASE-1  
**Status:** Phase 1 Design & Specification (Pre-Training)  
**Target Consumer:** Person 2 (Backend / Application Developer) & Person 1 (UI / Review Workspace)

---

## 1. Problem Statement & Operational Boundary

### 1.1 The Machine Learning Task
In brand governance, marketing copy often deviates from an organization's desired voice before it ever violates an explicit factual claim or prohibited keyword. For example, copy may sound like a late-night infomercial, be excessively informal for an enterprise B2B product, or create artificial, pushy urgency.

The ML component's specific mandate is:
> **Given an input snippet of English marketing text (ranging from a single sentence to a paragraph of ~250 words), predict the dominant communicative tone from a predefined taxonomy of 5 mutually exclusive tone categories.**

### 1.2 Explicit Non-Goals & Architectural Boundaries
1. **Fact-Checking & Claim Verification is NOT an ML Classifier Task:** The model does **not** evaluate whether a product specification, battery runtime, or pricing claim is true. That responsibility belongs strictly to the **Evidence Ledger** (owned by Person 4 and Person 2), which retrieves and compares empirical claims against the Approved Fact Registry.
2. **Prohibited Terminology is NOT an ML Classifier Task:** Exact brand naming conventions (e.g., camel-casing *BrandProof*, rejecting *Brandproof*) are handled with 100% precision by the **Deterministic Rule Engine** (Person 2).
3. **No External AI APIs:** All feature extraction, model training, hyperparameter selection, and inference must occur on the local host machine using CPU-friendly classical machine learning (`scikit-learn`).

---

## 2. Tone Categories & Precise Labeling Guidelines

We define a 5-class non-overlapping taxonomy tailored to enterprise marketing content:

| Label ID | Tone Category | Definition | Key Linguistic Indicators |
| :--- | :--- | :--- | :--- |
| `professional` | Objective, authoritative, clear, and business-appropriate. | Focus on functionality, value proposition, and customer outcomes without hyperbole. Structured syntax, standard vocabulary, neutral sentiment. | *"delivers"*, *"features"*, *"designed for"*, *"enables teams to"*, *"standard"* |
| `promotional` | Exaggerated, sales-driven, superlative, and hype-oriented. | Heavy use of superlatives, unsubstantiated praise, exclamation marks, and emotional marketing buzzwords. | *"revolutionary"*, *"game-changing"*, *"unbelievable"*, *"world's best"*, *"miraculous"* |
| `casual` | Highly informal, conversational, slangy, or colloquial. | Use of idioms, conversational filler, colloquial contractions, emojis, and relaxed syntax unsuited for formal corporate releases. | *"hey there"*, *"super cool"*, *"gonna"*, *"awesome vibes"*, *"check it out"* |
| `urgent` | High-pressure, artificial scarcity, or fear-of-missing-out (FOMO). | Demands immediate reader action, emphasizes limited availability, countdowns, or impending loss. | *"act now"*, *"limited time only"*, *"don't miss out"*, *"before it's gone"*, *"hurry"* |
| `aggressive_inappropriate` | Hostile, combative, derogatory, sexually suggestive, or offensive. | Attacking competitors by name unfairly, condescending to the customer, profanity, or threatening tone. Violates basic brand safety. | *"pathetic"*, *"destroy the competition"*, *"idiots"*, *"garbage"*, offensive terms |

---

## 3. Representative Examples & Difficult Boundary Cases

### 3.1 Clear Representative Examples

- **`professional`:**
  - *"The Apex-X4 industrial drone features dual thermal sensors and delivers up to 42 minutes of flight time under standard operating conditions."*
  - *"Our compliance framework aligns with ISO 27001 standards to ensure enterprise-grade data security."*
- **`promotional`:**
  - *"Prepare to have your mind completely blown by the most revolutionary, magical drone ever created in human history!"*
  - *"Unlock infinite productivity with our jaw-dropping, unprecedented software breakthrough."*
- **`casual`:**
  - *"Hey folks! Just dropping by to let you know our new update is super slick and ready for you to take for a spin."*
  - *"Wanna get stuff done faster? Yeah, we thought so. Check out our new widgets."*
- **`urgent`:**
  - *"Final warning: your exclusive 50% discount expires in exactly 2 hours! Claim your license immediately before it is gone forever!"*
  - *"Seats are filling up fast! Register today or risk losing your spot to a competitor."*
- **`aggressive_inappropriate`:**
  - *"If your current vendor hasn't migrated to our platform yet, they are completely incompetent and wasting your company's money on garbage."*
  - *"Stop being an idiot and switch to the only real solution on the market."*

### 3.2 Difficult Boundary Cases & Resolution Rules

1. **Boundary: `professional` vs. `promotional` with strong positive adjective**
   - *Example:* *"Our advanced enterprise architecture provides exceptional performance for high-load systems."*
   - *Rule:* If the statement describes measurable technical capability with restrained adjectives (*"exceptional"*, *"advanced"*), label as `professional`. If it uses ungrounded superlatives (*"unrivaled"*, *"the greatest ever"*), label as `promotional`.
2. **Boundary: `promotional` vs. `urgent`**
   - *Example:* *"Don't miss the biggest, most unbelievable sale of the decade!"*
   - *Rule:* **Urgency takes precedence over promotion** if there is a direct call to immediate temporal action (*"don't miss"*, *"today only"*). High-pressure sales tactics are compliance risks.
3. **Boundary: `casual` vs. `professional` in modern B2B SaaS**
   - *Example:* *"We built this tool to make your workday a little easier and a lot more fun."*
   - *Rule:* If grammatical syntax is formal and polite without slang or colloquial contractions (*"gonna"*, *"y'all"*), label as `professional`. If it uses informal sentence fragments and colloquialisms, label as `casual`.
4. **Boundary: `aggressive_inappropriate` vs. competitive positioning**
   - *Example:* *"Unlike Legacy Tool X, our platform reduces processing latency by 40%."*
   - *Rule:* Direct, factual comparisons with cited metrics are `professional`. Subjective insults (*"Legacy Tool X is antiquated trash"*) are `aggressive_inappropriate`.

---

## 4. Input & Output Contracts for Backend Integration

### 4.1 Input Specification
The prediction module accepts a single string:
- **Type:** `str`
- **Length Constraint:** Minimum 3 characters; maximum 5,000 characters (~1,000 words).
- **Encoding:** UTF-8 text.

### 4.2 Output Specification
```python
{
    "predicted_label": str,          # One of: "professional", "promotional", "casual", "urgent", "aggressive_inappropriate"
    "confidence": float,              # Calibrated probability score [0.00, 1.00]
    "probabilities": {                # Full class distribution (must sum to ~1.00)
        "professional": float,
        "promotional": float,
        "casual": float,
        "urgent": float,
        "aggressive_inappropriate": float
    },
    "informative_features": list[str], # Top 3-5 n-grams driving the classification
    "model_version": str,             # e.g., "brand-tone-v1.0.0-classical"
    "is_uncertain": bool              # True if top confidence < 0.50 or margin between top 2 classes < 0.10
}
```

---

## 5. Dataset Requirements & Class Balance

1. **Minimum Volume for MVP:**
   - 100 to 250 high-quality, verified examples per class (500 to 1,250 total rows).
2. **Class Balancing Strategy:**
   - Real-world marketing copy is heavily skewed towards `professional` and `promotional`.
   - Training will utilize class-weighted loss functions (`class_weight='balanced'`) in scikit-learn estimators to prevent the model from collapsing to the majority class.
3. **Data Splitting Strategy:**
   - 70% Train, 15% Validation (for hyperparameter tuning and model selection), 15% Test (held-out until final evaluation).
   - Stratified sampling (`StratifiedShuffleSplit`) to guarantee equal class proportions across all three splits.

---

## 6. Candidate Algorithms & Selection Criteria

| Algorithm | Vectorizer | Hyperparameters to Tune | Why Consider | Risk / Trade-off |
| :--- | :--- | :--- | :--- | :--- |
| **Multinomial Naive Bayes (Baseline)** | Count / TF-IDF | `alpha` (Laplace smoothing: 0.1, 0.5, 1.0) | Extremely fast; strong baseline on small text corpora. | Assumes feature independence; uncalibrated probability output. |
| **Logistic Regression (Champion)** | Sublinear TF-IDF (1-2 ngrams) | `C` (regularization: 0.1, 1.0, 10.0), `penalty='l2'` | Naturally outputs well-calibrated probabilities via softmax; linear coefficients provide direct feature explainability. | May struggle with highly non-linear linguistic nuances. |
| **Linear SVM (LinearSVC)** | Sublinear TF-IDF (1-3 ngrams) | `C` (0.1, 1.0, 5.0), `loss='squared_hinge'` | Maximum margin separator; historically best-in-class for high-dimensional sparse text. | Does not natively output probabilities; requires CalibratedClassifierCV. |

---

## 7. Evaluation Methodology & Metrics

1. **Primary Evaluation Metric:** **Macro-averaged F1-Score**.
   - Ensures that minority classes (`aggressive_inappropriate` and `urgent`) are weighted equally with frequent classes (`professional` and `promotional`).
2. **Per-Class Metrics:**
   - Precision, Recall, and F1 reported individually for each of the 5 classes.
   - Zero-tolerance rule: `aggressive_inappropriate` must achieve $\text{Recall} \ge 0.90$ to avoid false-negative brand-safety hazards.
3. **Confusion Matrix:**
   - Visualized and exported to inspect frequent confusions (specifically between `promotional` and `urgent`).
4. **Latency Benchmark:**
   - Single-sample inference latency must be $< 20\text{ ms}$ on standard laptop CPU.

---

## 8. Data Leakage Prevention & Hygiene

1. **Exact Deduplication:** SHA-256 sentence hashing on preprocessed text before splitting to ensure identical slogans do not appear across both train and test partitions.
2. **Strict Vectorizer Fitting:** The `TfidfVectorizer` must be fitted **exclusively on the training split**. Transforming the validation and test sets must strictly use `.transform()`, never `.fit_transform()`.
3. **Held-Out Test Set:** The test set must be sealed during hyperparameter exploration and unsealed only for final scoring.

---

## 9. Limitations & Human Review Considerations

1. **Context Window Limitations:** The model evaluates isolated text snippets and may miss long-range conversational irony or visual context (e.g., an ironic headline paired with an incongruous graphic).
2. **Short Text Ambiguity:** Single-word slogans (*"Accelerate."*) lack sufficient n-gram density for confident classification; the `is_uncertain: true` flag will signal to the backend that human editorial judgement is required.
3. **Advisory Role:** The tone classifier output is advisory. It highlights suspected tone drift and provides top-feature rationales to the reviewer—it does **not** unilaterally delete or reject copy.
