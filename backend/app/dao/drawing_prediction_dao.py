from typing import Dict, Any
from datetime import datetime
from ..core.firestore import get_firestore_service

class DrawingPredictionDAO:
    def __init__(self):
        self.db = get_firestore_service()

    def save_prediction(self, user_id: str, prediction: Dict[str, Any], session_id: str = None) -> Dict[str, Any]:
        prediction_record = {
            'user_id': user_id,
            'session_id': session_id,
            'prediction': prediction,
            'created_at': datetime.utcnow().isoformat()
        }
        return self.db.save_drawing_prediction(user_id, prediction_record)

    def get_predictions(self, user_id: str) -> Any:
        return self.db.get_drawing_predictions(user_id)
