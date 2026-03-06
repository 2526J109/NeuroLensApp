from typing import Dict, Any, Optional
from datetime import datetime
from ..core.firestore import get_firestore_service


class VoiceAnalysisDAO:
    def __init__(self):
        self.db = get_firestore_service()

    def save_result(self, user_id: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persist only the risk score (no audio) to Firestore under 'voice_analyses'.
        """
        record = {
            'user_id': user_id,
            'percentage': result.get('percentage', 0),
            'status': result.get('status', 'warning'),
            'description': result.get('description', ''),
            'details': result.get('details'),
            'created_at': datetime.utcnow().isoformat(),
        }
        return self.db.create_voice_analysis(record)

    def get_results(self, user_id: str) -> Any:
        """Retrieve all past voice analysis results for a user."""
        return self.db.get_user_voice_analyses(user_id)
