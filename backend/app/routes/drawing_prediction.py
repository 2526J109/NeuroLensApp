
from fastapi import APIRouter, HTTPException, status, Request
from app.services.drawing_prediction_service import (
    analyze_and_save, analyze_with_local_model, analyze_with_normquadstream,
)
from app.core.firebase import verify_firebase_token

router = APIRouter(prefix="/drawing-prediction", tags=["drawing-prediction"])


def _auth_guard(user_id: str, firebase_uid: str) -> None:
    if user_id != firebase_uid:
        raise HTTPException(status_code=403, detail="User not authorized to access this resource")


async def _extract_and_verify(request: Request):
    """Parse body, validate inputs, verify Firebase token. Returns (body, user_id)."""
    body = await request.json()
    user_id = body.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if not body.get("spiral_data") and not body.get("wave_data"):
        raise HTTPException(status_code=400, detail="At least one drawing (spiral or wave) must be provided")
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid")
    token = auth_header.split(" ")[1]
    decoded_token = await verify_firebase_token(token)
    _auth_guard(user_id, decoded_token.get("uid"))
    return body, user_id


@router.post(
    "/analyze",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing via remote HF-Space model server",
)
async def analyze_drawing_prediction(request: Request):
    body, user_id = await _extract_and_verify(request)
    try:
        session_id = body.get("session_id")
        return analyze_and_save(user_id, body, session_id=session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post(
    "/analyze-local",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing via locally-hosted RFE Logistic Regression (6 features)",
)
async def analyze_drawing_local(request: Request):
    body, user_id = await _extract_and_verify(request)
    try:
        session_id = body.get("session_id")
        return analyze_with_local_model(user_id, body, session_id=session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post(
    "/analyze-normquadstream",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing via NormQuadStream NN (12 scale-invariant features, NB22)",
)
async def analyze_drawing_normquadstream(request: Request):
    body, user_id = await _extract_and_verify(request)
    try:
        session_id = body.get("session_id")
        return analyze_with_normquadstream(user_id, body, session_id=session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
