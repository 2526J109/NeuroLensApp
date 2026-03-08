

import os
import logging
from typing import Any, Dict, List, Optional

import pandas as pd

from app.utils.kinematic_features import RFE_FEATURE_NAMES

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "drawing_lr_model.joblib")

# Lazy-loaded bundle (model + scaler loaded once, then cached)
_bundle: Optional[Dict[str, Any]] = None
_bundle_loaded: bool = False


def _load_bundle() -> Optional[Dict[str, Any]]:
    global _bundle, _bundle_loaded
    if _bundle_loaded:
        return _bundle
    _bundle_loaded = True
    if not os.path.exists(_MODEL_PATH):
        logger.info(
            "[DrawingLocalPredictor] drawing_lr_model.joblib not found at %s — "
            "rule-based fallback active.  See module docstring to activate model.",
            _MODEL_PATH,
        )
        return None
    try:
        import joblib
        _bundle = joblib.load(_MODEL_PATH)
        logger.info(
            "[DrawingLocalPredictor] Model loaded. Features: %s",
            _bundle.get("features", RFE_FEATURE_NAMES),
        )
    except Exception as exc:
        logger.warning("[DrawingLocalPredictor] Failed to load model: %s", exc)
        _bundle = None
    return _bundle


# The LR model's raw probability is bounded to ~37–63% by its small coefficients
# (trained on 58 subjects). Rescale to 0–100 so Low/Moderate/High are all reachable.
_MODEL_PROB_MIN = 0.3689
_MODEL_PROB_MAX = 0.6291


def _rescale_prob(prob: float) -> float:
    """Map raw model P(PD) from [MODEL_MIN, MODEL_MAX] → [0, 100]."""
    rescaled = (prob - _MODEL_PROB_MIN) / (_MODEL_PROB_MAX - _MODEL_PROB_MIN) * 100.0
    return max(0.0, min(100.0, rescaled))


def _risk_level(risk_pct: float) -> str:
    if risk_pct >= 70:
        return "High"
    if risk_pct >= 40:
        return "Moderate"
    return "Low"


def predict_drawing_risk(features: Dict[str, float]) -> Dict[str, Any]:
    bundle = _load_bundle()

    logger.info("[DrawingLocalPredictor] Raw features received: %s", features)

    if bundle is None:
        raise RuntimeError(
            "drawing_lr_model.joblib not found or failed to load. "
            "Ensure the model file exists at: " + _MODEL_PATH
        )

    model  = bundle["model"]
    scaler = bundle["scaler"]

    scaler_cols: List[str] = list(
        getattr(scaler, "feature_names_in_", bundle.get("features", RFE_FEATURE_NAMES))
    )
    # Use scaler training means as defaults for any missing feature (e.g. age when
    # Firestore fetch fails).  Defaulting to 0 is dangerous because 0 can be 13+
    # standard deviations from the training mean (e.g. age mean=68, std=5), which
    # drives the model far outside its training distribution.
    scaler_means = dict(zip(scaler.feature_names_in_, scaler.mean_))

    # wavy_radius_resid_std is purely a canvas-size geometry constant: training
    # std across 58 subjects was only 13.3 px (3.2% CV) — essentially no clinical
    # signal. Its value depends entirely on the drawing canvas physical dimensions
    # which we cannot match exactly without knowing the training app's canvas size.
    # Force it to the training mean so its z-score = 0 (neutral contribution).
    CANVAS_GEOMETRY_FEATURES = {"wavy_radius_resid_std"}
    for feat in CANVAS_GEOMETRY_FEATURES:
        if feat in features:
            features[feat] = scaler_means.get(feat, features[feat])

    row = pd.DataFrame(
        [[features.get(f, scaler_means.get(f, 0.0)) for f in scaler_cols]],
        columns=scaler_cols,
    )
    row_scaled = scaler.transform(row)
    prob = float(model.predict_proba(row_scaled)[:, 1][0])
    logger.info(
        "[DrawingLocalPredictor] Scaled row: %s  →  P(Parkinson)=%.4f",
        row_scaled.tolist(), prob
    )

    risk_pct = round(_rescale_prob(prob), 2)
    conf_pct = round(max(prob, 1.0 - prob) * 100, 2)
    return {
        "risk_percentage": risk_pct,
        "risk_level":      _risk_level(risk_pct),
        "label":           "Parkinson's Detected" if risk_pct >= 50 else "Normal",
        "confidence":      conf_pct,
        "source":          "local_model",
    }
