# BrandProof — Backend ML Integration Contract

**Document Version:** 1.0.0-PROPOSAL  
**Author:** Person 3 (Machine Learning Engineer)  
**Consumer:** Person 2 (Backend / Application Developer)  
**Status:** Ready for Team Review & Final Agreement  

---

## 1. Overview & Objective

This document defines the exact software contract between the **Machine Learning Module** (`ml`) and the **Backend Application Service** (`backend/app/services`).

Person 2 should be able to import a single Python function:
```python
from ml.predictor import predict_tone
```
and obtain a structured, type-safe dictionary containing the predicted brand tone, calibrated confidence, class distribution, and top explanatory n-gram features.

---

## 2. Python Function Signature

```python
def predict_tone(text: str) -> dict:
    """
    Evaluates marketing copy and predicts its dominant communicative tone.
    
    Args:
        text (str): Input text snippet (1 to ~1,000 words).
        
    Returns:
        dict: Structured dictionary adhering strictly to TonePredictionResult schema.
        
    Raises:
        ValueError: If input is not a string or exceeds 10,000 characters.
        ModelNotLoadedError: If serialized model artifacts are missing.
    """
```

---

## 3. Schema Definitions

### 3.1 Pydantic Model for Person 2's FastAPI Schemas
Person 2 can directly incorporate this Pydantic v2 schema into `backend/app/schemas/`:

```python
from typing import Dict, List
from pydantic import BaseModel, Field

class TonePredictionResult(BaseModel):
    predicted_label: str = Field(
        ..., 
        description="Dominant tone category: 'professional', 'promotional', 'casual', 'urgent', 'aggressive_inappropriate'"
    )
    confidence: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Calibrated probability score of the predicted class."
    )
    probabilities: Dict[str, float] = Field(
        ..., 
        description="Normalized probability distribution across all 5 tone classes."
    )
    informative_features: List[str] = Field(
        default_factory=list, 
        description="Top n-gram words/phrases that contributed most strongly to the prediction."
    )
    model_version: str = Field(
        ..., 
        description="Semantic version string of the loaded model artifact (e.g., 'brand-tone-v1.0.0-logistic')."
    )
    is_uncertain: bool = Field(
        default=False, 
        description="Flag indicating that confidence is below threshold (<0.50) or margin between top classes is narrow."
    )
```

### 3.2 Concrete Output Example
```json
{
  "predicted_label": "promotional",
  "confidence": 0.884,
  "probabilities": {
    "professional": 0.042,
    "promotional": 0.884,
    "casual": 0.051,
    "urgent": 0.018,
    "aggressive_inappropriate": 0.005
  },
  "informative_features": [
    "revolutionary",
    "blow your mind",
    "unprecedented breakthrough"
  ],
  "model_version": "brand-tone-v1.0.0-logistic",
  "is_uncertain": false
}
```

---

## 4. Edge Cases & Exception Handling

| Edge Case | Expected System Behavior | Output / Exception |
| :--- | :--- | :--- |
| **Empty String or Whitespace (`""`, `"   "`)** | Sanitized before inference; flags uncertainty immediately without running model. | Returns `predicted_label: "professional"`, `confidence: 0.0`, `is_uncertain: true`, `informative_features: []`. |
| **Very Short Text (1–2 words, e.g., *"Accelerate."*)** | Model processes n-grams; if confidence is low, sets `is_uncertain: true`. | Valid prediction returned with `is_uncertain: true` flag. |
| **Very Long Document (>10,000 chars)** | `ValueError` raised to prevent memory spikes. | Person 2 should chunk documents into paragraphs before passing to `predict_tone`. |
| **Missing Model File (`models/*.joblib`)** | Safe fallback mode. | Raises `ModelNotLoadedError` with clear error message directing user to run training script. |

---

## 5. Performance & Operational Guarantees

1. **Local Latency:** Under 15 milliseconds on a single CPU thread.
2. **Thread Safety:** The fitted vectorizer and model weights are loaded read-only into memory at application startup, making `predict_tone` fully thread-safe for concurrent FastAPI async workers.
3. **Zero Network Calls:** No external HTTP, socket, or cloud API calls are made during inference.

---

## 6. Agreement Checklist for Person 2
- [ ] Confirm acceptance of the 5 tone class names: `professional`, `promotional`, `casual`, `urgent`, `aggressive_inappropriate`.
- [ ] Confirm preference for returning full probability distributions (`probabilities`) alongside the top label.
- [ ] Confirm that Person 2 will handle document paragraph chunking before calling `predict_tone`.
