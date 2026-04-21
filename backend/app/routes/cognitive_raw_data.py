from fastapi import APIRouter, HTTPException
from ..schemas.cognitive_raw_data import CognitiveRawDataRequest
from ..dao.cognitive_analysis_dao import CognitiveAnalysisDAO
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cognitive-raw-data", tags=["cognitive-raw-data"])

cognitive_dao = CognitiveAnalysisDAO()


@router.post("/save")
async def save_raw_data(request: CognitiveRawDataRequest):
    """
    Saves raw cognitive task data (TMT taps, SDMT trials, demographics,
    and model output) to Firestore for validation / research purposes.
    """
    try:
        data = request.model_dump()
        cognitive_dao.save_raw_data(data)

        logger.info(
            f"Cognitive raw data saved — user={request.user_id} "
            f"session={request.session_id} "
            f"tmt_taps={len(request.tmt_taps)} "
            f"sdmt_trials={len(request.sdmt_trials)}"
        )

        return {"status": "success", "message": "Raw data saved"}

    except Exception as e:
        logger.error(f"Failed to save cognitive raw data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error saving cognitive raw data: {str(e)}"
        )
