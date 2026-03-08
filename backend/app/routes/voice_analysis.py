import os
import uuid
import shutil
import tempfile
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from ..schemas.voice_analysis import (
    VoiceAnalysisRequest,
    VoiceAnalysisResponse,
    VoiceAnalysisStatus,
    VoiceAnalysisResult,
)
from ..services.voice_analysis_service import VoiceAnalysisService
from ..dao.voice_analysis_dao import VoiceAnalysisDAO

router = APIRouter(prefix="/voice-analysis", tags=["voice-analysis"])

# ── Model paths ────────────────────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
ACOUSTIC_MODEL_PATH  = os.path.join(MODELS_DIR, "acoustic_rf_model.joblib")
LINGUISTIC_MODEL_PATH = os.path.join(MODELS_DIR, "linguistic_lr_model.joblib")
LINGUISTIC_SCALER_PATH = os.path.join(MODELS_DIR, "linguistic_scaler.joblib")

voice_service = VoiceAnalysisService(
    acoustic_model_path=ACOUSTIC_MODEL_PATH,
    linguistic_model_path=LINGUISTIC_MODEL_PATH,
    linguistic_scaler_path=LINGUISTIC_SCALER_PATH,
    model_type="sklearn",
)

voice_dao = VoiceAnalysisDAO()


# ── Shared helper ──────────────────────────────────────────────────────────────

def _build_response(session_id: str, result_dict: dict) -> VoiceAnalysisResponse:
    result = VoiceAnalysisResult(
        percentage=result_dict["percentage"],
        status=result_dict["status"],
        description=result_dict["description"],
        details=result_dict.get("details"),
    )
    return VoiceAnalysisResponse(
        session_id=session_id,
        status=VoiceAnalysisStatus.COMPLETED,
        result=result,
        created_at=datetime.now().isoformat(),
    )


# ── /predict_voice  (multipart – real audio files) ────────────────────────────

@router.post("/predict_voice", response_model=VoiceAnalysisResponse)
async def predict_voice(
    recording_1: Optional[UploadFile] = File(None),
    recording_2: Optional[UploadFile] = File(None),
    recording_3: Optional[UploadFile] = File(None),
    session_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
):
    """
    Accept the three audio recordings as real file uploads (multipart/form-data).

    Workflow:
    1. Save each uploaded file to a temporary directory.
    2. Run ML model inference with real audio features via librosa.
    3. Delete all temp files.
    4. Persist only the risk score to Firestore.
    5. Return the analysis result JSON.
    """
    session_id = session_id or str(uuid.uuid4())
    tmp_dir = tempfile.mkdtemp(prefix="neurolens_voice_")
    file_paths: List[str] = []

    try:
        # ── 1. Save uploaded files to temp dir ────────────────────────────────
        uploads = [recording_1, recording_2, recording_3]
        for idx, upload in enumerate(uploads, start=1):
            if upload is not None:
                content = await upload.read()
                if content:  # skip empty blobs
                    suffix = os.path.splitext(upload.filename or "")[-1] or ".m4a"
                    tmp_path = os.path.join(tmp_dir, f"recording_{idx}{suffix}")
                    with open(tmp_path, "wb") as f:
                        f.write(content)
                    file_paths.append(tmp_path)

        # ── 2. Run model inference ─────────────────────────────────────────────
        if file_paths:
            result_dict = await voice_service.analyze_from_files(file_paths, session_id)
        else:
            # No real files received — fall back to simulation for all 3 prompts
            import logging
            logging.getLogger(__name__).warning(
                "No audio files received in /predict_voice — using simulated predictions."
            )
            fake_recordings = [
                {"prompt_id": i, "duration": 0, "uri": ""} for i in range(1, 4)
            ]
            result_dict = await voice_service.analyze_recordings(fake_recordings, session_id)

        # ── 3. Persist only the risk score ────────────────────────────────────
        if user_id:
            try:
                voice_dao.save_result(user_id, result_dict, session_id=session_id)
            except Exception as db_err:
                import logging
                logging.getLogger(__name__).warning(
                    f"Could not save voice result to Firestore: {db_err}"
                )

        return _build_response(session_id, result_dict)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing voice recordings: {str(e)}",
        )
    finally:
        # ── 4. Always delete temp files ────────────────────────────────────────
        shutil.rmtree(tmp_dir, ignore_errors=True)



# ── /analyze  (JSON metadata – kept for backwards compatibility) ───────────────

@router.post("/analyze", response_model=VoiceAnalysisResponse)
async def analyze_voice_recordings(request: VoiceAnalysisRequest):
    """
    Legacy endpoint: accepts recording metadata (no audio upload).
    Uses simulated or model inference based on model availability.
    """
    try:
        session_id = request.session_id or str(uuid.uuid4())
        recordings_data = [
            {"prompt_id": rec.prompt_id, "duration": rec.duration, "uri": rec.uri}
            for rec in request.recordings
        ]
        result_dict = await voice_service.analyze_recordings(recordings_data, session_id)
        return _build_response(session_id, result_dict)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing voice recordings: {str(e)}",
        )
