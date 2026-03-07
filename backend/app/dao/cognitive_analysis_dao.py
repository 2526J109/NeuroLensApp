from datetime import datetime
from ..core.firestore import get_firestore_service
import logging

logger = logging.getLogger(__name__)


class CognitiveAnalysisDAO:
    """Saves cognitive analysis results to Firestore."""

    def save_result(self, user_id: str, result: dict):
        """
        Saves to: users/{user_id}/cognitive_results/{date}

        Stored document:
        {
            risk_probability: 0.3611,
            percentile_rank: 34,
            module: "cognitive",
            created_at: "2026-03-05T..."
        }
        """
        db = get_firestore_service().db

        # Empty .document() = Firebase auto-generates unique ID
        # This means multiple tests on the same day are all kept
        doc_ref = (
            db.collection("users")
            .document(user_id)
            .collection("cognitive_results")
            .document()
        )

        doc_ref.set({
            **result,
            "created_at": datetime.now().isoformat(),
        })

        logger.info(
            f"Cognitive result saved — user={user_id} "
            f"risk={result['risk_probability']} "
            f"percentile={result['percentile_rank']}"
        )