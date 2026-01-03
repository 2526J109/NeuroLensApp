from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import uuid
import json
from datetime import datetime

from ..schemas.voice_analysis import (
    VoiceAnalysisRequest,
    VoiceAnalysisResponse,
    VoiceAnalysisStatus,
    VoiceAnalysisResult,
    RecordingInfo
)
from ..services.voice_analysis_service import VoiceAnalysisService

router = APIRouter(prefix="/api/voice-analysis", tags=["voice-analysis"])

# Initialize service
voice_service = VoiceAnalysisService()


@router.post("/analyze", response_model=VoiceAnalysisResponse)
async def analyze_voice_recordings(request: VoiceAnalysisRequest):
    """
    Analyze voice recordings and generate predictions.
    
    This endpoint accepts recording metadata and processes them through
    the voice analysis model to generate assessment results.
    """
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Convert recordings to dict format for service
        recordings_data = [
            {
                'prompt_id': rec.prompt_id,
                'duration': rec.duration,
                'uri': rec.uri
            }
            for rec in request.recordings
        ]
        
        # Analyze recordings
        result_dict = await voice_service.analyze_recordings(
            recordings_data,
            session_id
        )
        
        # Convert dict to VoiceAnalysisResult schema
        result = VoiceAnalysisResult(
            percentage=result_dict['percentage'],
            status=result_dict['status'],
            description=result_dict['description'],
            details=result_dict.get('details')
        )
        
        return VoiceAnalysisResponse(
            session_id=session_id,
            status=VoiceAnalysisStatus.COMPLETED,
            result=result,
            created_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing voice recordings: {str(e)}"
        )


@router.get("/results/{session_id}", response_model=VoiceAnalysisResponse)
async def get_voice_analysis_results(session_id: str):
    """
    Retrieve voice analysis results for a given session.
    """
    try:
        stored_result = voice_service.get_result(session_id)
        
        if not stored_result:
            raise HTTPException(
                status_code=404,
                detail=f"No results found for session ID: {session_id}"
            )
        
        # Convert stored result dict to VoiceAnalysisResult schema
        result_dict = stored_result.get('result')
        result = None
        if result_dict:
            result = VoiceAnalysisResult(
                percentage=result_dict['percentage'],
                status=result_dict['status'],
                description=result_dict['description'],
                details=result_dict.get('details')
            )
        
        return VoiceAnalysisResponse(
            session_id=session_id,
            status=VoiceAnalysisStatus.COMPLETED,
            result=result,
            created_at=stored_result.get('created_at')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving results: {str(e)}"
        )


@router.post("/upload")
async def upload_voice_recording(
    file: UploadFile = File(...),
    prompt_id: int = Form(...),
    duration: float = Form(...),
    session_id: Optional[str] = Form(None)
):
    """
    Upload a voice recording file.
    
    This endpoint can be used to upload actual audio files if needed.
    Currently, the frontend sends URIs, but this endpoint is available
    for direct file uploads.
    """
    try:
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # In a real implementation, you would:
        # 1. Save the file to storage (local filesystem, S3, etc.)
        # 2. Process the audio file
        # 3. Extract features
        # 4. Return file path/URI
        
        # For now, return success with session info
        return JSONResponse({
            "session_id": session_id,
            "prompt_id": prompt_id,
            "filename": file.filename,
            "message": "File uploaded successfully"
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )

