"""
API route for drawing prediction workflow with remote model server
"""
import traceback
from fastapi import APIRouter, HTTPException, status, Request
from app.services.drawing_prediction_service import analyze_and_save
from app.schemas.drawing_analysis import DrawingAnalysisRequest # type: ignore
from app.core.firebase import verify_firebase_token

router = APIRouter(prefix="/drawing-prediction", tags=["drawing-prediction"])

@router.post(
    "/analyze",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing data via remote model server and save prediction"
)
async def analyze_drawing_prediction(request: Request):
    body = await request.json()
    user_id = body.get('user_id')
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if not body.get('spiral_data') and not body.get('wave_data'):
        raise HTTPException(status_code=400, detail="At least one drawing (spiral or wave) must be provided")

    # Firebase authentication
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid")
    token = auth_header.split(' ')[1]
    decoded_token = await verify_firebase_token(token)
    firebase_uid = decoded_token.get('uid')

    # Authorization: ensure user_id matches authenticated user
    if user_id != firebase_uid:
        raise HTTPException(status_code=403, detail="User not authorized to access this resource")

    try:
        result = analyze_and_save(user_id, body)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
