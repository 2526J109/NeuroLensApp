"""
ImprovedQuadStream inference — NB12 model predictor.

Architecture changes from NB09 (TunedQuadStream):
  - Asymmetric encoders: spiral streams (S1, S2) use hidden=6, embed=4
                         wave streams  (S3, S4) use hidden=4, embed=3
  - 4 learned sigmoid scalar stream gates (one per stream)
  - Dropout reduced to 0.35 (more active neurons: ≈3.9 vs ≈1.6 in NB09)
  - Fusion: fused_dim=14 → hidden=6 → 1  (was 12→4→1)
  - Total parameters: 339  (NB09: 237)

LOOCV results (58 subjects):
  Accuracy=94.83%  Recall=92.86%  Specificity=96.67%  AUC=98.45%  Composite=0.9550

Expected model files (place in the same directory as this file):
  quadstream_improved_final.pth      — model weights
  quadstream_improved_scalers.pkl    — 4 StandardScalers (one per stream)
  quadstream_improved_config.json    — architecture config (reference)

MC Dropout uncertainty:
  Pass mc_dropout=True to predict_improved_quadstream_risk() to run 200 stochastic
  forward passes. Returns extra keys: "uncertainty" (std) and "is_borderline" (std>0.15).
"""

import logging
import os
import pickle
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

_DIR          = os.path.dirname(__file__)
_MODEL_PATH   = os.path.join(_DIR, "quadstream_improved_final.pth")
_SCALERS_PATH = os.path.join(_DIR, "quadstream_improved_scalers.pkl")

# MC Dropout: number of stochastic forward passes
_MC_SAMPLES = 200
# Subjects with uncertainty std > this threshold are flagged as borderline
_BORDERLINE_STD = 0.15

# ── Lazy-loaded singletons ────────────────────────────────────────────────────
_model:   Optional[Any] = None
_scalers: Optional[List[Any]] = None
_loaded:  bool = False


# ── Model definition — must exactly match NB12 ───────────────────────────────

def _build_model() -> Any:
    """Reconstruct ImprovedQuadStream architecture from NB12."""
    import torch
    import torch.nn as nn

    class StreamEncoder(nn.Module):
        def __init__(self, in_dim: int, hidden: int, embed_dim: int, dropout: float):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(in_dim, hidden),
                nn.BatchNorm1d(hidden, momentum=0.1),
                nn.ELU(),
                nn.Dropout(dropout),
                nn.Linear(hidden, embed_dim),
                nn.ELU(),
            )

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            return self.net(x)

    class ImprovedQuadStream(nn.Module):
        """
        Asymmetric 4-stream PD classifier with learned stream gates.
          spiral_hidden=6, spiral_embed=4  (S1 + S2)
          wave_hidden=4,   wave_embed=3    (S3 + S4)
          fusion: 14 → 6 → 1
          dropout=0.35
          339 trainable parameters
        """
        def __init__(
            self,
            dims=(3, 5, 3, 5),
            spiral_hidden: int = 6,
            wave_hidden: int   = 4,
            spiral_embed: int  = 4,
            wave_embed: int    = 3,
            fusion_hidden: int = 6,
            dropout: float     = 0.35,
        ):
            super().__init__()
            self.enc_s1 = StreamEncoder(dims[0], spiral_hidden, spiral_embed, dropout)
            self.enc_s2 = StreamEncoder(dims[1], spiral_hidden, spiral_embed, dropout)
            self.enc_s3 = StreamEncoder(dims[2], wave_hidden,   wave_embed,   dropout)
            self.enc_s4 = StreamEncoder(dims[3], wave_hidden,   wave_embed,   dropout)

            # 4 independent sigmoid scalar gates — logit=0 → gate=0.5 at init
            self.stream_gate_logits = nn.Parameter(torch.zeros(4))

            fused_dim = 2 * spiral_embed + 2 * wave_embed   # 14
            self.fusion = nn.Sequential(
                nn.Linear(fused_dim, fusion_hidden),
                nn.BatchNorm1d(fusion_hidden, momentum=0.1),
                nn.ELU(),
                nn.Dropout(dropout),
                nn.Linear(fusion_hidden, 1),
            )

        def stream_weights(self) -> "torch.Tensor":
            return torch.sigmoid(self.stream_gate_logits).detach()

        def forward(self, s1, s2, s3, s4):
            e1 = self.enc_s1(s1)
            e2 = self.enc_s2(s2)
            e3 = self.enc_s3(s3)
            e4 = self.enc_s4(s4)

            gates = torch.sigmoid(self.stream_gate_logits)   # [4]
            e1, e2, e3, e4 = (
                e1 * gates[0],
                e2 * gates[1],
                e3 * gates[2],
                e4 * gates[3],
            )

            fused = torch.cat([e1, e2, e3, e4], dim=-1)      # [N, 14]
            return self.fusion(fused).squeeze(-1)             # [N]

    return ImprovedQuadStream


# ── Loader ────────────────────────────────────────────────────────────────────

def _load() -> bool:
    """Load model + scalers once; cache in module-level singletons."""
    global _model, _scalers, _loaded
    if _loaded:
        return _model is not None

    _loaded = True

    if not os.path.exists(_MODEL_PATH):
        logger.warning(
            "[ImprovedQuadStream] %s not found — predictor inactive. "
            "Download quadstream_improved_final.pth from Google Drive (NB12).",
            _MODEL_PATH,
        )
        return False

    if not os.path.exists(_SCALERS_PATH):
        logger.warning(
            "[ImprovedQuadStream] %s not found — predictor inactive. "
            "Download quadstream_improved_scalers.pkl from Google Drive (NB12).",
            _SCALERS_PATH,
        )
        return False

    try:
        import torch

        ImprovedQuadStream = _build_model()
        checkpoint = torch.load(_MODEL_PATH, map_location="cpu", weights_only=False)
        model = ImprovedQuadStream()
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        _model = model

        gates = model.stream_weights().tolist()
        logger.info(
            "[ImprovedQuadStream] Model loaded — %d params. "
            "Gates: S1=%.3f S2=%.3f S3=%.3f S4=%.3f",
            sum(p.numel() for p in model.parameters()),
            *gates,
        )
    except Exception as exc:
        logger.error("[ImprovedQuadStream] Failed to load model: %s", exc)
        return False

    try:
        with open(_SCALERS_PATH, "rb") as fh:
            bundle = pickle.load(fh)
        _scalers = bundle["scalers"]          # list of 4 StandardScalers
        logger.info(
            "[ImprovedQuadStream] Scalers loaded (%d streams).", len(_scalers)
        )
    except Exception as exc:
        logger.error("[ImprovedQuadStream] Failed to load scalers: %s", exc)
        _model = None
        return False

    return True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _risk_level(risk_pct: float) -> str:
    if risk_pct >= 70:
        return "High"
    if risk_pct >= 40:
        return "Moderate"
    return "Low"


def _activate_mc_dropout(model: Any) -> None:
    """Keep Dropout layers in train mode for MC sampling."""
    import torch.nn as nn
    for m in model.modules():
        if isinstance(m, nn.Dropout):
            m.train()


# ── Public predictor ──────────────────────────────────────────────────────────

def predict_improved_quadstream_risk(
    streams: Dict[str, np.ndarray],
    mc_dropout: bool = False,
) -> Dict[str, Any]:
    """
    Run ImprovedQuadStream (NB12) inference on pre-extracted feature streams.

    Parameters
    ----------
    streams : dict with keys 's1', 's2', 's3', 's4'
        Each value is a 1-D numpy array produced by
        ``quadstream_features.extract_quadstream_features()``.
        s1: (3,) spiral geometric   s2: (5,) spiral kinematic
        s3: (3,) wave geometric     s4: (5,) wave kinematic

    mc_dropout : bool
        If True, run 200 stochastic forward passes for uncertainty estimation.
        Adds "uncertainty" (std of P(PD) across passes) and "is_borderline"
        (True when std > 0.15) to the returned dict.

    Returns
    -------
    dict with keys:
        risk_percentage  — 0-100 (P(PD) × 100)
        risk_level       — "Low" | "Moderate" | "High"
        label            — "Normal" | "Parkinson's Detected"
        confidence       — 0-100 (max(P, 1-P) × 100)
        stream_gates     — dict {S1, S2, S3, S4} gate values (0-1)
        source           — "improved_quadstream_nb12"
        uncertainty      — (only if mc_dropout=True) std across MC passes × 100
        is_borderline    — (only if mc_dropout=True) True when std > 0.15
    """
    if not _load():
        # Files may exist but torch failed to initialise (e.g. missing VC++ runtime).
        # Check logs for '[ImprovedQuadStream] Failed to load'.
        raise RuntimeError(
            "ImprovedQuadStream model unavailable — torch failed to load or model files "
            "are missing. Check logs for '[ImprovedQuadStream] Failed to load'. "
            "Expected files in: " + _DIR
        )

    import torch

    s1_raw = streams["s1"].reshape(1, -1)   # (1, 3)
    s2_raw = streams["s2"].reshape(1, -1)   # (1, 5)
    s3_raw = streams["s3"].reshape(1, -1)   # (1, 3)
    s4_raw = streams["s4"].reshape(1, -1)   # (1, 5)

    # Scale each stream with its own NB12 scaler
    s1_sc = _scalers[0].transform(s1_raw).astype(np.float32)
    s2_sc = _scalers[1].transform(s2_raw).astype(np.float32)
    s3_sc = _scalers[2].transform(s3_raw).astype(np.float32)
    s4_sc = _scalers[3].transform(s4_raw).astype(np.float32)

    t1 = torch.from_numpy(s1_sc)
    t2 = torch.from_numpy(s2_sc)
    t3 = torch.from_numpy(s3_sc)
    t4 = torch.from_numpy(s4_sc)

    # ── Point prediction ─────────────────────────────────────────────────────
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
        "[ImprovedQuadStream] logit=%.4f  P(PD)=%.4f  risk_pct=%.2f  "
        "gates=[%.3f %.3f %.3f %.3f]",
        logit.item(), prob, risk_pct, *gates_raw,
    )

    result: Dict[str, Any] = {
        "risk_percentage": risk_pct,
        "risk_level":      _risk_level(risk_pct),
        "label":           label,
        "confidence":      conf_pct,
        "stream_gates":    stream_gates,
        "source":          "improved_quadstream_nb12",
    }

    # ── MC Dropout uncertainty (optional) ────────────────────────────────────
    if mc_dropout:
        _activate_mc_dropout(_model)
        with torch.no_grad():
            samples = torch.stack(
                [torch.sigmoid(_model(t1, t2, t3, t4)) for _ in range(_MC_SAMPLES)],
                dim=0,
            )
        _model.eval()   # restore eval mode

        mc_mean = samples.mean().item()
        mc_std  = samples.std().item()

        # Use MC mean as the definitive probability (smoother than single pass)
        mc_risk_pct  = round(mc_mean * 100, 2)
        uncertainty  = round(mc_std * 100, 2)
        is_borderline = mc_std > _BORDERLINE_STD

        result["risk_percentage"] = mc_risk_pct
        result["risk_level"]      = _risk_level(mc_risk_pct)
        result["label"]           = "Parkinson's Detected" if mc_risk_pct >= 50 else "Normal"
        result["confidence"]      = round(max(mc_mean, 1.0 - mc_mean) * 100, 2)
        result["uncertainty"]     = uncertainty
        result["is_borderline"]   = is_borderline

        logger.info(
            "[ImprovedQuadStream] MC Dropout: mean_p=%.4f  std=%.4f  borderline=%s",
            mc_mean, mc_std, is_borderline,
        )

    return result
