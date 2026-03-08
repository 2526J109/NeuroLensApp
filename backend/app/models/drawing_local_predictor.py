

import os
import logging
from typing import Any, Dict, List, Optional

import numpy as np
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


def _risk_level(risk_pct: float) -> str:
    if risk_pct >= 70:
        return "High"
    if risk_pct >= 40:
        return "Moderate"
    return "Low"


def predict_drawing_risk(features: Dict[str, float]) -> Dict[str, Any]:
    bundle = _load_bundle()

    # ── Trained sklearn model ─────────────────────────────────────────────
    if bundle is not None:
        try:
            model   = bundle["model"]
            scaler  = bundle["scaler"]

           
            scaler_cols: List[str] = list(
                getattr(scaler, "feature_names_in_", bundle.get("features", RFE_FEATURE_NAMES))
            )
            row = pd.DataFrame(
                [[features.get(f, 0.0) for f in scaler_cols]],
                columns=scaler_cols,
            )
            row_scaled = scaler.transform(row)
            prob       = float(model.predict_proba(row_scaled)[:, 1][0])
            risk_pct   = round(prob * 100, 2)
            conf_pct   = round(max(prob, 1.0 - prob) * 100, 2)
            return {
                "risk_percentage": risk_pct,
                "risk_level":      _risk_level(risk_pct),
                "label":           "Parkinson's Detected" if prob >= 0.5 else "Normal",
                "confidence":      conf_pct,
                "source":          "local_model",
            }
        except Exception as exc:
            logger.warning(
                "[DrawingLocalPredictor] Inference error: %s — using heuristic.", exc
            )

    w = {
        "spiral_vel_cv":         3.6,
        "spiral_jerk_cv":        2.6,
        "wavy_vel_cv":           2.0,
        "wavy_wave_rmse":        1.1,
        "wavy_radius_resid_std": 0.8,
        "wavy_jerk_cv":          0.6,
    }
    total_w = sum(w.values())  # 10.7

    def _sigmoid(v: float, scale: float = 1.0) -> float:
        return float(1.0 / (1.0 + np.exp(-v * scale)))

    score = sum(
        w[f] * _sigmoid(features.get(f, 0.0))
        for f in RFE_FEATURE_NAMES
    ) / total_w  

    risk_pct = round(score * 100, 2)
    conf_pct = round(max(score, 1.0 - score) * 100, 2)
    return {
        "risk_percentage": risk_pct,
        "risk_level":      _risk_level(risk_pct),
        "label":           "Parkinson's Detected" if risk_pct >= 50.0 else "Normal",
        "confidence":      conf_pct,
        "source":          "rule_based_fallback",
    }
