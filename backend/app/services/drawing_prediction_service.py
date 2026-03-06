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

def send_to_model_server(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Send drawing data to remote model server (Hugging Face Space) and get prediction"""

    # Prepare inputs for Logistic Regression (vector format)
    features = payload.get("kinematic_features", {})
    feature_vector = prepare_feature_vector(features)

    model_input = {"inputs": [feature_vector]}
    print("[DEBUG] Sending to model server:", model_input)

    url = f"{settings.MODEL_SERVER_URL.rstrip('/')}/predict"
    try:
        response = requests.post(url, json=model_input, timeout=15)
        response.raise_for_status()
        result = response.json()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            f"Could not reach model server at {url}. "
            "Check MODEL_SERVER_URL in your .env file."
        )
    except requests.exceptions.Timeout:
        raise RuntimeError("Model server request timed out.")
    except requests.exceptions.HTTPError as exc:
        raise RuntimeError(f"Model server returned error: {exc.response.status_code} – {exc.response.text}")

    # Return prediction AND the exact input sent for verification/logging
    return {
        **result,
        "debug_model_input": model_input,
    }


def save_prediction_for_user(user_id: str, prediction: Dict[str, Any]) -> Dict[str, Any]:
    """Save prediction for user in Firestore"""
    dao = DrawingPredictionDAO()
    return dao.save_prediction(user_id, prediction)


from app.utils.kinematic_features import extract_kinematic_features

def analyze_and_save(user_id: str, drawing_data: Dict[str, Any]) -> Dict[str, Any]:
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
    save_result = save_prediction_for_user(user_id, prediction_to_save)
    
    return {"prediction": prediction, "save_result": save_result}
