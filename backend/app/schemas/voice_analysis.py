from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class VoiceAnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RecordingInfo(BaseModel):
    prompt_id: int
    duration: float
    uri: str


class VoiceAnalysisRequest(BaseModel):
    recordings: List[RecordingInfo]
    session_id: Optional[str] = None


class VoiceAnalysisResult(BaseModel):
    percentage: float
    status: str  # 'good' or 'warning'
    description: str
    details: Optional[dict] = None


class VoiceAnalysisResponse(BaseModel):
    session_id: str
    status: VoiceAnalysisStatus
    result: Optional[VoiceAnalysisResult] = None
    error: Optional[str] = None
    created_at: Optional[str] = None

