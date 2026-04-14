"""
TunedQuadStream inference — production predictor for NB09 saved model.

Expected model files (place all 3 in the same directory as this file):
  quadstream_tuned_final.pth     — model weights (torch.save checkpoint dict)
  quadstream_tuned_scalers.pkl   — 4 StandardScaler objects, one per stream
  quadstream_tuned_config.json   — architecture config (for reference / validation)

Architecture (hidden=4, embed=3, fusion_hidden=4, dropout=0.6, ELU) must be
re-declared here so PyTorch can load the state_dict correctly.
"""

import logging
import os
import pickle
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

_DIR = os.path.dirname(__file__)
_MODEL_PATH   = os.path.join(_DIR, "quadstream_tuned_final.pth")
_SCALERS_PATH = os.path.join(_DIR, "quadstream_tuned_scalers.pkl")

# ── Lazy-loaded singletons ────────────────────────────────────────────────────
_model:   Optional[Any] = None
_scalers: Optional[List[Any]] = None
_loaded:  bool = False


# ── Model class — must exactly match NB09 ────────────────────────────────────

def _build_model() -> Any:
    """Import torch and reconstruct TunedQuadStream architecture."""
    import torch
    import torch.nn as nn

    class StreamEncoder(nn.Module):
        def __init__(self, in_dim: int, hidden: int, out_dim: int, dropout: float):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(in_dim, hidden),
                nn.BatchNorm1d(hidden),
                nn.ELU(),
                nn.Dropout(dropout),
                nn.Linear(hidden, out_dim),
                nn.ELU(),
            )

        def forward(self, x):
            return self.net(x)

    class TunedQuadStream(nn.Module):
        """hidden=4, embed=3, fusion_hidden=4, dropout=0.6, ELU — 237 params."""
        def __init__(self, dims=(3, 5, 3, 5), hidden=4, embed=3,
                     fusion_hidden=4, dropout=0.6):
            super().__init__()
            self.enc1 = StreamEncoder(dims[0], hidden, embed, dropout)
            self.enc2 = StreamEncoder(dims[1], hidden, embed, dropout)
            self.enc3 = StreamEncoder(dims[2], hidden, embed, dropout)
            self.enc4 = StreamEncoder(dims[3], hidden, embed, dropout)
            self.fusion = nn.Sequential(
                nn.Linear(embed * 4, fusion_hidden),
                nn.BatchNorm1d(fusion_hidden),
                nn.ELU(),
                nn.Dropout(dropout),
                nn.Linear(fusion_hidden, 1),
            )

        def forward(self, s1, s2, s3, s4):
            e = torch.cat(
                [self.enc1(s1), self.enc2(s2), self.enc3(s3), self.enc4(s4)],
                dim=1,
            )
            return self.fusion(e)

    return TunedQuadStream


def _load() -> bool:
    """Load model + scalers once; cache in module-level singletons."""
    global _model, _scalers, _loaded
    if _loaded:
        return _model is not None

    _loaded = True

    if not os.path.exists(_MODEL_PATH):
        logger.warning(
            "[QuadStreamPredictor] %s not found — QuadStream predictor inactive.",
            _MODEL_PATH,
        )
        return False

    if not os.path.exists(_SCALERS_PATH):
        logger.warning(
            "[QuadStreamPredictor] %s not found — QuadStream predictor inactive.",
            _SCALERS_PATH,
        )
        return False

    try:
        import torch

        TunedQuadStream = _build_model()
        checkpoint = torch.load(_MODEL_PATH, map_location="cpu", weights_only=False)
        model = TunedQuadStream()
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        _model = model
        logger.info(
            "[QuadStreamPredictor] Model loaded — %d params.",
            sum(p.numel() for p in model.parameters()),
        )
    except Exception as exc:
        logger.error("[QuadStreamPredictor] Failed to load model: %s", exc)
        return False

    try:
        with open(_SCALERS_PATH, "rb") as f:
            bundle = pickle.load(f)
        _scalers = bundle["scalers"]          # list of 4 StandardScalers
        logger.info("[QuadStreamPredictor] Scalers loaded (%d streams).", len(_scalers))
    except Exception as exc:
        logger.error("[QuadStreamPredictor] Failed to load scalers: %s", exc)
        _model = None
        return False

    return True


# ── Risk helpers ──────────────────────────────────────────────────────────────

def _risk_level(risk_pct: float) -> str:
    if risk_pct >= 70:
        return "High"
    if risk_pct >= 40:
        return "Moderate"
    return "Low"


# ── Public predictor ──────────────────────────────────────────────────────────

def predict_quadstream_risk(
    streams: Dict[str, np.ndarray],
) -> Dict[str, Any]:
    """
    Run TunedQuadStream inference on pre-extracted feature streams.

    Parameters
    ----------
    streams : dict with keys 's1', 's2', 's3', 's4'
        Each value is a 1-D numpy array produced by
        ``quadstream_features.extract_quadstream_features()``.

    Returns
    -------
    dict with keys: risk_percentage, risk_level, label, confidence, source
    """
    if not _load():
        raise RuntimeError(
            "TunedQuadStream model files not found. "
            "Download quadstream_tuned_final.pt and quadstream_tuned_scalers.pkl "
            "from Google Colab (NB09) and place them in: " + _DIR
        )

    import torch

    s1_raw = streams["s1"].reshape(1, -1)   # (1, 3)
    s2_raw = streams["s2"].reshape(1, -1)   # (1, 5)
    s3_raw = streams["s3"].reshape(1, -1)   # (1, 3)
    s4_raw = streams["s4"].reshape(1, -1)   # (1, 5)

    # Scale each stream with its own scaler (fitted on full training set in NB09)
    s1_sc = _scalers[0].transform(s1_raw).astype(np.float32)
    s2_sc = _scalers[1].transform(s2_raw).astype(np.float32)
    s3_sc = _scalers[2].transform(s3_raw).astype(np.float32)
    s4_sc = _scalers[3].transform(s4_raw).astype(np.float32)

    t1 = torch.from_numpy(s1_sc)
    t2 = torch.from_numpy(s2_sc)
    t3 = torch.from_numpy(s3_sc)
    t4 = torch.from_numpy(s4_sc)

    with torch.inference_mode():
        logit = _model(t1, t2, t3, t4)           # (1, 1) raw logit
        prob  = torch.sigmoid(logit).item()       # P(Parkinson's)

    risk_pct = round(prob * 100, 2)
    conf_pct = round(max(prob, 1.0 - prob) * 100, 2)
    label    = "Parkinson's Detected" if risk_pct >= 50 else "Normal"

    logger.info(
        "[QuadStreamPredictor] logit=%.4f  P(PD)=%.4f  risk_pct=%.2f",
        logit.item(), prob, risk_pct,
    )

    return {
        "risk_percentage": risk_pct,
        "risk_level":      _risk_level(risk_pct),
        "label":           label,
        "confidence":      conf_pct,
        "source":          "quadstream_tuned",
    }
