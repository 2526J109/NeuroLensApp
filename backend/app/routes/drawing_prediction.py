
from fastapi import APIRouter, HTTPException, status, Request
from app.services.drawing_prediction_service import (
    analyze_and_save,
    analyze_with_local_model,
    analyze_with_quadstream_model,
    analyze_with_improved_quadstream_model,
    analyze_with_micro_quadstream_model,
    analyze_with_scale_norm_lr_model,
    analyze_with_nb20_normquadstream_model,
)
from app.core.firebase import verify_firebase_token
import logging

logger = logging.getLogger(__name__)

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
    "/debug-input",
    status_code=status.HTTP_200_OK,
    summary="[DEBUG] Echo parsed input + extracted features — no auth, no prediction",
)
async def debug_drawing_input(request: Request):
    """
    Diagnostic endpoint — no Firebase auth required.
    Returns exactly what the server parsed and what features were extracted.
    Use this to verify the input format before running the real model.
    """
    from app.utils.quadstream_features import extract_quadstream_features, streams_to_feature_dict

    try:
        body = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"JSON parse error: {exc}")

    spiral_data  = body.get("spiral_data") or {}
    wave_data    = body.get("wave_data") or {}
    pixel_ratio  = float(body.get("pixel_ratio") or 1.0)

    spiral_points = spiral_data.get("points") or []
    wave_points   = wave_data.get("points")   or []

    # Show first 2 points of each to confirm structure
    def sample_points(pts, n=2):
        if not pts:
            return []
        return pts[:n]

    # Extract features — will be zeros if format is wrong
    extraction_error = None
    features_dict = {}
    try:
        streams = extract_quadstream_features(spiral_points, wave_points, pixel_ratio=pixel_ratio)
        features_dict = streams_to_feature_dict(streams)
    except Exception as exc:
        extraction_error = str(exc)

    all_zero = all(v == 0.0 for v in features_dict.values()) if features_dict else True

    result = {
        "received": {
            "has_spiral_data":    bool(spiral_data),
            "has_wave_data":      bool(wave_data),
            "spiral_point_count": len(spiral_points),
            "wave_point_count":   len(wave_points),
            "pixel_ratio":        pixel_ratio,
            "spiral_point_sample": sample_points(spiral_points),
            "wave_point_sample":   sample_points(wave_points),
        },
        "features": features_dict,
        "all_features_zero": all_zero,
        "extraction_error": extraction_error,
        "diagnosis": (
            "OK — features look non-zero" if not all_zero and not extraction_error
            else ("Extraction crashed — check point key names (need x, y, timestamp)" if extraction_error
                  else "All features are ZERO — likely cause: points list empty, < 5 points, or wrong key names")
        ),
    }

    logger.info("[debug-input] spiral_pts=%d  wave_pts=%d  pixel_ratio=%.2f  all_zero=%s",
                len(spiral_points), len(wave_points), pixel_ratio, all_zero)
    return result


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
    "/analyze-quadstream",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing via TunedQuadStream NN (NB09 — 16 features, 237 params, 93.1% LOOCV accuracy)",
)
async def analyze_drawing_quadstream(request: Request):
    body, user_id = await _extract_and_verify(request)
    try:
        session_id = body.get("session_id")
        return analyze_with_quadstream_model(user_id, body, session_id=session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post(
    "/analyze-quadstream-v2",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing via ImprovedQuadStream NN (NB12 — asymmetric encoders, stream gates, 94.8% accuracy, AUC 98.45%)",
)
async def analyze_drawing_quadstream_v2(request: Request):
    body, user_id = await _extract_and_verify(request)
    try:
        session_id = body.get("session_id")
        mc_dropout = bool(body.get("mc_dropout", False))
        return analyze_with_improved_quadstream_model(
            user_id, body, session_id=session_id, mc_dropout=mc_dropout
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post(
    "/analyze-micro",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing via MicroQuadStream NN (NB13 — 53 params, no BatchNorm, Tanh, 89.7% LOOCV accuracy)",
)
async def analyze_drawing_micro(request: Request):
    """
    NB13 MicroQuadStream: same 16 absolute-scale features as NB09/NB12
    but with a 53-parameter architecture (no BatchNorm, Tanh encoders, linear fusion).
    Falls back to NB12 if model file not present.
    Optional: pass mc_dropout=true for uncertainty estimation.
    """
    body, user_id = await _extract_and_verify(request)
    try:
        session_id = body.get("session_id")
        mc_dropout = bool(body.get("mc_dropout", False))
        return analyze_with_micro_quadstream_model(
            user_id, body, session_id=session_id, mc_dropout=mc_dropout
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post(
    "/analyze-scale-norm",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing via Scale-Normalised LR (NB19 — 14 CV features, RFECV, mobile-robust)",
)
async def analyze_drawing_scale_norm(request: Request):
    """
    NB19: Logistic Regression with 14 scale-invariant features (vel_cv, jerk_cv,
    pause_ratio, curvature_std, Gaussian RMSE, radius_resid_std, direction_change_rate)
    per task. Trained with Time Warp augmentation and RFECV feature selection.
    Best model for real-world mobile generalisation.
    Returns 503 if nb19_lr_model.pkl has not been placed in the models directory.
    """
    body, user_id = await _extract_and_verify(request)
    try:
        session_id = body.get("session_id")
        return analyze_with_scale_norm_lr_model(user_id, body, session_id=session_id)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"Model unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post(
    "/analyze-normquad",
    status_code=status.HTTP_200_OK,
    summary="Analyze drawing via NormQuadStream NN (NB20 — scale-normalised 14 features, no BatchNorm, ELU)",
)
async def analyze_drawing_normquad(request: Request):
    """
    NB20 NormQuadStream: QuadStream NN trained on the same 14 scale-normalised CV
    features as NB19 (no BatchNorm, ELU activation, dropout=0.25, MC Dropout support).
    Stream dims: s1(3)+s2(4)+s3(3)+s4(4). Mobile-robust by design.
    Returns 503 if nb20_normquadstream_final.pth has not been placed in models directory.
    Optional: pass mc_dropout=true for uncertainty estimation.
    """
    body, user_id = await _extract_and_verify(request)
    try:
        session_id = body.get("session_id")
        mc_dropout = bool(body.get("mc_dropout", False))
        return analyze_with_nb20_normquadstream_model(
            user_id, body, session_id=session_id, mc_dropout=mc_dropout
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"Model unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
