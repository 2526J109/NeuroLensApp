"""
MicroQuadStream inference — NB13 model predictor.

Architecture (53 params, no BatchNorm):
  Encoders (all symmetric, embed_dim=2):
    enc_s1: Linear(3,2) + Tanh + Dropout(0.10)
    enc_s2: Linear(5,2) + Tanh + Dropout(0.10)
    enc_s3: Linear(3,2) + Tanh + Dropout(0.10)
    enc_s4: Linear(5,2) + Tanh + Dropout(0.10)
  stream_gate_logits: 4 scalar parameters (sigmoid gates)
  fusion: Linear(8,1)  — no hidden layer, no BatchNorm

LOOCV results (56 subjects):
  Accuracy=89.66%  Recall=89.29%  Specificity=90.00%  AUC=95.36%  Composite=0.9129

Expected model files (place in the same directory as this file):
  micro_quadstream_final.pth     — model weights (from results_nb13/ on Colab)
  micro_quadstream_scalers.pkl   — 4 StandardScalers (one per stream)

Feature input: same 16 absolute-scale features as NB09/NB12
  s1: (3,)  s2: (5,)  s3: (3,)  s4: (5,)
"""

import logging
import os
import pickle
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

_DIR          = os.path.dirname(__file__)
_MODEL_PATH   = os.path.join(_DIR, "micro_quadstream_final.pth")
_SCALERS_PATH = os.path.join(_DIR, "micro_quadstream_scalers.pkl")

_MC_SAMPLES     = 200
_BORDERLINE_STD = 0.15

_model:   Optional[Any] = None
_scalers: Optional[List[Any]] = None
_loaded:  bool = False


def _build_model() -> Any:
    import torch
    import torch.nn as nn

    class StreamEncoder(nn.Module):
        def __init__(self, in_dim: int, dropout: float = 0.10):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(in_dim, 2),
                nn.Tanh(),
                nn.Dropout(dropout),
            )

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            return self.net(x)

    class MicroQuadStream(nn.Module):
        """53-parameter PD classifier, no BatchNorm, Tanh encoders, linear fusion."""
        def __init__(self, dims=(3, 5, 3, 5), dropout: float = 0.10):
            super().__init__()
            self.enc_s1 = StreamEncoder(dims[0], dropout)
            self.enc_s2 = StreamEncoder(dims[1], dropout)
            self.enc_s3 = StreamEncoder(dims[2], dropout)
            self.enc_s4 = StreamEncoder(dims[3], dropout)
            self.stream_gate_logits = nn.Parameter(torch.zeros(4))
            self.fusion = nn.Linear(8, 1)   # fused_dim = 4×2 = 8

        def stream_weights(self) -> "torch.Tensor":
            return torch.sigmoid(self.stream_gate_logits).detach()

        def forward(self, s1, s2, s3, s4):
            e1 = self.enc_s1(s1)
            e2 = self.enc_s2(s2)
            e3 = self.enc_s3(s3)
            e4 = self.enc_s4(s4)

            gates = torch.sigmoid(self.stream_gate_logits)
            e1, e2, e3, e4 = (
                e1 * gates[0], e2 * gates[1],
                e3 * gates[2], e4 * gates[3],
            )
            fused = torch.cat([e1, e2, e3, e4], dim=-1)
            return self.fusion(fused).squeeze(-1)

    return MicroQuadStream


def _load() -> bool:
    global _model, _scalers, _loaded
    if _loaded:
        return _model is not None
    _loaded = True

    for path, label in [(_MODEL_PATH, "pth"), (_SCALERS_PATH, "pkl")]:
        if not os.path.exists(path):
            logger.warning(
                "[MicroQuadStream] %s not found — predictor inactive. "
                "Copy micro_quadstream_final.%s from Colab results_nb13/.",
                path, label,
            )
            return False

    try:
        import torch
        MicroQuadStream = _build_model()
        checkpoint = torch.load(_MODEL_PATH, map_location="cpu", weights_only=False)
        model = MicroQuadStream()
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        _model = model
        logger.info(
            "[MicroQuadStream] Model loaded — %d params.",
            sum(p.numel() for p in model.parameters()),
        )
    except Exception as exc:
        logger.error("[MicroQuadStream] Failed to load model: %s", exc)
        return False

    try:
        with open(_SCALERS_PATH, "rb") as fh:
            bundle = pickle.load(fh)
        _scalers = bundle["scalers"]
        logger.info("[MicroQuadStream] Scalers loaded (%d streams).", len(_scalers))
    except Exception as exc:
        logger.error("[MicroQuadStream] Failed to load scalers: %s", exc)
        _model = None
        return False

    return True


def _risk_level(risk_pct: float) -> str:
    if risk_pct >= 70:
        return "High"
    if risk_pct >= 40:
        return "Moderate"
    return "Low"


def _activate_mc_dropout(model: Any) -> None:
    import torch.nn as nn
    for m in model.modules():
        if isinstance(m, nn.Dropout):
            m.train()


def predict_micro_quadstream_risk(
    streams: Dict[str, np.ndarray],
    mc_dropout: bool = False,
) -> Dict[str, Any]:
    """
    Run MicroQuadStream (NB13) inference on pre-extracted feature streams.

    Parameters
    ----------
    streams : dict with keys 's1', 's2', 's3', 's4'
        Produced by quadstream_features.extract_quadstream_features().
        s1:(3,) s2:(5,) s3:(3,) s4:(5,)

    Returns
    -------
    dict: risk_percentage, risk_level, label, confidence, stream_gates, source
    Plus uncertainty / is_borderline when mc_dropout=True.
    """
    if not _load():
        raise RuntimeError(
            "MicroQuadStream model unavailable — model files missing. "
            "Copy micro_quadstream_final.pth + micro_quadstream_scalers.pkl "
            "from Colab results_nb13/ into: " + _DIR
        )

    import torch

    s1_sc = _scalers[0].transform(streams["s1"].reshape(1, -1)).astype(np.float32)
    s2_sc = _scalers[1].transform(streams["s2"].reshape(1, -1)).astype(np.float32)
    s3_sc = _scalers[2].transform(streams["s3"].reshape(1, -1)).astype(np.float32)
    s4_sc = _scalers[3].transform(streams["s4"].reshape(1, -1)).astype(np.float32)

    t1 = torch.from_numpy(s1_sc)
    t2 = torch.from_numpy(s2_sc)
    t3 = torch.from_numpy(s3_sc)
    t4 = torch.from_numpy(s4_sc)

    _model.eval()
    with torch.inference_mode():
        logit = _model(t1, t2, t3, t4)
        prob  = torch.sigmoid(logit).item()

    risk_pct = round(prob * 100, 2)
    conf_pct = round(max(prob, 1.0 - prob) * 100, 2)
    label    = "Parkinson's Detected" if risk_pct >= 50 else "Normal"

    gates_raw = _model.stream_weights().tolist()
    stream_gates = {
        "S1_spiral_geom": round(gates_raw[0], 4),
        "S2_spiral_kin":  round(gates_raw[1], 4),
        "S3_wave_geom":   round(gates_raw[2], 4),
        "S4_wave_kin":    round(gates_raw[3], 4),
    }

    logger.info(
        "[MicroQuadStream] logit=%.4f  P(PD)=%.4f  risk_pct=%.2f",
        logit.item(), prob, risk_pct,
    )

    result: Dict[str, Any] = {
        "risk_percentage": risk_pct,
        "risk_level":      _risk_level(risk_pct),
        "label":           label,
        "confidence":      conf_pct,
        "stream_gates":    stream_gates,
        "source":          "micro_quadstream_nb13",
    }

    if mc_dropout:
        _activate_mc_dropout(_model)
        with torch.no_grad():
            samples = torch.stack(
                [torch.sigmoid(_model(t1, t2, t3, t4)) for _ in range(_MC_SAMPLES)],
                dim=0,
            )
        _model.eval()

        mc_mean = samples.mean().item()
        mc_std  = samples.std().item()
        mc_risk = round(mc_mean * 100, 2)

        result["risk_percentage"] = mc_risk
        result["risk_level"]      = _risk_level(mc_risk)
        result["label"]           = "Parkinson's Detected" if mc_risk >= 50 else "Normal"
        result["confidence"]      = round(max(mc_mean, 1.0 - mc_mean) * 100, 2)
        result["uncertainty"]     = round(mc_std * 100, 2)
        result["is_borderline"]   = mc_std > _BORDERLINE_STD

        logger.info(
            "[MicroQuadStream] MC: mean_p=%.4f  std=%.4f  borderline=%s",
            mc_mean, mc_std, result["is_borderline"],
        )

    return result
