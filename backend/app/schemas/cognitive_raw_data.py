from pydantic import BaseModel
from typing import Optional, List


class TmtTapRecord(BaseModel):
    dotNumber: int
    correct: bool
    rt: float        # reaction time in ms
    timestamp: int   # epoch ms


class SdmtTrialRecord(BaseModel):
    trial: int
    symbolIndex: int
    response: int
    correct: bool
    rt: float        # reaction time in ms
    timestamp: int   # epoch ms


class CognitiveRawDataRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    timestamp: int                          # epoch ms — when the user submitted
    age_at_visit: float
    SEX: int                                # 1=Male, 0=Female
    fampd: int                              # 0=No, 1=Yes, 2=Unknown
    rem: int                                # 0=No, 1=Yes
    sdmtotal: float                         # total correct in SDMT (scaled)
    tmt_a: Optional[float] = None           # seconds — None if not finished
    tmt_taps: List[TmtTapRecord]            # raw TMT per-tap data
    sdmt_trials: List[SdmtTrialRecord]      # raw SDMT per-trial data
    model_risk_probability: float           # what the app showed the user
    model_percentile_rank: int              # what the app showed the user
