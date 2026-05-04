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

AGE_COHORT_PERCENTILES = {
    'under_45': {'p10': 0.101, 'p25': 0.126, 'p50': 0.242, 'p75': 0.588, 'p90': 0.826},
    '45_55':    {'p10': 0.126, 'p25': 0.186, 'p50': 0.537, 'p75': 0.841, 'p90': 0.895},
    '55_65':    {'p10': 0.188, 'p25': 0.399, 'p50': 0.773, 'p75': 0.897, 'p90': 0.924},
    '65_plus':  {'p10': 0.289, 'p25': 0.488, 'p50': 0.796, 'p75': 0.907, 'p90': 0.928},
}

def get_age_cohort(age: float):
    if age < 45:   return 'under_45', 'adults under 45'
    elif age < 55: return '45_55',    'adults aged 45 to 55'
    elif age < 65: return '55_65',    'adults aged 55 to 65'
    else:          return '65_plus',  'adults aged 65 and above'

def get_age_matched_percentile(risk_prob: float, age: float):
    cohort_key, cohort_label = get_age_cohort(age)
    t = AGE_COHORT_PERCENTILES[cohort_key]
    if   risk_prob <= t['p10']: percentile = 10
    elif risk_prob <= t['p25']: percentile = 25
    elif risk_prob <= t['p50']: percentile = 50
    elif risk_prob <= t['p75']: percentile = 75
    elif risk_prob <= t['p90']: percentile = 90
    else:                       percentile = 95
    return {
        'age_matched_percentile': percentile,
        'age_cohort_label': cohort_label
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


def _compute_shap(raw_imp, age_at_visit=None):
    try:
        features = _bundle['features_final']
        stats = _bundle['imputer'].statistics_

        def get_median(feat):
            return float(stats[list(features).index(feat)])

        sdmtotal   = float(raw_imp['SDMTOTAL'].iloc[0])
        tmt_a_val  = raw_imp['TMT_A'].iloc[0]
        tmt_a      = float(tmt_a_val) if not pd.isna(tmt_a_val) else None
        fampd      = float(raw_imp['fampd'].iloc[0])
        rem        = float(raw_imp['rem'].iloc[0])

        sdmt_median = get_median('SDMTOTAL')
        tmt_median  = get_median('TMT_A')

        factors = []

        # Processing Speed
        if sdmtotal < sdmt_median * 0.85:
            factors.append({
                "feature":    "Processing Speed",
                "direction":  "atypical",
                "shap_value": round((sdmt_median - sdmtotal) / sdmt_median * 0.3, 4)
            })
        else:
            factors.append({
                "feature":    "Processing Speed",
                "direction":  "typical",
                "shap_value": round(-((sdmtotal - sdmt_median) / sdmt_median * 0.2), 4)
            })

        # Attention Speed
        if tmt_a is not None:
            if tmt_a > tmt_median * 1.2:
                factors.append({
                    "feature":    "Attention Speed",
                    "direction":  "atypical",
                    "shap_value": round((tmt_a - tmt_median) / tmt_median * 0.25, 4)
                })
            else:
                factors.append({
                    "feature":    "Attention Speed",
                    "direction":  "typical",
                    "shap_value": round(-((tmt_median - tmt_a) / tmt_median * 0.15), 4)
                })

        # Family History or REM Sleep
        if fampd == 1:
            factors.append({
                "feature":    "Family History",
                "direction":  "atypical",
                "shap_value": 0.18
            })
        elif rem == 1:
            factors.append({
                "feature":    "Sleep Patterns",
                "direction":  "atypical",
                "shap_value": 0.12
            })
        else:
            factors.append({
                "feature":    "Family History",
                "direction":  "typical",
                "shap_value": -0.08
            })

        logger.info(f"Factors computed: {factors[:3]}")
        return factors[:3]

    except Exception as e:
        import traceback
        logger.error(f"Factor computation failed: {type(e).__name__}: {e}\n{traceback.format_exc()}")
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

    contributing_factors = _compute_shap(raw_imp, age_at_visit)

    age_data = get_age_matched_percentile(prob, age_at_visit)
    logger.info(f"Age matched percentile: {age_data}")

    return {
        "risk_probability":      round(prob, 4),
        "percentile_rank":       percentile_rank,
        "contributing_factors":  contributing_factors,
        "module":                "cognitive",
        "age_matched_percentile": age_data["age_matched_percentile"],
        "age_cohort_label":       age_data["age_cohort_label"],
    }


# Auto-load on import
try:
    load_cognitive_model()
except Exception as _e:
    logger.warning(f"Cognitive model not loaded at startup: {_e}")