"""
Service for handling drawing prediction workflow with remote model server
"""
import requests
from typing import Dict, Any, Optional
from app.dao.drawing_prediction_dao import DrawingPredictionDAO

MODEL_SERVER_URL = "http://REMOTE_MODEL_SERVER/api/predict"  # Update with actual URL

def send_to_model_server(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Send drawing data to remote model server and get prediction"""
    print("[DEBUG] Would send to model server:", payload)
    # response = requests.post(MODEL_SERVER_URL, json=payload, timeout=30)
    # response.raise_for_status()
    # return response.json()
    return {"mock_prediction": "success", "payload": payload}


def save_prediction_for_user(user_id: str, prediction: Dict[str, Any]) -> Dict[str, Any]:
    """Save prediction for user in Firestore"""
    dao = DrawingPredictionDAO()
    return dao.save_prediction(user_id, prediction)


def analyze_and_save(user_id: str, drawing_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send drawing data to model server, save prediction, and return result"""
    payload = {"user_id": user_id, **drawing_data}
    prediction = send_to_model_server(payload)
    save_result = save_prediction_for_user(user_id, prediction)
    return {"prediction": prediction, "save_result": save_result}
