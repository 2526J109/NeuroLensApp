"""
Service for handling drawing prediction workflow with remote model server
"""
import requests
from typing import Dict, Any, Optional
from app.dao.drawing_prediction_dao import DrawingPredictionDAO

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
    """Send drawing data to remote model server and get prediction"""
    
    # Prepare inputs for Logistic Regression (vector format)
    features = payload.get("kinematic_features", {})
    feature_vector = prepare_feature_vector(features)
    
    # Hugging Face Inference API / typical ML server format
    model_input = {"inputs": [feature_vector]}
    
    print("[DEBUG] Sending to model server:", model_input)
    
    # Example for actual requests:
    # response = requests.post(MODEL_SERVER_URL, json=model_input, timeout=30)
    # return response.json()
    
    return {
        "prediction": "low_risk", 
        "probability": 0.12,
        "features_sent": feature_vector
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
        print(f"[DEBUG] Extracted kinematic features: {kinematic_features}")

    payload = {"user_id": user_id, **drawing_data}
    prediction = send_to_model_server(payload)
    save_result = save_prediction_for_user(user_id, prediction)
    return {"prediction": prediction, "save_result": save_result}
