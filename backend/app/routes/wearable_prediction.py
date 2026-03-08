from fastapi import APIRouter, HTTPException, status, Request
from typing import List
from app.schemas.wearable_prediction import WearablePredictionRequest, WearablePredictionResponse
from app.services.wearable_prediction_service import WearablePredictionService
from app.core.firebase import verify_firebase_token

router = APIRouter(prefix="/wearable-prediction", tags=["wearable-prediction"])
wearable_service = WearablePredictionService()

@router.post(
    "/analyze",
    status_code=status.HTTP_200_OK,
    response_model=WearablePredictionResponse,
    summary="Save wearable prediction result"
)
async def save_wearable_prediction(request: Request):
    """
    Endpoint for saving a new wearable prediction to the database.
    Requires a valid Firebase auth token.
    """
    body = await request.json()
    user_id = body.get('user_id')
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    # Verify authorization
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid")
    
    token = auth_header.split(' ')[1]
    decoded_token = await verify_firebase_token(token)
    firebase_uid = decoded_token.get('uid')

    # Security check: ensures user only saves data for themselves
    if user_id != firebase_uid:
        raise HTTPException(status_code=403, detail="User not authorized to access this resource")

    # Optional: explicitly validate data structure with Pydantic via manual parse
    try:
        validated_data = WearablePredictionRequest(**body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request data: {str(e)}")

    try:
        # Save to database
        saved_record = wearable_service.save_wearable_prediction(user_id, validated_data.dict())
        return saved_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving prediction: {str(e)}")
