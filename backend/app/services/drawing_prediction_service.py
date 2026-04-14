"""
Service for handling drawing prediction workflow with remote model server
"""
import requests
from typing import Dict, Any, Optional, List
from app.dao.drawing_prediction_dao import DrawingPredictionDAO
from app.core.config import settings

# Order of features as expected by the Logistic Regression model
FEATURE_ORDER = [
    "spiral_vel_cv",
    "wave_vel_cv",
    "spiral_pause_ratio",
    "wave_pause_ratio",
    "spiral_curv_std"
]

def prepare_feature_vector(features: Dict[str, float]) -> List[float]:
    """Convert features dictionary to a flat list in the correct order."""
    return [features.get(f, 0.0) for f in FEATURE_ORDER]

def _normalize_model_response(raw: Dict[str, Any], feature_vector: List[float]) -> Dict[str, Any]:
    """
    Convert the HF Space /predict response into a consistent shape:
        {
            "risk_percentage":  0-100,
            "risk_level":       "Low" | "Moderate" | "High",
            "label":            "Normal" | "Parkinson's Detected",
            "confidence":       0-100,
        }

    Actual HF Space response format (from server logs):
        {"prediction": "low_risk" | "high_risk",
         "probability": <P(high_risk) 0.0-1.0>,
         "confidence":  <0.0-1.0>}
    """
    pred_class: Optional[int] = None
    probability: Optional[float] = None   # P(high_risk), 0.0-1.0

    # ── PRIMARY: actual HF Space format ─────────────────────────────────
    # {"prediction": "low_risk"/"high_risk", "probability": 0.056, "confidence": 0.944}
    if "prediction" in raw:
        pred_str = str(raw["prediction"]).lower()
        pred_class = 1 if "high" in pred_str else 0
        # "probability" == P(high_risk) as logged: P(high_risk)=0.0560
        probability = float(raw.get("probability", 0.5 if pred_class == 0 else 1.0))
        # confidence from model (0-1 scale); if already >1 it's already %-scale
        raw_conf = raw.get("confidence")
        if raw_conf is not None:
            conf_val = float(raw_conf)
            conf_pct = conf_val if conf_val > 1.0 else conf_val * 100
        else:
            conf_pct = round(max(probability, 1.0 - probability) * 100, 2)

        risk_pct = round(probability * 100, 2)
        label    = "Parkinson's Detected" if pred_class == 1 else "Normal"
        return {
            "risk_percentage": risk_pct,
            "risk_level":      _risk_level(risk_pct),
            "label":           label,
            "confidence":      round(conf_pct, 2),
        }

    # ── SECONDARY: already fully normalised (our own model_server/app.py) ─
    if "risk_percentage" in raw and "risk_level" in raw:
        return {
            "risk_percentage": float(raw["risk_percentage"]),
            "risk_level":      raw["risk_level"],
            "label":           raw.get("label", ""),
            "confidence":      float(raw.get("confidence", 0.0)),
        }

    # ── TERTIARY: proba array {"predictions":[0/1],"probabilities":[[p0,p1]]} ─
    if "predictions" in raw:
        preds = raw["predictions"]
        pred_class = int(preds[0]) if preds else 0
        proba_list = raw.get("probabilities", [])
        if proba_list and len(proba_list[0]) > 1:
            probability = float(proba_list[0][1])

    # ── FALLBACK: rule-based from kinematic feature vector ───────────────
    if pred_class is None:
        spiral_vel_cv = feature_vector[0] if len(feature_vector) > 0 else 0.0
        wave_vel_cv   = feature_vector[1] if len(feature_vector) > 1 else 0.0
        spiral_pause  = feature_vector[2] if len(feature_vector) > 2 else 0.0
        wave_pause    = feature_vector[3] if len(feature_vector) > 3 else 0.0
        risk_heuristic = min(
            (spiral_vel_cv + wave_vel_cv) * 30 + (spiral_pause + wave_pause) * 20, 100.0
        )
        pred_class  = 1 if risk_heuristic >= 40 else 0
        probability = risk_heuristic / 100.0

    if probability is None:
        probability = 0.5

    risk_pct = round(float(probability) * 100, 2)
    label    = "Parkinson's Detected" if pred_class == 1 else "Normal"
    conf_pct = round(max(probability, 1.0 - probability) * 100, 2)

    return {
        "risk_percentage": risk_pct,
        "risk_level":      _risk_level(risk_pct),
        "label":           label,
        "confidence":      conf_pct,
    }


def _risk_level(risk_pct: float) -> str:
    if risk_pct >= 70:
        return "High"
    if risk_pct >= 40:
        return "Moderate"
    return "Low"


def send_to_model_server(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Send drawing features to the hosted HF Space /predict and return a normalised prediction.
    Falls back to a local rule-based heuristic if the model server is unreachable."""

    features = payload.get("kinematic_features", {})
    feature_vector = prepare_feature_vector(features)

    model_input = {"inputs": [feature_vector]}
    print("[DEBUG] Sending to model server:", model_input)

    url = f"{settings.MODEL_SERVER_URL.rstrip('/')}/predict"
    raw_result: Optional[Dict[str, Any]] = None
    fallback_message: Optional[str] = None

    try:
        response = requests.post(url, json=model_input, timeout=30)
        response.raise_for_status()
        raw_result = response.json()
        print("[DEBUG] Model server response:", raw_result)
    except requests.exceptions.ConnectionError as exc:
        fallback_message = f"Model server unreachable ({url}): {exc}"
    except requests.exceptions.Timeout:
        fallback_message = "Model server request timed out — using local fallback."
    except requests.exceptions.HTTPError as exc:
        fallback_message = (
            f"Model server HTTP {exc.response.status_code} — using local fallback. "
            f"Body: {exc.response.text[:200]}"
        )
    except Exception as exc:
        fallback_message = f"Unexpected error contacting model server: {exc}"

    if fallback_message:
        print(f"[WARN] {fallback_message}")
        # Use the rule-based heuristic as the fallback response
        raw_result = {}   # _normalize_model_response will hit the fallback branch

    normalised = _normalize_model_response(raw_result, feature_vector)
    if fallback_message:
        normalised["message"] = fallback_message

    return {
        **normalised,
        "debug_model_input": model_input,
    }


def save_prediction_for_user(user_id: str, prediction: Dict[str, Any], session_id: str = None) -> Dict[str, Any]:
    """Save prediction for user in Firestore"""
    dao = DrawingPredictionDAO()
    return dao.save_prediction(user_id, prediction, session_id)


from app.utils.kinematic_features import extract_kinematic_features, extract_rfe_features
from app.models.drawing_local_predictor import predict_drawing_risk

def analyze_and_save(user_id: str, drawing_data: Dict[str, Any], session_id: str = None) -> Dict[str, Any]:
    """Send drawing data to model server, save prediction, and return result"""
    
    # Extract kinematic features from input data
    spiral_data = drawing_data.get("spiral_data")
    wave_data = drawing_data.get("wave_data")
    
    spiral_points = spiral_data.get("points") if spiral_data else []
    wave_points = wave_data.get("points") if wave_data else []
    
    if spiral_points or wave_points:
        kinematic_features = extract_kinematic_features(spiral_points, wave_points)
        drawing_data["kinematic_features"] = kinematic_features

    payload = {"user_id": user_id, **drawing_data}
    
    # Get prediction from model server (includes debug info)
    prediction = send_to_model_server(payload)
    
    # Save only core fields to Firestore — exclude debug_model_input because
    # Firestore does not support nested arrays (list of lists).
    prediction_to_save = {k: v for k, v in prediction.items() if k != "debug_model_input"}
    save_result = save_prediction_for_user(user_id, prediction_to_save, session_id)
    
    return {"prediction": prediction, "save_result": save_result}


def analyze_with_local_model(user_id: str, drawing_data: Dict[str, Any], session_id: str = None) -> Dict[str, Any]:
    spiral_points = (drawing_data.get("spiral_data") or {}).get("points") or []
    wave_points   = (drawing_data.get("wave_data")   or {}).get("points") or []
    # pixel_ratio converts React Native logical pixels → physical pixels so that
    # coordinate-scale-dependent features (wavy_wave_rmse) match the training
    # data which was collected in physical pixels on the Vivo X27 (1080px wide).
    pixel_ratio: float = float(drawing_data.get("pixel_ratio") or 1.0)

    # Fetch age from Firestore profile so the model gets the real value
    age: float = 0.0
    try:
        from app.dao.user_dao import UserDAO
        from datetime import date
        user = UserDAO().get_by_firebase_uid(user_id)
        if user and user.get("birthday"):
            birth = date.fromisoformat(str(user["birthday"])[:10])
            age = round((date.today() - birth).days / 365.25, 1)
    except Exception:
        pass  

    rfe_features = extract_rfe_features(spiral_points, wave_points, pixel_ratio=pixel_ratio)
    rfe_features["age"] = age   # inject so scaler finds it if model was trained with age

    prediction = predict_drawing_risk(rfe_features)
    prediction["rfe_features"] = rfe_features   # returned to caller for transparency

    prediction_to_save = {
        k: v for k, v in prediction.items() if k not in ("rfe_features", "source")
    }
    save_result = save_prediction_for_user(user_id, prediction_to_save, session_id)

    return {"prediction": prediction, "save_result": save_result}


def analyze_with_improved_quadstream_model(
    user_id: str,
    drawing_data: Dict[str, Any],
    session_id: str = None,
    mc_dropout: bool = False,
) -> Dict[str, Any]:
    """
    Run NB12 ImprovedQuadStream inference (339 params, AUC=98.45%).

    Identical input contract to analyze_with_quadstream_model().
    Extra return keys:
      - stream_gates     : {S1..S4} learned gate values (0-1)
      - uncertainty      : MC Dropout std × 100  (only when mc_dropout=True)
      - is_borderline    : True when uncertainty std > 0.15  (only when mc_dropout=True)

    The NB09 quadstream model is NOT affected by this function.
    """
    from app.utils.quadstream_features import (
        extract_quadstream_features,
        streams_to_feature_dict,
    )
    from app.models.improved_quadstream_predictor import predict_improved_quadstream_risk

    spiral_points = (drawing_data.get("spiral_data") or {}).get("points") or []
    wave_points   = (drawing_data.get("wave_data")   or {}).get("points") or []
    pixel_ratio: float = float(drawing_data.get("pixel_ratio") or 1.0)

    streams = extract_quadstream_features(spiral_points, wave_points, pixel_ratio=pixel_ratio)

    try:
        prediction = predict_improved_quadstream_risk(streams, mc_dropout=mc_dropout)
    except RuntimeError as exc:
        import logging
        logging.getLogger(__name__).warning(
            "[ImprovedQuadStream] Falling back to NB09 model: %s", exc
        )
        return analyze_with_quadstream_model(user_id, drawing_data, session_id)

    prediction["quadstream_features"] = streams_to_feature_dict(streams)

    prediction_to_save = {
        k: v
        for k, v in prediction.items()
        if k not in ("quadstream_features", "stream_gates", "source")
    }
    save_result = save_prediction_for_user(user_id, prediction_to_save, session_id)

    return {"prediction": prediction, "save_result": save_result}


def analyze_with_quadstream_model(
    user_id: str,
    drawing_data: Dict[str, Any],
    session_id: str = None,
) -> Dict[str, Any]:
    import logging as _logging
    _log = _logging.getLogger(__name__)

    from app.utils.quadstream_features import (
        extract_quadstream_features,
        streams_to_feature_dict,
    )
    from app.models.quadstream_predictor import predict_quadstream_risk

    spiral_points = (drawing_data.get("spiral_data") or {}).get("points") or []
    wave_points   = (drawing_data.get("wave_data")   or {}).get("points") or []
    pixel_ratio: float = float(drawing_data.get("pixel_ratio") or 1.0)

    _log.info(
        "[QuadStream] Input — spiral_pts=%d  wave_pts=%d  pixel_ratio=%.2f  "
        "spiral_sample=%s  wave_sample=%s",
        len(spiral_points), len(wave_points), pixel_ratio,
        spiral_points[:1], wave_points[:1],
    )

    streams = extract_quadstream_features(spiral_points, wave_points, pixel_ratio=pixel_ratio)
    _log.info("[QuadStream] Extracted streams — s1=%s  s2=%s  s3=%s  s4=%s",
              streams["s1"].tolist(), streams["s2"].tolist(),
              streams["s3"].tolist(), streams["s4"].tolist())

    try:
        prediction = predict_quadstream_risk(streams)
    except RuntimeError as exc:
        _log.warning("[QuadStream] Falling back to LR model: %s", exc)
        return analyze_with_local_model(user_id, drawing_data, session_id)

    prediction["quadstream_features"] = streams_to_feature_dict(streams)

    prediction_to_save = {
        k: v
        for k, v in prediction.items()
        if k not in ("quadstream_features", "source")
    }
    save_result = save_prediction_for_user(user_id, prediction_to_save, session_id)

    return {"prediction": prediction, "save_result": save_result}
