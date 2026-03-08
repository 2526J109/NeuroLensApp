import os
import logging
import numpy as np
import pandas as pd
import joblib
from sklearn.impute import SimpleImputer
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "models", "neurolens_cognitive_pipeline.pkl"
)

_bundle = None

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
    global _bundle
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Cognitive model not found at: {MODEL_PATH}\n"
            "Download neurolens_cognitive_pipeline.pkl from Colab "
            "and place it in backend/app/models/"
        )
    _bundle = joblib.load(MODEL_PATH)

    # Refit imputer locally to avoid sklearn binary incompatibility
    fresh_imputer = SimpleImputer(strategy='median')
    dummy = pd.DataFrame([{
        'SDMTOTAL':             45.0,
        'DVS_LNS':              12.0,
        'TMT_A':                32.0,
        'age_at_visit':         65.0,
        'SEX':                  1.0,
        'fampd':                0.0,
        'rem':                  0.0,
        'tmt_age_adjusted':     -1.0 * 32.0 / (65.0 / 60.0),
        'cognitive_dispersion': 0.5,
    }])
    fresh_imputer.fit(dummy[_bundle['features_final']])
    _bundle['imputer'] = fresh_imputer

    logger.info(
        f"Cognitive model loaded — "
        f"type={_bundle['model_type']}  "
        f"auc={_bundle['holdout_auc']}  "
        f"threshold={_bundle['optimal_threshold']}"
    )


def _engineer_features(X: pd.DataFrame, ref_stats: dict) -> pd.DataFrame:
    X = X.copy()
    X["tmt_age_adjusted"] = -1.0 * X["TMT_A"] / (X["age_at_visit"] / 60.0)
    sdmt_z = (X["SDMTOTAL"] - ref_stats["sdmt_median"]) / (ref_stats["sdmt_std"] + 1e-9)
    lns_z  = (X["DVS_LNS"]  - ref_stats["lns_median"])  / (ref_stats["lns_std"]  + 1e-9)
    tmta_z = -1.0 * (X["TMT_A"] - ref_stats["tmta_median"]) / (ref_stats["tmta_std"] + 1e-9)
    X["cognitive_dispersion"] = pd.concat([sdmt_z, lns_z, tmta_z], axis=1).std(axis=1)
    return X


def _compute_percentile(prob: float, percentiles: dict) -> int:
    if prob <= percentiles["p10"]: return 10
    if prob <= percentiles["p25"]: return 25
    if prob <= percentiles["p50"]: return 50
    if prob <= percentiles["p75"]: return 75
    if prob <= percentiles["p90"]: return 90
    return 99


def _compute_shap(raw_imp: pd.DataFrame) -> list:
    try:
        import shap
        shap_model = _bundle.get("shap_model")
        if shap_model is None:
            logger.warning("shap_model not found in bundle — skipping SHAP")
            return []
        explainer   = shap.TreeExplainer(shap_model)
        shap_values = explainer.shap_values(raw_imp.astype(np.float32))
        shap_row = shap_values[0]
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
    if _bundle is None:
        raise RuntimeError("Model not loaded. Call load_cognitive_model() at startup.")

    ref_stats      = _bundle["ref_stats"]
    features_final = _bundle["features_final"]
    percentiles    = _bundle.get("percentiles", {})

    raw = pd.DataFrame([{
        "SDMTOTAL":     float(sdmtotal),
        "DVS_LNS":      float(dvs_lns) if dvs_lns is not None else np.nan,
        "TMT_A":        float(tmt_a)   if tmt_a   is not None else np.nan,
        "age_at_visit": float(age_at_visit),
        "SEX":          int(SEX),
        "fampd":        int(fampd),
        "rem":          int(rem),
    }])

    raw_eng = _engineer_features(raw, ref_stats)
    raw_eng = raw_eng[features_final]

    raw_imp = pd.DataFrame(
        _bundle["imputer"].transform(raw_eng),
        columns=features_final
    )

    prob = float(_bundle["model"].predict_proba(
        raw_imp.astype(np.float32)
    )[0][1])

    percentile_rank = _compute_percentile(prob, percentiles) if percentiles else 50

    contributing_factors = _compute_shap(raw_imp)

    return {
        "risk_probability":     round(prob, 4),
        "percentile_rank":      percentile_rank,
        "contributing_factors": contributing_factors,
        "module":               "cognitive",
    }


# Auto-load on import
try:
    load_cognitive_model()
except Exception as _e:
    logger.warning(f"Cognitive model not loaded at startup: {_e}")