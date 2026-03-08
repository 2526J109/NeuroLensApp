from typing import Dict, Any, List
from datetime import datetime
from ..core.firestore import get_firestore_service

class WearablePredictionDAO:
    def __init__(self):
        self.db = get_firestore_service()

    def save_prediction(self, user_id: str, prediction: Dict[str, Any], session_id: str = None) -> Dict[str, Any]:
        """Save a wearable prediction for a user."""
        record = {
            'user_id': user_id,
            'session_id': session_id,
            'global_verdict': prediction.get('global_verdict', ''),
            'probability_score': prediction.get('probability_score', 0.0),
            'step_results': prediction.get('step_results', {}),
            'created_at': datetime.utcnow().isoformat(),
        }
        return self.db.create_wearable_prediction(record)

    def get_predictions(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve all wearable predictions for a user."""
        return self.db.get_user_wearable_predictions(user_id)
