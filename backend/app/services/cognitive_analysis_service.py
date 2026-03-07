import os
import logging
import numpy as np
import pandas as pd
import joblib
from typing import Optional

logger = logging.getLogger(__name__)

# ── Path to your pkl file ──────────────────────────────────────────────────────
MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "models", "neurolens_cognitive_pipeline.pkl"
)

# ── Loaded once at startup ─────────────────────────────────────────────────────
_bundle = None

# ── Human-readable feature names for the frontend ─────────────────────────────
FEATURE_DISPLAY_NAMES = {
    "fampd":               "Family History",
    "rem":                 "Sleep Patterns",
    "tmt_age_adjusted":    "Age-Adjusted Attention",
    "age_at_visit":        "Age Factor",
    "SDMTOTAL":            "Processing Speed",
    "cognitive_dispersion":"Cognitive Balance",
    "TMT_A":               "Attention Speed",
    "SEX":                 "Biological Sex",
    "DVS_LNS":             "Working Memory",
}


def load_cognitive_model():
    """Call this once in main.py at startup."""
    global _bundle
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Cognitive model not found at: {MODEL_PATH}\n"
            "Download neurolens_cognitive_pipeline.pkl from Colab "
            "and place it in backend/app/ml_models/"
        )
    _bundle = joblib.load(MODEL_PATH)
    logger.info(
        f"Cognitive model loaded — "
        f"type={_bundle['model_type']}  "
        f"auc={_bundle['holdout_auc']}  "
        f"threshold={_bundle['optimal_threshold']}"
    )


def _engineer_features(X: pd.DataFrame, ref_stats: dict) -> pd.DataFrame:
    """
    Replicates the notebook's engineer_features() exactly.
    Always uses saved training ref_stats — never recomputed from input.
    """
    X = X.copy()
    X["tmt_age_adjusted"] = -1.0 * X["TMT_A"] / (X["age_at_visit"] / 60.0)

    sdmt_z = (X["SDMTOTAL"] - ref_stats["sdmt_median"]) / (ref_stats["sdmt_std"] + 1e-9)
    lns_z  = (X["DVS_LNS"]  - ref_stats["lns_median"])  / (ref_stats["lns_std"]  + 1e-9)
    tmta_z = -1.0 * (X["TMT_A"] - ref_stats["tmta_median"]) / (ref_stats["tmta_std"] + 1e-9)
    X["cognitive_dispersion"] = pd.concat([sdmt_z, lns_z, tmta_z], axis=1).std(axis=1)

    return X


def _compute_percentile(prob: float, percentiles: dict) -> int:
    """
    Returns where this probability sits in the holdout distribution (0-100).
    Lower = lower risk relative to the training population.
    """
    if prob <= percentiles["p10"]: return 10
    if prob <= percentiles["p25"]: return 25
    if prob <= percentiles["p50"]: return 50
    if prob <= percentiles["p75"]: return 75
    if prob <= percentiles["p90"]: return 90
    return 99


def _compute_shap(raw_imp: pd.DataFrame) -> list:
    """
    Runs SHAP on the uncalibrated XGBoost model saved in the bundle.
    Returns top 3 features by absolute SHAP value, with human-readable names.
    Falls back gracefully if shap is not installed.
    """
    try:
        import shap

        shap_model = _bundle.get("shap_model")
        if shap_model is None:
            logger.warning("shap_model not found in bundle — skipping SHAP")
            return []

        explainer   = shap.TreeExplainer(shap_model)
        shap_values = explainer.shap_values(raw_imp.astype(np.float32))

        # shap_values shape: (1, n_features) — one row
        shap_row = shap_values[0]

        # Sort by absolute value descending, take top 3
        feature_names = raw_imp.columns.tolist()
        ranked = sorted(
            zip(feature_names, shap_row),
            key=lambda x: abs(x[1]),
            reverse=True
        )[:3]

        factors = []
        for feat, val in ranked:
            factors.append({
                "feature":    FEATURE_DISPLAY_NAMES.get(feat, feat),
                "direction":  "atypical" if val > 0 else "typical",
                "shap_value": round(float(val), 4),
            })
        return factors

    except ImportError:
        logger.warning("shap not installed — add 'shap' to requirements.txt")
        return []
    except Exception as e:
        logger.warning(f"SHAP computation failed: {e}")
        return []


def predict(
    sdmtotal:     float,
    age_at_visit: float,
    SEX:          int,
    fampd:        int,
    rem:          int,
    tmt_a:        Optional[float] = None,
    dvs_lns:      Optional[float] = None,
) -> dict:
    """
    Run cognitive risk inference.

    Args:
        sdmtotal     — total correct in SDMT task (from app)
        age_at_visit — user age from profile
        SEX          — 1=Male, 0=Female
        fampd        — 0=No, 1=Yes, 2=Unknown
        rem          — 0=No, 1=Yes
        tmt_a        — seconds to complete TMT-A (None = imputed)
        dvs_lns      — not collected in app (None = imputed)

    Returns:
        {
            "risk_probability": 0.3611,
            "percentile_rank": 34,
            "contributing_factors": [...],
            "module": "cognitive"
        }
    """
    if _bundle is None:
        raise RuntimeError("Model not loaded. Call load_cognitive_model() at startup.")

    ref_stats      = _bundle["ref_stats"]
    features_final = _bundle["features_final"]
    percentiles    = _bundle.get("percentiles", {})

    # 1. Build raw input row
    raw = pd.DataFrame([{
        "SDMTOTAL":     float(sdmtotal),
        "DVS_LNS":      float(dvs_lns) if dvs_lns is not None else np.nan,
        "TMT_A":        float(tmt_a)   if tmt_a   is not None else np.nan,
        "age_at_visit": float(age_at_visit),
        "SEX":          int(SEX),
        "fampd":        int(fampd),
        "rem":          int(rem),
    }])

    # 2. Engineer features using training stats
    raw_eng = _engineer_features(raw, ref_stats)
    raw_eng = raw_eng[features_final]

    # 3. Impute missing values
    raw_imp = pd.DataFrame(
        _bundle["imputer"].transform(raw_eng),
        columns=features_final
    )

    # 4. Predict probability
    prob = float(_bundle["model"].predict_proba(
        raw_imp.astype(np.float32)
    )[0][1])

    # 5. Percentile rank
    percentile_rank = _compute_percentile(prob, percentiles) if percentiles else 50

    # 6. SHAP contributing factors
    contributing_factors = _compute_shap(raw_imp)

    return {
        "risk_probability":    round(prob, 4),
        "percentile_rank":     percentile_rank,
        "contributing_factors": contributing_factors,
        "module":              "cognitive",
    }


# ── Auto-load on import — matches voice_analysis_service.py pattern ───────────
try:
    load_cognitive_model()
except Exception as _e:
    logger.warning(f"Cognitive model not loaded at startup: {_e}")