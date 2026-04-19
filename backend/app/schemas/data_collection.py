from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class ParticipantCreate(BaseModel):
    participant_code: str          # e.g. "PD001" or "HC003" — assigned by admin
    age: int
    gender: str                    # "male" | "female" | "other"
    handedness: str                # "right" | "left" | "ambidextrous"
    pd_status: str                 # "pd" | "control"
    updrs_score: Optional[float] = None
    years_since_diagnosis: Optional[float] = None
    medication_status: Optional[str] = None
    notes: Optional[str] = None


class ParticipantResponse(BaseModel):
    id: str
    admin_uid: str
    participant_code: str
    age: int
    gender: str
    handedness: str
    pd_status: str
    updrs_score: Optional[float] = None
    years_since_diagnosis: Optional[float] = None
    medication_status: Optional[str] = None
    notes: Optional[str] = None
    tasks_completed: List[str] = []
    created_at: str


class RawDrawingData(BaseModel):
    participant_id: str
    session_id: Optional[str] = None
    spiral_points: Optional[List[Dict[str, Any]]] = None  # [{x, y, timestamp}, ...]
    wave_points: Optional[List[Dict[str, Any]]] = None
    pixel_ratio: Optional[float] = 1.0
    model_key: Optional[str] = None    # which model was used for prediction
    prediction_result: Optional[Dict[str, Any]] = None


class RawCognitiveData(BaseModel):
    participant_id: str
    session_id: Optional[str] = None
    age: int
    sdmt_score: float
    tmt_a_score: float
    lns_score: float
    sex: Optional[int] = None          # 0 = female, 1 = male
    family_history: Optional[int] = None
    rem_sleep: Optional[int] = None
    prediction_result: Optional[Dict[str, Any]] = None


class RawVoiceData(BaseModel):
    participant_id: str
    session_id: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    prediction_result: Optional[Dict[str, Any]] = None


class RawWearableData(BaseModel):
    participant_id: str
    session_id: Optional[str] = None
    sensor_readings: Optional[Dict[str, Any]] = None
    prediction_result: Optional[Dict[str, Any]] = None
