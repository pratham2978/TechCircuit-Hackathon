"""
BrandGuard Local ML Inference Service
Loads fitted scikit-learn model artifact and predicts tone/emotion without external APIs.
"""

import os
import sys
import json
import joblib

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts", "tone_model.joblib")

_model = None

def get_model():
  global _model
  if _model is None:
    if not os.path.exists(MODEL_PATH):
      raise FileNotFoundError(f"Model artifact not found at {MODEL_PATH}. Run 'python ml/train.py' first.")
    _model = joblib.load(MODEL_PATH)
  return _model

def predict_tone(text):
  if not text or not text.strip():
    return {
      "predicted_tone": "Neutral",
      "confidence": 1.0,
      "probabilities": {},
      "model_version": "v1.0-local-sklearn",
      "status": "empty_input"
    }

  try:
    model = get_model()
    pred = model.predict([text])[0]
    classes = model.classes_
    probas = model.predict_proba([text])[0]

    prob_dict = {cls: round(float(p), 4) for cls, p in zip(classes, probas)}
    confidence = round(float(max(probas)), 4)

    return {
      "predicted_tone": str(pred),
      "confidence": confidence,
      "probabilities": prob_dict,
      "model_version": "v1.0-local-sklearn",
      "status": "success"
    }
  except Exception as e:
    return {
      "predicted_tone": "Unknown",
      "confidence": 0.0,
      "error": str(e),
      "model_version": "v1.0-local-sklearn",
      "status": "error"
    }

if __name__ == "__main__":
  if len(sys.argv) > 1:
    input_text = " ".join(sys.argv[1:])
  else:
    input_text = sys.stdin.read()

  result = predict_tone(input_text)
  print(json.dumps(result))
