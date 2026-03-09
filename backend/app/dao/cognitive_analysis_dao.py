from datetime import datetime
from ..core.firestore import get_firestore_service
import logging

logger = logging.getLogger(__name__)


class CognitiveAnalysisDAO:
    """Saves cognitive analysis results to Firestore."""

    def save_result(self, user_id: str, result: dict, session_id: str = None):
        """
        Saves to: users/{user_id}/cognitive_results/{date}
        """
        db = get_firestore_service().db

        doc_ref = db.collection("cognitive_results").document()
        
        doc_ref.set({
            **result,
            "user_id": user_id,
            "session_id": session_id,
            "created_at": datetime.now().isoformat(),
        })

        logger.info(
            f"Cognitive result saved — user={user_id} "
            f"risk={result['risk_probability']} "
            f"percentile={result['percentile_rank']}"
        )