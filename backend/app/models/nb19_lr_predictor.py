"""
NB19 Scale-Normalised LR predictor.

Model: LogisticRegression(C=10, penalty='l2', solver='liblinear')
Features: 14 scale-normalised CV features (7 per task, NB05-style)
  per task: curv_std, radius_resid_std, direction_change_rate,
            wave_rmse, vel_cv, pause_ratio, jerk_cv
Augmentation: Time Warp (5 copies) applied during training only.
Feature selection: RFECV fitted inside each LOOCV fold.

Expected model file (same directory as this file):
  nb19_lr_model.pkl   — dict with keys: model, scaler, mask, feature_names

Note: NB19 hasn't been run on Colab yet — predictor scaffolded for when
model file becomes available.
"""

import logging
import os
import pickle
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

_DIR        = os.path.dirname(__file__)
_MODEL_PATH = os.path.join(_DIR, "nb19_lr_model.pkl")

_bundle:        Optional[Dict[str, Any]] = None
_bundle_loaded: bool = False

_MODEL_PROB_MIN = 0.30
_MODEL_PROB_MAX = 0.70


def _load() -> Optional[Dict[str, Any]]:
    global _bundle, _bundle_loaded
    if _bundle_loaded:
        return _bundle
    _bundle_loaded = True

    if not os.path.exists(_MODEL_PATH):
        logger.warning(
            "[NB19_LR] nb19_lr_model.pkl not found — predictor inactive. "
            "Run NB19 on Colab and copy nb19_lr_model.pkl into: %s",
            _DIR,
        )
        return None

    try:
        with open(_MODEL_PATH, "rb") as fh:
            _bundle = pickle.load(fh)
        mask = _bundle.get("mask")
        names = _bundle.get("feature_names", [])
        selected = [n for n, m in zip(names, mask) if m] if mask is not None else names
        logger.info("[NB19_LR] Model loaded. Selected features (%d): %s", len(selected), selected)
    except Exception as exc:
        logger.error("[NB19_LR] Failed to load model: %s", exc)
        _bundle = None

    return _bundle


def _risk_level(risk_pct: float) -> str:
    if risk_pct >= 70:
        return "High"
    if risk_pct >= 40:
        return "Moderate"
    return "Low"


def _rescale_prob(prob: float) -> float:
    rescaled = (prob - _MODEL_PROB_MIN) / (_MODEL_PROB_MAX - _MODEL_PROB_MIN) * 98.0 + 1.0
    return round(max(1.0, min(99.0, rescaled)), 2)


def predict_nb19_lr_risk(
    features: Dict[str, float],
) -> Dict[str, Any]:
    """
    Run NB19 scale-normalised LR inference.

    Parameters
    ----------
    features : dict produced by scale_norm_features.extract_scale_norm_flat()
        Keys: FEATURE_NAMES (14 entries).

    Returns
    -------
    dict: risk_percentage, risk_level, label, confidence, selected_features, source
    """
    bundle = _load()
    if bundle is None:
        raise RuntimeError(
            "NB19 LR model unavailable — nb19_lr_model.pkl missing. "
            "Run NB19.ipynb on Google Colab and copy the saved file into: " + _DIR
        )

    import pandas as pd

    model  = bundle["model"]
    scaler = bundle["scaler"]
    mask   = bundle.get("mask")
    names  = bundle.get("feature_names", list(features.keys()))

    scaler_cols: List[str] = list(
        getattr(scaler, "feature_names_in_", names)
    )
    scaler_means = dict(zip(scaler_cols, scaler.mean_))

    row = pd.DataFrame(
        [[features.get(f, scaler_means.get(f, 0.0)) for f in scaler_cols]],
        columns=scaler_cols,
    )
    row_scaled = scaler.transform(row)

    if mask is not None:
        row_scaled = row_scaled[:, mask]

    prob = float(model.predict_proba(row_scaled)[:, 1][0])

    logger.info("[NB19_LR] P(PD)=%.4f  features=%s", prob, features)

    risk_pct = _rescale_prob(prob)
    conf_pct = round(max(prob, 1.0 - prob) * 100, 2)

    selected = [n for n, m in zip(scaler_cols, mask)] if mask is not None else scaler_cols

    return {
        "risk_percentage":   risk_pct,
        "risk_level":        _risk_level(risk_pct),
        "label":             "Parkinson's Detected" if risk_pct >= 50 else "Normal",
        "confidence":        conf_pct,
        "selected_features": selected,
        "source":            "scale_norm_lr_nb19",
    }
