from typing import Dict, Any, Optional
from datetime import datetime
from ..core.firestore import get_firestore_service
from firebase_admin import firestore

class MultimodalAggregator:
    """
    Calculates the final multimodal risk score by weighting individual model 
    predictions by their respective AUC values.
    """
    
    # Precise AUC weights provided by the user
    AUC_WEIGHTS = {
        "wearable": 0.732,
        "voice": 0.703704,
        "drawing": 0.900,
        "cognitive": 0.8011
    }
    
    TOTAL_AUC = sum(AUC_WEIGHTS.values()) # 3.136804

    @property
    def db(self):
        return get_firestore_service().db

    def calculate_final_score(self, user_id: str, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves all 4 results for the session, calculates the weighted risk,
        and saves it to the 'assessment_history' collection.
        """
        # 1. Fetch scores
        wearable_score = self._get_latest_score("wearable_predictions", session_id, "probability_score")
        voice_score = self._get_latest_score("voice_analyses", session_id, "percentage")
        drawing_result = self._get_latest_score("drawing_predictions", session_id, "prediction")
        cognitive_score = self._get_latest_score("cognitive_results", session_id, "risk_probability")

        # Handle nested drawing score
        drawing_score = drawing_result.get("risk_percentage") if isinstance(drawing_result, dict) else drawing_result

        # Normalize all to 0.0-1.0 scale if they are 0-100
        # Voice is 'percentage' (0-100 probably?), Drawing is 'risk_percentage' (0-100)
        # Wearable is 'probability_score' (0.0-1.0?), Cognitive is 'risk_probability' (0.0-1.0?)
        
        scores = {
            "wearable": wearable_score,
            "voice": voice_score / 100.0 if voice_score is not None else None,
            "drawing": drawing_score / 100.0 if drawing_score is not None else None,
            "cognitive": cognitive_score
        }

        # Check if we have all 4
        if any(s is None for s in scores.values()):
            return {
                "is_complete": False,
                "missing": [k for k, v in scores.items() if v is None]
            }

        # 2. Calculate Weighted Formula
        weighted_sum = sum(scores[k] * self.AUC_WEIGHTS[k] for k in scores)
        final_risk = weighted_sum / self.TOTAL_AUC

        # 3. Save to History
        history_record = {
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "individual_scores": scores,
            "final_multimodal_risk": round(final_risk * 100, 2),
            "status": "complete"
        }
        
        history_ref = self.db.collection("assessment_history").document()
        history_record["id"] = history_ref.id
        history_ref.set(history_record)

        return {
            "is_complete": True,
            "final_score": history_record["final_multimodal_risk"],
            "history_id": history_record["id"]
        }

    def _get_latest_score(self, collection: str, session_id: str, field: str) -> Optional[float]:
        query = self.db.collection(collection).where(filter=firestore.FieldFilter("session_id", "==", session_id)).limit(1)
        docs = query.get()
        for doc in docs:
            return doc.to_dict().get(field)
        return None

    def _get_latest_subcollection_score(self, user_id: str, subcollection: str, session_id: str, field: str) -> Optional[float]:
        query = (self.db.collection("users")
                 .document(user_id)
                 .collection(subcollection)
                 .where(filter=firestore.FieldFilter("session_id", "==", session_id))
                 .limit(1))
        docs = query.get()
        for doc in docs:
            return doc.to_dict().get(field)
        return None
