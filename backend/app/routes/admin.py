"""
Admin routes — data collection mode.

All endpoints require role == "admin" in the caller's Firestore user doc.
Participants are NOT Firebase users; they are plain Firestore records owned by
the admin who created them.

Firestore collections written here:
  participants/          — participant demographics
  raw_drawing_data/      — spiral + wave raw touch points + optional prediction
  raw_cognitive_data/    — SDMT / TMT-A / LNS scores
  raw_voice_data/        — extracted voice features + optional prediction
  raw_wearable_data/     — sensor readings + optional prediction
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Any, Dict

from ..core.deps import get_current_admin
from ..schemas.data_collection import (
    ParticipantCreate,
    ParticipantResponse,
    RawDrawingData,
    RawCognitiveData,
    RawVoiceData,
    RawWearableData,
)
from ..dao.data_collection_dao import DataCollectionDAO

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _dao() -> DataCollectionDAO:
    return DataCollectionDAO()


# ── Admin status check ───────────────────────────────────────────────────────

@router.get("/check", status_code=status.HTTP_200_OK)
async def admin_check(admin: Dict[str, Any] = Depends(get_current_admin)):
    """Returns 200 + role info if the caller is an admin, 403 otherwise."""
    return {"is_admin": True, "uid": admin["firebase_uid"], "role": admin.get("role")}


# ── Participant management ────────────────────────────────────────────────────

@router.post("/participants", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
async def create_participant(
    body: ParticipantCreate,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    dao = _dao()
    record = dao.create_participant(admin["firebase_uid"], body)
    logger.info("[admin] Created participant %s for admin %s", record["id"], admin["firebase_uid"])
    return record


@router.get("/participants", status_code=status.HTTP_200_OK)
async def list_participants(admin: Dict[str, Any] = Depends(get_current_admin)):
    dao = _dao()
    return dao.list_participants(admin["firebase_uid"])


@router.get("/participants/{participant_id}", response_model=ParticipantResponse)
async def get_participant(
    participant_id: str,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    dao = _dao()
    p = dao.get_participant(participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    if p["admin_uid"] != admin["firebase_uid"]:
        raise HTTPException(status_code=403, detail="Not your participant")
    return p


@router.get("/participants/{participant_id}/data", status_code=status.HTTP_200_OK)
async def get_participant_data(
    participant_id: str,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    """Return all raw task data collected for this participant."""
    dao = _dao()
    p = dao.get_participant(participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    if p["admin_uid"] != admin["firebase_uid"]:
        raise HTTPException(status_code=403, detail="Not your participant")
    return dao.get_participant_data(participant_id)


# ── Raw data collection endpoints ─────────────────────────────────────────────

@router.post("/participants/{participant_id}/drawing", status_code=status.HTTP_201_CREATED)
async def save_drawing(
    participant_id: str,
    body: RawDrawingData,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    dao = _dao()
    p = dao.get_participant(participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    if p["admin_uid"] != admin["firebase_uid"]:
        raise HTTPException(status_code=403, detail="Not your participant")

    payload = body.dict()
    result = dao.save_raw_drawing(admin["firebase_uid"], payload)
    dao.mark_task_complete(participant_id, "drawing")
    logger.info("[admin] Drawing saved for participant %s", participant_id)
    return {"saved": True, "id": result["id"]}


@router.post("/participants/{participant_id}/cognitive", status_code=status.HTTP_201_CREATED)
async def save_cognitive(
    participant_id: str,
    body: RawCognitiveData,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    dao = _dao()
    p = dao.get_participant(participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    if p["admin_uid"] != admin["firebase_uid"]:
        raise HTTPException(status_code=403, detail="Not your participant")

    payload = body.dict()
    result = dao.save_raw_cognitive(admin["firebase_uid"], payload)
    dao.mark_task_complete(participant_id, "cognitive")
    return {"saved": True, "id": result["id"]}


@router.post("/participants/{participant_id}/voice", status_code=status.HTTP_201_CREATED)
async def save_voice(
    participant_id: str,
    body: RawVoiceData,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    dao = _dao()
    p = dao.get_participant(participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    if p["admin_uid"] != admin["firebase_uid"]:
        raise HTTPException(status_code=403, detail="Not your participant")

    payload = body.dict()
    result = dao.save_raw_voice(admin["firebase_uid"], payload)
    dao.mark_task_complete(participant_id, "voice")
    return {"saved": True, "id": result["id"]}


@router.post("/participants/{participant_id}/wearable", status_code=status.HTTP_201_CREATED)
async def save_wearable(
    participant_id: str,
    body: RawWearableData,
    admin: Dict[str, Any] = Depends(get_current_admin),
):
    dao = _dao()
    p = dao.get_participant(participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    if p["admin_uid"] != admin["firebase_uid"]:
        raise HTTPException(status_code=403, detail="Not your participant")

    payload = body.dict()
    result = dao.save_raw_wearable(admin["firebase_uid"], payload)
    dao.mark_task_complete(participant_id, "wearable")
    return {"saved": True, "id": result["id"]}
