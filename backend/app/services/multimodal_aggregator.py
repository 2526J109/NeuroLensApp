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
        Retrieves available results for the session, calculates the weighted risk,
        and saves it to the 'assessment_history' collection.
        Supports partial results if some assessments are still pending.
        """
        # Improved lookup helper
        def find_score(coll, field):
            # Try user subcollection first
            s = self._get_latest_subcollection_score(user_id, coll, session_id, field)
            if s is None:
                # Fallback to top-level collection
                s = self._get_latest_score(coll, session_id, field)
            return s

        # 1. Fetch scores
        wearable_score = find_score("wearable_predictions", "probability_score")
        voice_score = find_score("voice_analyses", "percentage")
        drawing_result = find_score("drawing_predictions", "prediction")
        cognitive_score = find_score("cognitive_results", "risk_probability")

        # Handle drawing score correctly
        drawing_score = None
        if drawing_result is not None:
            if isinstance(drawing_result, dict):
                drawing_score = drawing_result.get("risk_percentage")
            else:
                drawing_score = drawing_result

        # Normalize all to 0.0-1.0 scale
        normalized_scores = {
            "wearable": wearable_score if wearable_score is not None else None,
            "voice": voice_score / 100.0 if voice_score is not None else None,
            "drawing": drawing_score / 100.0 if drawing_score is not None else None,
            "cognitive": cognitive_score if cognitive_score is not None else None
        }

        # Identify missing and available
        raw_results = {
            "wearable": wearable_score,
            "voice": voice_score,
            "drawing": drawing_score,
            "cognitive": cognitive_score
        }
        missing = [k for k, v in raw_results.items() if v is None]
        
        if len(missing) == 4:
            return {
                "is_complete": False,
                "message": "No assessment data found for this session.",
                "remaining_tasks": 4
            }

        # Normalize all to 0.0-1.0 scale, fallback to 0.0 for missing
        normalized_scores = {
            "wearable": wearable_score if wearable_score is not None else 0.0,
            "voice": voice_score / 100.0 if voice_score is not None else 0.0,
            "drawing": drawing_score / 100.0 if drawing_score is not None else 0.0,
            "cognitive": cognitive_score if cognitive_score is not None else 0.0
        }

        # 2. Calculate Weighted Formula (Full total weight, missing tasks default to 0 risk)
        weighted_sum = sum(normalized_scores[k] * self.AUC_WEIGHTS[k] for k in normalized_scores)
        final_risk = weighted_sum / self.TOTAL_AUC

        # Scores in 0-100 format for history and frontend
        display_scores = {
            k: round(v * 100, 2) for k, v in normalized_scores.items()
        }

        # 3. Save to History (Update if exists for this session, otherwise create)
        history_ref = self.db.collection("assessment_history").where(filter=firestore.FieldFilter("session_id", "==", session_id)).limit(1).get()
        
        doc_id = None
        for doc in history_ref:
            doc_id = doc.id
            break
            
        history_record = {
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "individual_scores": display_scores,
            "final_multimodal_risk": round(final_risk * 100, 2),
            "status": "complete" if not missing else "partial",
            "remaining_tasks": len(missing),
            "missing_modalities": missing
        }
        
        if doc_id:
            target_ref = self.db.collection("assessment_history").document(doc_id)
            history_record["id"] = doc_id
            target_ref.update(history_record)
        else:
            target_ref = self.db.collection("assessment_history").document()
            history_record["id"] = target_ref.id
            target_ref.set(history_record)

        return {
            "is_complete": True,
            "final_score": history_record["final_multimodal_risk"],
            "individual_scores": display_scores,
            "remaining_tasks": len(missing),
            "missing_modalities": missing,
            "history_id": history_record["id"],
            "timestamp": history_record["timestamp"]
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
