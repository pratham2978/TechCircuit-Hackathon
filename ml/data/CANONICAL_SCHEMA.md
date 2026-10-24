# BrandProof — Canonical Dataset Schema Specification

**Document Version:** 1.0.0  
**Status:** Approved Specification for Phase 2 Data Engineering  
**Role Owner:** Person 3 (Machine Learning Engineer)  
**File Formats Supported:** CSV (UTF-8) and JSONLines (JSONL)

---

## 1. Overview & Objectives

To ensure data integrity, reproducibility, and auditability across all dataset sources (public corpora, domain-specific seed data, and boundary test suites), all tabular dataset files within `ml/data/` must strictly adhere to this canonical schema.

The schema separates textual content from governance metadata, enforces explicit tracking of synthetic vs. genuine data, and mandates provenance attribution.

---

## 2. Canonical Column Definitions

Every dataset file (e.g., `ml/data/brand_tone_seed.csv`, `train.csv`, `val.csv`, `test.csv`) must contain the following required fields in this exact order:

| Field Name | Type | Required | Allowed Values / Format | Description |
| :--- | :---: | :---: | :--- | :--- |
| `example_id` | String | **Yes** | Pattern: `^[A-Z0-9]+-[0-9]{4,}$` (e.g. `SEED-0001`) | Globally unique identifier for the example record. |
| `text` | String | **Yes** | Non-empty UTF-8 string, length between 5 and 5,000 chars. | The raw marketing copy snippet, sentence, or paragraph to be evaluated. |
| `label` | String | **Yes** | Exactly one of the 5 canonical tone labels (see Section 3). | The target ground-truth marketing tone category. |
| `source` | String | **Yes** | e.g., `real_b2b_press_release`, `curated_boundary_test`, `cfpb_complaint_extract` | The provenance or origin document from which the text was extracted or created. |
| `source_license` | String | **Yes** | e.g., `CC0-1.0`, `Public-Domain`, `Academic-Research-Fair-Use`, `Proprietary-Synthetic` | The applicable licensing or copyright status of the underlying text. |
| `is_synthetic` | Boolean | **Yes** | `True` or `False` (case-insensitive in CSV: `true`/`false`) | Explicit marker indicating whether the text was authored synthetically or observed in real-world publications. |
| `content_format` | String | **Yes** | One of: `press_release`, `ad_copy`, `social_post`, `email_subject`, `product_desc`, `cta`, `boundary_test` | The specific marketing medium or channel format represented by the text. |
| `group_id` | String | **No** | String (e.g., `CAMPAIGN-01`, `APEX-DRONE-SPEC`) | Logical grouping identifier. All records sharing the same `group_id` are guaranteed to stay in the same split to prevent data leakage. |
| `notes` | String | **No** | Free text | Annotator notes explaining difficult boundary cases, secondary tones, or relabeling decisions. |

---

## 3. Allowed Tone Labels & Validation Rules

Any record with a `label` not strictly in this set is rejected during data validation:

1. **`professional`**: Objective, fact-focused, clear, authoritative, and restrained corporate/B2B copy.
2. **`promotional`**: Hype-driven, exaggerated, superlative, and emotionally persuasive advertising language.
3. **`casual`**: Highly informal, conversational, slangy, or colloquial copy unsuited for formal corporate communication.
4. **`urgent`**: High-pressure, artificial scarcity, countdown, or FOMO-inducing language demanding immediate action.
5. **`aggressive_inappropriate`**: Combative, insulting, derogatory, sexually suggestive, or offensive copy violating basic brand safety.

---

## 4. Normalization & Text Integrity Rules

1. **Punctuation Preservation:** Exclamation marks (`!`), question marks (`?`), ellipses (`...`), and percentage signs (`%`) **must be preserved** during preprocessing because they carry essential tone signals (e.g., exclamation marks correlate heavily with `promotional` and `urgent`).
2. **Capitalization Preservation:** All-caps words (*"NOW"*, *"HURRY"*, *"GUARANTEED"*) are strong tone indicators and must not be blindly lowercased during initial cleaning. Case-folding is deferred to the vectorizer feature extraction stage.
3. **Encoding:** Files must strictly use UTF-8 encoding with standard LF (`\n`) or CRLF (`\r\n`) line terminators.
4. **Whitespace:** Multi-spaces, non-breaking spaces (`\u00a0`), tabs, and trailing carriage returns must be normalized to single spaces.

---

## 5. Sample Conforming CSV Record

```csv
example_id,text,label,source,source_license,is_synthetic,content_format,group_id,notes
SEED-0001,"The Apex-X4 industrial drone features dual thermal sensors and delivers up to 42 minutes of flight time under standard operating conditions.",professional,real_b2b_press_release,CC0-1.0,false,press_release,APEX-DOCS-01,"Standard corporate product specification announcement."
SEED-0002,"ACT NOW! Only 3 licenses left before the price jumps by 80% at midnight tonight!",urgent,curated_boundary_test,Proprietary-Synthetic,true,cta,URGENT-PROMO-02,"Combines promotional discounts with temporal deadline; urgency takes precedence."
```
