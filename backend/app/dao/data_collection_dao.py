from typing import Optional, Dict, Any, List
from datetime import datetime
from ..core.firestore import get_firestore_service
from ..schemas.data_collection import ParticipantCreate


class DataCollectionDAO:
    def __init__(self):
        self.db = get_firestore_service()

    # ── Participants ─────────────────────────────────────────────────────────────

    def create_participant(self, admin_uid: str, data: ParticipantCreate) -> Dict[str, Any]:
        col = self.db.db.collection("participants")
        doc_ref = col.document()
        record = {
            "id": doc_ref.id,
            "admin_uid": admin_uid,
            "participant_code": data.participant_code,
            "age": data.age,
            "gender": data.gender,
            "handedness": data.handedness,
            "pd_status": data.pd_status,
            "updrs_score": data.updrs_score,
            "years_since_diagnosis": data.years_since_diagnosis,
            "medication_status": data.medication_status,
            "notes": data.notes,
            "tasks_completed": [],
            "created_at": datetime.utcnow().isoformat(),
        }
        doc_ref.set(record)
        return record

    def list_participants(self, admin_uid: str) -> List[Dict[str, Any]]:
        from google.cloud.firestore_v1.base_query import FieldFilter
        docs = (
            self.db.db.collection("participants")
            .where(filter=FieldFilter("admin_uid", "==", admin_uid))
            .stream()
        )
        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            results.append(d)
            
        # Sort in Python to avoid needing a Firestore composite index
        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return results

    def get_participant(self, participant_id: str) -> Optional[Dict[str, Any]]:
        doc = self.db.db.collection("participants").document(participant_id).get()
        if doc.exists:
            d = doc.to_dict()
            d["id"] = doc.id
            return d
        return None

    def mark_task_complete(self, participant_id: str, task: str) -> None:
        ref = self.db.db.collection("participants").document(participant_id)
        doc = ref.get()
        if doc.exists:
            completed = doc.to_dict().get("tasks_completed", [])
            if task not in completed:
                completed.append(task)
                ref.update({"tasks_completed": completed})

    # ── Raw data saves ───────────────────────────────────────────────────────────

    def _save_raw(self, collection: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        col = self.db.db.collection(collection)
        doc_ref = col.document()
        payload["id"] = doc_ref.id
        payload["created_at"] = datetime.utcnow().isoformat()
        doc_ref.set(payload)
        return payload

    def save_raw_drawing(self, admin_uid: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["admin_uid"] = admin_uid
        return self._save_raw("raw_drawing_data", data)

    def save_raw_cognitive(self, admin_uid: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["admin_uid"] = admin_uid
        return self._save_raw("raw_cognitive_data", data)

    def save_raw_voice(self, admin_uid: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["admin_uid"] = admin_uid
        return self._save_raw("raw_voice_data", data)

    def save_raw_wearable(self, admin_uid: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["admin_uid"] = admin_uid
        return self._save_raw("raw_wearable_data", data)

    def get_participant_data(self, participant_id: str) -> Dict[str, Any]:
        from google.cloud.firestore_v1.base_query import FieldFilter

        def _fetch(col: str) -> List[Dict[str, Any]]:
            docs = (
                self.db.db.collection(col)
                .where(filter=FieldFilter("participant_id", "==", participant_id))
                .stream()
            )
            return [dict(d.to_dict(), id=d.id) for d in docs]

        return {
            "drawing": _fetch("raw_drawing_data"),
            "cognitive": _fetch("raw_cognitive_data"),
            "voice": _fetch("raw_voice_data"),
            "wearable": _fetch("raw_wearable_data"),
        }
