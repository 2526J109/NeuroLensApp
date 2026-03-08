from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class DrawingPoint(BaseModel):
    x: float = Field(..., description="X coordinate")
    y: float = Field(..., description="Y coordinate")
    timestamp: float = Field(..., description="Timestamp in milliseconds from start")

class DrawingData(BaseModel):
    test_type: Literal['spiral', 'wave'] = Field(..., description="Type of drawing test")
    timestamp: str = Field(..., description="ISO 8601 timestamp when test was completed")
    total_points: int = Field(..., description="Total number of points captured")
    duration_ms: float = Field(..., description="Drawing duration in milliseconds")
    points: List[DrawingPoint] = Field(..., description="List of drawing points")

class DrawingAnalysisRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="User ID for tracking")
    session_id: Optional[str] = Field(None, description="Session ID for grouping tests")
    spiral_data: Optional[DrawingData] = Field(None, description="Spiral test data")
    wave_data: Optional[DrawingData] = Field(None, description="Wave test data")

class RiskMetrics(BaseModel):
    smoothness: float = Field(..., description="Drawing smoothness score (0-100)")
    speed: float = Field(..., description="Drawing speed score (0-100)")
    tremor: float = Field(..., description="Tremor indicator score (0-100)")

class DrawingAnalysisResponse(BaseModel):
    risk_percentage: float = Field(..., description="Overall risk percentage (0-100)")
    risk_level: Literal['Low', 'Moderate', 'High'] = Field(..., description="Risk level category")
    confidence: float = Field(..., description="Prediction confidence (0-100)")
    metrics: RiskMetrics = Field(..., description="Detailed analysis metrics")
    model_version: str = Field(default="1.0", description="Model version used for prediction")
    message: Optional[str] = Field(None, description="Additional information or warnings")
