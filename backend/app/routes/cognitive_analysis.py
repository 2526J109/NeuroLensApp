from fastapi import APIRouter, HTTPException
from ..schemas.cognitive_analysis import CognitiveAnalysisRequest, CognitiveAnalysisResponse
from ..services.cognitive_analysis_service import predict
from ..dao.cognitive_analysis_dao import CognitiveAnalysisDAO

router = APIRouter(prefix="/cognitive-analysis", tags=["cognitive-analysis"])

cognitive_dao = CognitiveAnalysisDAO()


@router.post("/predict", response_model=CognitiveAnalysisResponse)
async def predict_cognitive(request: CognitiveAnalysisRequest):
    """
    Accepts cognitive task scores and user profile.
    Returns risk probability and percentile rank.
    Saves result to Firestore.
    """
    try:
        result = predict(
            sdmtotal     = request.sdmtotal,
            age_at_visit = request.age_at_visit,
            SEX          = request.SEX,
            fampd        = request.fampd,
            rem          = request.rem,
            tmt_a        = request.tmt_a,
            dvs_lns      = request.dvs_lns,
        )

        # Save to Firestore
        try:
            cognitive_dao.save_result(request.user_id, result)
        except Exception as db_err:
            import logging
            logging.getLogger(__name__).warning(
                f"Could not save cognitive result to Firestore: {db_err}"
            )

        return CognitiveAnalysisResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error running cognitive analysis: {str(e)}"
        )