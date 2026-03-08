from typing import Dict, Any
from app.dao.wearable_prediction_dao import WearablePredictionDAO

class WearablePredictionService:
    def __init__(self):
        self.dao = WearablePredictionDAO()
        
    def save_wearable_prediction(self, user_id: str, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and save wearable prediction results.
        Currently it merely acts as a bridge to the DAO, but it can handle
        any preprocessing or supplementary logic needed.
        """
        return self.dao.save_prediction(user_id, prediction_data)

    def get_user_predictions(self, user_id: str):
        """
        Retrieve existing wearable predictions for a specific user.
        """
        return self.dao.get_predictions(user_id)
