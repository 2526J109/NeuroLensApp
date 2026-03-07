from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
from pydantic import BaseModel
import pandas as pd
from app.models.parkinsons_multimodal_predictor import ParkinsonsMultimodalPredictor
from app.services.voice_feature_extractor import (
    extract_acoustic_features,
    extract_linguistic_features,
)
import os
import tempfile
import shutil
import logging
import warnings

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../models/parkinsons_multimodal_fused_model.joblib')

_predictor: ParkinsonsMultimodalPredictor | None = None


def get_predictor() -> ParkinsonsMultimodalPredictor:
    global _predictor
    if _predictor is None:
        try:
            _predictor = ParkinsonsMultimodalPredictor(MODEL_PATH)
            logger.info("Multimodal predictor loaded from %s", MODEL_PATH)
        except Exception as e:
            logger.error("Failed to load multimodal predictor: %s", e)
            raise HTTPException(status_code=500, detail=f"Model could not be loaded: {e}")
    return _predictor


# ── Keep existing JSON endpoint ──────────────────────────────────────────────

class PredictionRequest(BaseModel):
    acoustic_data: dict
    linguistic_data: dict


@router.post("/predict-multimodal")
def predict_parkinsons(request: PredictionRequest):
    predictor = get_predictor()
    try:
        df_acou = pd.DataFrame([request.acoustic_data])
        df_lang = pd.DataFrame([request.linguistic_data])
        result = predictor.predict_risk(df_acou, df_lang)
        return result
    except Exception as e:
        logger.error("Prediction error: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


# ── New audio-upload endpoint ────────────────────────────────────────────────

# Lazy-load Whisper so we don't slow down startup
_whisper_model = None


def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        try:
            import whisper
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                _whisper_model = whisper.load_model("tiny")   # fast & lightweight
            logger.info("Whisper model loaded (tiny)")
        except Exception as e:
            logger.warning("Whisper not available: %s — linguistic features will use fallback", e)
    return _whisper_model


@router.post("/predict-multimodal-audio")
async def predict_from_audio(
    audio_0: Optional[UploadFile] = File(None, description="Recording for prompt 1"),
    audio_1: Optional[UploadFile] = File(None, description="Recording for prompt 2 (optional)"),
):
    """
    Accept one or two audio recordings, extract acoustic + linguistic features,
    and return a Parkinson's risk prediction.
    """
    predictor = get_predictor()
    tmp_dir = tempfile.mkdtemp()
    try:
        # ── Save uploaded files ──────────────────────────────────────────────
        paths = []
        for idx, upload in enumerate([audio_0, audio_1]):
            if upload is None:
                continue
            # Skip truly empty uploads (some clients send empty parts)
            content = await upload.read()
            if not content:
                logger.warning("Received empty file for audio_%d, skipping", idx)
                continue
            suffix = os.path.splitext(upload.filename or "audio.m4a")[1] or ".m4a"
            dest = os.path.join(tmp_dir, f"audio_{idx}{suffix}")
            with open(dest, "wb") as f:
                f.write(content)
            paths.append(dest)
            logger.info("Saved audio_%d → %s (%d bytes)", idx, dest, len(content))

        primary_audio = paths[0] if paths else None

        # ── Acoustic features (librosa) ──────────────────────────────────────
        acoustic_feats = extract_acoustic_features(primary_audio) if primary_audio else None
        if acoustic_feats is None:
            from app.services.voice_feature_extractor import _fallback_acoustic
            acoustic_feats = _fallback_acoustic()
            logger.warning("No valid audio received — using fallback acoustic features")
        logger.info("Acoustic features: %s", acoustic_feats)


        # ── Transcribe with Whisper ──────────────────────────────────────────
        transcript = ""
        whisper_model = _get_whisper()
        if whisper_model is not None:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    # Transcribe all available recordings and concatenate
                    for p in paths:
                        result = whisper_model.transcribe(p, fp16=False)
                        transcript += " " + result.get("text", "")
                transcript = transcript.strip()
                logger.info("Whisper transcript: %s", transcript[:120])
            except Exception as e:
                logger.warning("Whisper transcription failed: %s", e)

        # ── Linguistic features (NLP on transcript) ──────────────────────────
        linguistic_feats = extract_linguistic_features(transcript, audio_path=primary_audio)
        logger.info("Linguistic features extracted: %s", linguistic_feats)

        # ── Predict ──────────────────────────────────────────────────────────
        df_acou = pd.DataFrame([acoustic_feats])
        df_lang = pd.DataFrame([linguistic_feats])
        return predictor.predict_risk(df_acou, df_lang)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Audio prediction error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

