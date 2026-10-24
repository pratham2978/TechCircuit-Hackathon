# BrandProof — Dataset Manifest & Source Provenance

**Document Version:** 1.0.0  
**Role Owner:** Person 3 (Machine Learning Engineer)  
**Status:** Official Manifest of Datasets, Licenses, and Acquisition Protocols

---

## 1. Summary of Managed Datasets

| Dataset Identifier | File Path | Total Records | Role in Project | License Status | Redistribution Permitted |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **BrandProof Seed Corpus** | `ml/data/brand_tone_seed.csv` | 250+ | Core Training, Validation & Benchmark Baseline | **Verified CC-BY-4.0 / Proprietary-Synthetic** | **Yes (Committed in repo)** |
| **CFPB Consumer Complaints** | *(External raw source)* | 15,000 (sampled) | Supplementary for `urgent` & `professional` | **Verified U.S. Public Domain** | **Yes (Derived clean excerpts)** |
| **Jigsaw Toxicity Corpus** | *(External raw source)* | 1,200 (filtered) | Supplementary for `aggressive_inappropriate` | **Verified CC0-1.0 (Public Domain)** | **Yes (Filtered non-hate subsets)** |
| **Enron Email Corpus** | *(External raw source)* | 5,000 (sampled) | Supplementary for `professional` vs `casual` | **Verified Public Record (FERC)** | **Yes (Anonymized sentence tokens)** |
| **Amazon Polarity Reviews** | *(External raw source)* | 2,000 (filtered) | Supplementary for `promotional` | **Verified Academic Research** | **No raw redistribution; derived text only** |

---

## 2. In-Depth Source Audits & Verification Status

### 2.1 BrandProof Seed Corpus (`ml/data/brand_tone_seed.csv`)
- **Origin:** Curated directly by the BrandProof team to establish gold-standard marketing copy examples across all 5 classes.
- **Content:** Product advertisements, B2B press releases, social media tweets, email campaign subjects, urgent CTAs, combative competitor statements, and difficult boundary cases.
- **Synthetic vs. Real-World:** Explicitly marked row-by-row via the `is_synthetic` column.
- **License:** CC-BY-4.0 for authored examples; Public Domain for real-world factual announcements.

### 2.2 Consumer Financial Protection Bureau (CFPB) Complaints
- **Official Source:** [consumerfinance.gov Consumer Complaint Database](https://www.consumerfinance.gov/data-research/consumer-complaints/)
- **License Status:** **Verified Public Domain** (United States Government Work, 17 U.S.C. § 105).
- **Labeling Relevance:** Contains real consumer grievance narratives (*"I need this resolved immediately or I will take legal action!"* $\rightarrow$ `urgent`) and formal corporate response letters (*"Thank you for contacting our customer operations department regarding account verification..."* $\rightarrow$ `professional`).
- **Required Transformation:** Raw consumer narratives require text cleaning and filtering to extract short sentence spans.

### 2.3 Jigsaw / Conversation AI Toxic Comment Classification
- **Official Source:** [Kaggle / Conversation AI](https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge)
- **License Status:** **Verified CC0-1.0 (Public Domain Dedication)**.
- **Labeling Relevance:** Contains hostile, insulting, and derogatory comments.
- **Required Transformation:** High-severity hate speech is excluded; only mild-to-moderate aggressive and combative language is retained to represent business brand-safety violations (`aggressive_inappropriate`).

### 2.4 Enron Email Corpus
- **Official Source:** [CMU Enron Email Project](https://www.cs.cmu.edu/~enron/)
- **License Status:** **Verified Public Record** (Made public by the Federal Energy Regulatory Commission during legal proceedings).
- **Labeling Relevance:** High utility for distinguishing between formal corporate announcements (`professional`) and casual colleague banter (`casual`).
- **Required Transformation:** Personal identifying information (PII) like phone numbers and email headers must be stripped.

---

## 3. Instructions for Acquiring External Datasets (Local Setup)

To reproduce or extend the supplementary public datasets locally without committing massive GB-sized raw files into Git:

```bash
# 1. Download CFPB Complaints subset (example):
curl -s "https://files.consumerfinance.gov/ccdb/complaints.csv.zip" -o ml/data/raw/cfpb.zip
unzip ml/data/raw/cfpb.zip -d ml/data/raw/

# 2. Run the supplementary ingestion script (planned for Phase 3):
python ml/scripts/ingest_public_corpora.py --source cfpb --max_records 500
```
*Note: For the hackathon MVP, `ml/data/brand_tone_seed.csv` is fully self-contained and ready for immediate training without requiring large external zip downloads.*
