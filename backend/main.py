from contextlib import asynccontextmanager
from app.core.firebase import initialize_firebase
initialize_firebase()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import voice_analysis
from app.routes import auth
from app.routes import drawing_prediction
from app.routes import voice_multimodal
from app.routes import cognitive_analysis    
from app.routes import wearable_prediction
from app.routes import multimodal_result
from app.routes import admin as admin_routes
from app.core.config import settings
import logging
import uvicorn

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: eagerly load all heavy ML models (Whisper + multimodal predictor)
    so the first real request is never blocked by model loading.
    Cloud Run will mark the container as ready only after startup completes,
    which prevents 503s caused by cold-start timeouts.
    """
    logger.info("=== NeuroLens API startup: warming up ML models ===")

    # 1. Multimodal predictor (joblib sklearn models)
    try:
        voice_multimodal.get_predictor()
        logger.info("Multimodal predictor — ready")
    except Exception as e:
        logger.error("Multimodal predictor failed to load at startup: %s", e)

    # 2. Whisper speech-to-text (tiny model, ~75 MB)
    try:
        voice_multimodal._load_whisper_eagerly()
        logger.info("Whisper model — ready")
    except Exception as e:
        logger.error("Whisper failed to load at startup: %s", e)

    # 3. TunedQuadStream drawing model (torch, 237 params)
    try:
        from app.models.quadstream_predictor import _load
        if _load():
            logger.info("QuadStream model — ready")
        else:
            logger.warning("QuadStream model — .pth files not found, fallback to LR active")
    except Exception as e:
        logger.error("QuadStream failed to load at startup: %s", e)

    logger.info("=== Startup complete — ready to serve requests ===")
    yield
    # (shutdown logic can go here if needed)
    logger.info("=== NeuroLens API shutting down ===")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(voice_analysis.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(drawing_prediction.router, prefix=settings.API_V1_STR)
app.include_router(voice_multimodal.router, prefix=settings.API_V1_STR)
app.include_router(cognitive_analysis.router, prefix=settings.API_V1_STR) 
app.include_router(wearable_prediction.router, prefix=settings.API_V1_STR)
app.include_router(multimodal_result.router, prefix=settings.API_V1_STR)
app.include_router(admin_routes.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {"message": "Welcome to NeuroLens API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
