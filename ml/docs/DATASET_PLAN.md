# BrandProof — Dataset Strategy & Data Engineering Plan

**Module:** `ml` (Data Engineering)  
**Role Owner:** Person 3 (Machine Learning Engineer)  
**Document Version:** 1.0.0-PHASE-1  
**Status:** Phase 1 Dataset Research & Assembly Plan

---

## 1. The Core Data Challenge: Why Off-the-Shelf Data is Insufficient

A common pitfall in NLP projects is assuming that public sentiment analysis or toxicity datasets directly solve brand tone classification:
- **Sentiment $\neq$ Brand Tone:** A product review stating *"This drone is absolutely fantastic and I love it!"* is **Positive Sentiment**, but in B2B corporate marketing copy, it is categorized as **Casual / Informal**. Conversely, an objective engineering specification stating *"The battery capacity decreases by 15% below -5°C"* has **Negative/Neutral Sentiment**, but is the gold standard for **Professional Tone**.
- **Toxicity $\neq$ Inappropriate Marketing:** Public toxicity benchmarks (like Jigsaw) focus on hate speech, obscenity, and cyberbullying. While BrandProof must flag these, enterprise marketing copy also suffers from brand-inappropriate language that is not toxic—such as disparaging competitors (*"Vendor X is a scam"*), reckless guarantees (*"Guaranteed 100% returns with zero risk"*), or inappropriate sexual innuendo.

Therefore, BrandProof must execute a **two-tier data strategy**:
1. Investigate and filter specific candidate subsets from reputable open-source public corpora.
2. Build a curated, high-quality, domain-specific seed dataset (`brand_tone_seed.csv`) with explicit provenance and synthetic flags.

---

## 2. Public Dataset Investigation & License Verification Status

We investigated candidate public datasets for their licensing, labeling relevance, and potential utility. The table below represents an honest, unvarnished status report:

| Dataset | Official Source / URL | Stated License & Status | Original Label Space | Relevance to Brand Tone | Required Adaptation / Relabeling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Consumer Financial Complaints (CFPB)** | [consumerfinance.gov Data](https://www.consumerfinance.gov/data-research/consumer-complaints/) | **Verified Public Domain** (U.S. Government work). Open for commercial and competition use. | Product categories, company response, issue type, narrative text. | **High for `urgent` & `professional`:** Consumer disputes contain realistic urgency; company responses provide formal corporate vocabulary. | **Significant Relabeling Required:** Narratives must be extracted and manually/heuristically filtered for urgent requests vs formal responses. |
| **Amazon Polarity / Product Reviews** | [HuggingFace / SNAP Archive](https://huggingface.co/datasets/fancyzhx/amazon_polarity) | **Verified Research Use** (Academic open use). | Binary Positive / Negative (1 to 5 stars). | **Moderate for `promotional`:** 5-star product headlines often use high-hype marketing language. | **High Relabeling Required:** Positive reviews must be filtered to keep only text exhibiting promotional hype rather than standard customer satisfaction. |
| **Enron Email Corpus** | [CMU Enron Project](https://www.cs.cmu.edu/~enron/) | **Verified Public Record** (Exposed via FERC legal disclosure; widely used in NLP research). | Unlabeled raw internal corporate email threads. | **High for `professional` vs `casual`:** Internal workplace emails exhibit clear distinctions between formal memos and casual peer notes. | **Full Manual Labeling Required:** Raw emails must be cleaned, de-identified, chunked into sentences, and hand-annotated. |
| **Jigsaw Toxic Comment Dataset** | [Kaggle / Conversation AI](https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge) | **Verified CC0 (Public Domain)**. Open for research and development. | `toxic`, `severe_toxic`, `obscene`, `threat`, `insult`, `identity_hate`. | **High for `aggressive_inappropriate`:** Provides robust negative training examples for aggressive language. | **Direct Filter:** Extract subset of mild-to-moderate insults and threats to populate the `aggressive_inappropriate` class. |
| **CrowdFlower Brand Emotion** | [data.world / CrowdFlower](https://data.world/crowdflower/brand-emotion) | **Unverified License** (Data.world community mirror; original terms require confirmation). | Positive, Negative, No emotion towards brand. | **Low:** Focuses on customer perception of brands (Google, Apple), not on the tone of brand-authored copy. | **DO NOT USE in MVP** until licensing and utility are verified. |

---

## 3. Plan for Domain-Specific Seed Dataset (`brand_tone_seed.csv`)

To ensure that the model reliably reflects marketing and brand compliance reality, Person 3 will construct a balanced, curated seed dataset of 500 examples (100 per class) in Phase 2.

### 3.1 Dataset Schema (`ml/data/brand_tone_seed.csv`)
The CSV will strictly adhere to the following schema:
- `id` (string): Unique identifier (e.g., `SEED-0001`).
- `text` (string): The input text snippet (15 to 350 characters).
- `label` (string): One of `professional`, `promotional`, `casual`, `urgent`, `aggressive_inappropriate`.
- `source_origin` (string): Source document or corpus origin (e.g., `real_b2b_copy`, `public_jigsaw_extract`, `synthetic_curated`).
- `is_synthetic` (boolean): `True` if authored/generated for demonstration and boundary testing; `False` if drawn from verified real-world public copy.
- `annotator` (string): Team member identifier (`Person_3`).
- `review_notes` (string): Optional notes explaining borderline label decisions.

### 3.2 Target Class Distribution for MVP Baseline

| Class | Target Count (Seed) | Source Strategy |
| :--- | :---: | :--- |
| `professional` | 100 rows | Curated corporate press releases, technical product specs, B2B announcements. |
| `promotional` | 100 rows | Marketing landing page copy, crowdfunding campaigns, promotional sales copy. |
| `casual` | 100 rows | Social media tweets, community forum snippets, informal marketing conversational copy. |
| `urgent` | 100 rows | Flash sale announcements, expiry notices, deadline-driven campaign copy. |
| `aggressive_inappropriate` | 100 rows | Filtered non-hate speech aggression, combative competitor attacks, inappropriate claims. |
| **Total** | **500 rows** | **100% manually reviewed, balanced baseline.** |

---

## 4. Synthetic vs. Real-World Data Integrity Rules

In compliance with hackathon integrity guidelines:
1. **Explicit Tagging:** Every synthetic example will have `is_synthetic: true` in the dataset CSV.
2. **Never Falsify Origins:** Synthetic demonstration examples will never be described in presentations or documentation as "mined from 50 Fortune 500 enterprise marketing decks."
3. **Boundary Testing Role:** Synthetic examples will be utilized specifically to test difficult linguistic boundaries identified in `ML_SPECIFICATION.md` (Section 3.2).
4. **Isolated Benchmark:** The final test set will maintain a dedicated subset of 100% verified non-synthetic examples to measure genuine real-world generalization.

---

## 5. Next Steps for Phase 2 (Data Collection & Labeling)
1. Initialize the CSV structure in `ml/data/brand_tone_seed.csv`.
2. Populate the verified 500-example seed dataset following the labeling guidelines.
3. Write a dataset validation script `ml/scripts/validate_dataset.py` to assert:
   - Zero missing or null values.
   - Exact 5-label taxonomy conformance.
   - Zero exact duplicate texts across rows.
   - Class balance within acceptable variance ($\pm 5\%$).
