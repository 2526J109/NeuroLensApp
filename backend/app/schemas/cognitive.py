from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# This defines the "shape" of the data coming from your phone
class CognitiveTestCreate(BaseModel):
    test_type: str       # e.g., "memory-sequence"
    score: int           # e.g., 120
    level: int           # e.g., 5
    timestamp: Optional[datetime] = None
    
    class Config:
        from_attributes = True