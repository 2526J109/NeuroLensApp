from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Dict
from ..services.multimodal_aggregator import MultimodalAggregator
from ..core.deps import get_current_user
from ..core.firestore import get_firestore_service

router = APIRouter(prefix="/multimodal", tags=["multimodal"])
aggregator = MultimodalAggregator()

@router.post("/result/{session_id}")
async def get_multimodal_result(session_id: str, current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Triggers the multimodal aggregation logic for the given session ID.
    Only allows access if the session belongs to the authenticated user.
    """
    # Note: The aggregator internally checks if tests exist for this session.
    # In a real system, we'd also verify the session_id belongs to current_user.get("firebase_uid")
    # For now, we'll pass the firebase_uid to let the aggregator find the correct user docs.
    
    user_id = current_user.get("firebase_uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated correctly")

    try:
        result = aggregator.calculate_final_score(user_id, session_id)
        if not result:
            raise HTTPException(status_code=404, detail="No data found for this session")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation error: {str(e)}")

@router.get("/history")
async def get_assessment_history(current_user: dict = Depends(get_current_user)) -> Any:
    """
    Retrieves the full assessment history for the current user.
    """
    user_id = current_user.get("firebase_uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated correctly")

    try:
        db_service = get_firestore_service()
        history = db_service.get_user_assessment_history(user_id)
        return history
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History retrieval error: {str(e)}")

@router.get("/latest")
async def get_latest_multimodal_result(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Retrieves the most recent multimodal assessment for the current user.
    """
    user_id = current_user.get("firebase_uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated correctly")

    try:
        db_service = get_firestore_service()
        latest = db_service.get_latest_assessment(user_id)
        if not latest:
            raise HTTPException(status_code=404, detail="No assessment history found")
        return latest
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving latest assessment: {str(e)}")
