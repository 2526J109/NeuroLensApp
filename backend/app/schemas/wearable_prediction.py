from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class StepResult(BaseModel):
    ratio: str
    result: str

class WearablePredictionRequest(BaseModel):
    user_id: str
    global_verdict: str
    probability_score: float
    step_results: Dict[str, StepResult]
    
class WearablePredictionResponse(BaseModel):
    id: str
    user_id: str
    global_verdict: str
    probability_score: float
    step_results: Dict[str, StepResult]
    created_at: str
