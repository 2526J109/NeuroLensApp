"""
Health check and diagnostics endpoint.
Verifies all critical ML models and files are accessible.
"""
from fastapi import APIRouter
import os
import logging

router = APIRouter(prefix="/health", tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/diagnostics")
async def diagnostics():
    """
    Check if all required model files exist and can be loaded.
    Returns detailed status for debugging deployment issues.
    """
    diagnostics = {
        "status": "ok",
        "models": {},
        "files": {},
    }

    # ── NormQuadStream model files ─────────────────────────────────────────
    nqs_model_path = "/app/app/models/nb22_normquadstream_noaug_final.pth"
    nqs_scalers_path = "/app/app/models/nb22_normquadstream_noaug_scalers.pkl"
    
    nqs_model_exists = os.path.exists(nqs_model_path)
    nqs_scalers_exists = os.path.exists(nqs_scalers_path)
    
    diagnostics["files"]["normquadstream_model"] = {
        "path": nqs_model_path,
        "exists": nqs_model_exists,
        "size_bytes": os.path.getsize(nqs_model_path) if nqs_model_exists else 0,
    }
    
    diagnostics["files"]["normquadstream_scalers"] = {
        "path": nqs_scalers_path,
        "exists": nqs_scalers_exists,
        "size_bytes": os.path.getsize(nqs_scalers_path) if nqs_scalers_exists else 0,
    }

    # ── Test model loading ─────────────────────────────────────────────────
    if nqs_model_exists and nqs_scalers_exists:
        try:
            from app.models.drawing_normquadstream_predictor import _load_predictor
            predictor = _load_predictor()
            if predictor:
                diagnostics["models"]["normquadstream"] = "loaded_ok"
            else:
                diagnostics["models"]["normquadstream"] = "failed_to_load"
                diagnostics["status"] = "error"
        except ImportError as e:
            diagnostics["models"]["normquadstream"] = f"import_error: {str(e)}"
            diagnostics["status"] = "error"
        except Exception as e:
            diagnostics["models"]["normquadstream"] = f"load_error: {str(e)}"
            diagnostics["status"] = "error"
    else:
        diagnostics["models"]["normquadstream"] = "missing_files"
        diagnostics["status"] = "error"

    # ── PyTorch availability ──────────────────────────────────────────────
    try:
        import torch
        diagnostics["dependencies"] = {
            "torch": {
                "available": True,
                "version": torch.__version__,
                "cuda_available": torch.cuda.is_available(),
            }
        }
    except ImportError:
        diagnostics["dependencies"] = {
            "torch": {
                "available": False,
                "error": "torch not installed",
            }
        }
        diagnostics["status"] = "error"

    return diagnostics


@router.get("/ready")
async def ready():
    """Simple readiness check for Cloud Run."""
    return {"status": "ready"}
