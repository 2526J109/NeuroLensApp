"""
NB20 NormQuadStream inference — scale-normalised QuadStream, no BatchNorm.

Architecture (~300 params depending on Colab tuning, no BatchNorm anywhere):
  Asymmetric encoders using scale-normalised 14 features:
    enc_s1: Linear(3, geom_hidden) → ELU → Dropout → Linear(geom_hidden, geom_embed) → ELU
    enc_s2: Linear(4, kin_hidden)  → ELU → Dropout → Linear(kin_hidden,  kin_embed)  → ELU
    enc_s3: same as s1
    enc_s4: same as s2
  stream_gate_logits: 4 sigmoid scalars
  fusion: Linear(2*geom_embed + 2*kin_embed → fusion_hidden) → ELU → Dropout → Linear(→1)

Stream dims: (3, 4, 3, 4) — NB20-specific (vs NB09/NB12 which use (3,5,3,5))
  s1:(3,)  s2:(4,)  s3:(3,)  s4:(4,)

Expected model files (same directory as this file):
  nb20_normquadstream_final.pth     — model weights (from Colab results_nb20/)
  nb20_normquadstream_scalers.pkl   — 4 StandardScalers (one per stream)
  nb20_normquadstream_config.json   — architecture config

Note: NB20 has not been run on Colab yet — predictor scaffolded for when
model files become available. Config values below match NB20 MODEL_CFG.
"""

import logging
import os
import pickle
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

_DIR          = os.path.dirname(__file__)
_MODEL_PATH   = os.path.join(_DIR, "nb20_normquadstream_final.pth")
_SCALERS_PATH = os.path.join(_DIR, "nb20_normquadstream_scalers.pkl")
_CONFIG_PATH  = os.path.join(_DIR, "nb20_normquadstream_config.json")

_MC_SAMPLES     = 200
_BORDERLINE_STD = 0.15

_model:   Optional[Any] = None
_scalers: Optional[List[Any]] = None
_config:  Optional[Dict[str, Any]] = None
_loaded:  bool = False


def _load_config() -> Dict[str, Any]:
    """Load architecture config from JSON, or use NB20 defaults."""
    defaults = {
        "geom_hidden": 6, "geom_embed": 4,
        "kin_hidden":  6, "kin_embed":  4,
        "fusion_hidden": 6, "dropout": 0.25,
        "stream_dims": [3, 4, 3, 4],
    }
    if os.path.exists(_CONFIG_PATH):
        import json
        try:
            with open(_CONFIG_PATH) as fh:
                cfg = json.load(fh)
            defaults.update(cfg)
        except Exception:
            pass
    return defaults


def _build_model(cfg: Dict[str, Any]) -> Any:
    import torch
    import torch.nn as nn

    class StreamEncoder(nn.Module):
        def __init__(self, in_dim: int, hidden: int, embed_dim: int, dropout: float):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(in_dim, hidden),
                nn.ELU(),
                nn.Dropout(dropout),
                nn.Linear(hidden, embed_dim),
                nn.ELU(),
            )

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            return self.net(x)

    class NormQuadStream(nn.Module):
        """
        QuadStream with scale-normalised inputs and no BatchNorm.
        Stream dims: (3, 4, 3, 4) matching NB19/NB20 14-feature set.
        """
        def __init__(
            self,
            dims: Tuple[int, int, int, int] = (3, 4, 3, 4),
            geom_hidden: int = 6, geom_embed: int = 4,
            kin_hidden:  int = 6, kin_embed:  int = 4,
            fusion_hidden: int = 6, dropout: float = 0.25,
        ):
            super().__init__()
            self.enc_s1 = StreamEncoder(dims[0], geom_hidden, geom_embed, dropout)
            self.enc_s2 = StreamEncoder(dims[1], kin_hidden,  kin_embed,  dropout)
            self.enc_s3 = StreamEncoder(dims[2], geom_hidden, geom_embed, dropout)
            self.enc_s4 = StreamEncoder(dims[3], kin_hidden,  kin_embed,  dropout)

            self.stream_gate_logits = nn.Parameter(torch.zeros(4))

            fused_dim = 2 * geom_embed + 2 * kin_embed
            self.fusion = nn.Sequential(
                nn.Linear(fused_dim, fusion_hidden),
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
            gates = torch.sigmoid(self.stream_gate_logits)
            e1, e2, e3, e4 = (
                e1 * gates[0], e2 * gates[1],
                e3 * gates[2], e4 * gates[3],
            )
            fused = torch.cat([e1, e2, e3, e4], dim=-1)
            return self.fusion(fused).squeeze(-1)

    dims = tuple(cfg["stream_dims"])
    return NormQuadStream(
        dims=dims,
        geom_hidden=cfg["geom_hidden"], geom_embed=cfg["geom_embed"],
        kin_hidden=cfg["kin_hidden"],   kin_embed=cfg["kin_embed"],
        fusion_hidden=cfg["fusion_hidden"], dropout=cfg["dropout"],
    )


def _load() -> bool:
    global _model, _scalers, _config, _loaded
    if _loaded:
        return _model is not None
    _loaded = True

    for path, label in [(_MODEL_PATH, "pth"), (_SCALERS_PATH, "pkl")]:
        if not os.path.exists(path):
            logger.warning(
                "[NB20_NormQS] %s not found — predictor inactive. "
                "Run NB20.ipynb on Colab and copy nb20_normquadstream_*.%s here.",
                path, label,
            )
            return False

    _config = _load_config()

    try:
        import torch
        checkpoint = torch.load(_MODEL_PATH, map_location="cpu", weights_only=False)
        model = _build_model(_config)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        _model = model
        n_params = sum(p.numel() for p in model.parameters())
        gates = model.stream_weights().tolist()
        logger.info(
            "[NB20_NormQS] Model loaded — %d params.  Gates: S1=%.3f S2=%.3f S3=%.3f S4=%.3f",
            n_params, *gates,
        )
    except Exception as exc:
        logger.error("[NB20_NormQS] Failed to load model: %s", exc)
        return False

    try:
        with open(_SCALERS_PATH, "rb") as fh:
            bundle = pickle.load(fh)
        _scalers = bundle["scalers"]
        logger.info("[NB20_NormQS] Scalers loaded (%d streams).", len(_scalers))
    except Exception as exc:
        logger.error("[NB20_NormQS] Failed to load scalers: %s", exc)
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


def predict_nb20_normquadstream_risk(
    streams: Dict[str, np.ndarray],
    mc_dropout: bool = False,
) -> Dict[str, Any]:
    """
    Run NB20 NormQuadStream inference on scale-normalised feature streams.

    Parameters
    ----------
    streams : dict with keys 's1', 's2', 's3', 's4'
        Produced by scale_norm_features.extract_scale_norm_streams().
        s1:(3,) spiral geom  s2:(4,) spiral kin
        s3:(3,) wave geom    s4:(4,) wave kin

    Returns
    -------
    dict: risk_percentage, risk_level, label, confidence, stream_gates, source
    Plus uncertainty / is_borderline when mc_dropout=True.
    """
    if not _load():
        raise RuntimeError(
            "NB20 NormQuadStream model unavailable — model files missing. "
            "Run NB20.ipynb on Google Colab and copy the saved .pth + .pkl "
            "into: " + _DIR
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
        "[NB20_NormQS] logit=%.4f  P(PD)=%.4f  risk_pct=%.2f  gates=%s",
        logit.item(), prob, risk_pct, gates_raw,
    )

    result: Dict[str, Any] = {
        "risk_percentage": risk_pct,
        "risk_level":      _risk_level(risk_pct),
        "label":           label,
        "confidence":      conf_pct,
        "stream_gates":    stream_gates,
        "source":          "normquadstream_nb20",
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
            "[NB20_NormQS] MC: mean_p=%.4f  std=%.4f  borderline=%s",
            mc_mean, mc_std, result["is_borderline"],
        )

    return result
