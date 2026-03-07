from pydantic import BaseModel
from typing import Optional, List

class CognitiveAnalysisRequest(BaseModel):
    user_id: str
    tmt_a: Optional[float] = None   # seconds — None if user didn't finish
    sdmtotal: float                  # total correct in SDMT task
    dvs_lns: Optional[float] = None  # not in app — will be imputed
    age_at_visit: float
    SEX: int                         # 1=Male, 0=Female
    fampd: int                       # 0=No, 1=Yes, 2=Unknown
    rem: int                         # 0=No, 1=Yes

class ContributingFactor(BaseModel):
    feature: str       # human-readable name e.g. "Processing Speed"
    direction: str     # "typical" or "atypical"
    shap_value: float  # raw SHAP value — positive = increases risk

class CognitiveAnalysisResponse(BaseModel):
    module: str = "cognitive"
    risk_probability: float
    percentile_rank: int
    contributing_factors: List[ContributingFactor]  # top 3 by |SHAP|
    status: str = "success"