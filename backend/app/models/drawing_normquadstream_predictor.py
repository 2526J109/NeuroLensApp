"""
NormQuadStream predictor for mobile drawing inference.

Loads the NB22-trained NormQuadStream model (.pth) and StandardScaler
bundle (.pkl) once at process start, then runs MC Dropout inference
on single-subject 12-feature input vectors.

Model files must be placed at (default paths, overridable via env vars):
    NQS_MODEL_PATH   → app/models/nb22_normquadstream_noaug_final.pth
    NQS_SCALERS_PATH → app/models/nb22_normquadstream_noaug_scalers.pkl

Download from Colab: results_nb22/nb22_normquadstream_noaug_final.pth
                     results_nb22/nb22_normquadstream_noaug_scalers.pkl
"""

import os
import pickle
import logging
from typing import Any, Dict, Optional

import numpy as np

logger = logging.getLogger(__name__)

_DEFAULT_DIR  = os.path.dirname(__file__)
_MODEL_PATH   = os.environ.get(
    "NQS_MODEL_PATH",
    os.path.join(_DEFAULT_DIR, "nb22_normquadstream_noaug_final.pth"),
)
_SCALERS_PATH = os.environ.get(
    "NQS_SCALERS_PATH",
    os.path.join(_DEFAULT_DIR, "nb22_normquadstream_noaug_scalers.pkl"),
)

_predictor: Optional["_Predictor"] = None
_predictor_loaded: bool = False


class _Predictor:
    """Wraps NormQuadStream + 4 StandardScalers. Loaded once, reused per request."""

    def __init__(self, model_path: str, scalers_path: str) -> None:
        import torch
        import torch.nn as nn

        # ── Inline architecture (must match NB22 exactly) ─────────────────────
        class StreamEncoder(nn.Module):
            def __init__(self, in_dim, hidden, embed_dim, dropout):
                super().__init__()
                self.net = nn.Sequential(
                    nn.Linear(in_dim, hidden), nn.ELU(),
                    nn.Dropout(dropout),
                    nn.Linear(hidden, embed_dim), nn.ELU(),
                )
            def forward(self, x): return self.net(x)

        class NormQuadStream(nn.Module):
            def __init__(self, dims, hidden, embed_dim, fusion_hidden, dropout):
                super().__init__()
                self.enc_s1 = StreamEncoder(dims[0], hidden, embed_dim, dropout)
                self.enc_s2 = StreamEncoder(dims[1], hidden, embed_dim, dropout)
                self.enc_s3 = StreamEncoder(dims[2], hidden, embed_dim, dropout)
                self.enc_s4 = StreamEncoder(dims[3], hidden, embed_dim, dropout)
                self.stream_gate_logits = nn.Parameter(torch.zeros(4))
                self.fusion = nn.Sequential(
                    nn.Linear(embed_dim * 4, fusion_hidden), nn.ELU(),
                    nn.Dropout(dropout),
                    nn.Linear(fusion_hidden, 1),
                )

            def stream_weights(self):
                return torch.sigmoid(self.stream_gate_logits).detach().cpu().numpy()

            def forward(self, s1, s2, s3, s4):
                gates = torch.sigmoid(self.stream_gate_logits)
                e1 = self.enc_s1(s1) * gates[0]
                e2 = self.enc_s2(s2) * gates[1]
                e3 = self.enc_s3(s3) * gates[2]
                e4 = self.enc_s4(s4) * gates[3]
                return self.fusion(torch.cat([e1, e2, e3, e4], dim=-1)).squeeze(-1)

            def mc_predict(self, s1, s2, s3, s4, n_samples: int = 200):
                self.train()   # keep dropout active
                with torch.no_grad():
                    samples = torch.stack(
                        [torch.sigmoid(self(s1, s2, s3, s4)) for _ in range(n_samples)]
                    )
                return samples.mean(0), samples.std(0)

        # ── Load weights ──────────────────────────────────────────────────────
        ckpt = torch.load(model_path, map_location="cpu", weights_only=False)
        cfg  = ckpt["config"]
        dims = tuple(ckpt["stream_dims"])

        self.model = NormQuadStream(
            dims, cfg["hidden"], cfg["embed_dim"],
            cfg["fusion_hidden"], cfg["dropout"],
        )
        self.model.load_state_dict(ckpt["model_state_dict"])
        logger.info(
            "[NQSPredictor] Loaded %d-param NormQuadStream. "
            "LOOCV Composite=%.4f  AUC=%.4f",
            ckpt.get("n_params", 0),
            ckpt.get("loocv_metrics", {}).get("composite", 0),
            ckpt.get("loocv_metrics", {}).get("auc", 0),
        )

        # ── Load scalers ──────────────────────────────────────────────────────
        with open(scalers_path, "rb") as f:
            bundle = pickle.load(f)
        self.scalers = bundle["scalers"]  # list[StandardScaler], one per stream
        self._torch = torch

    def predict(
        self,
        s1: np.ndarray,
        s2: np.ndarray,
        s3: np.ndarray,
        s4: np.ndarray,
        n_mc: int = 200,
    ):
        """Scale each stream, run MC Dropout, return (mean_prob, std_prob)."""
        torch = self._torch
        streams_sc = [
            self.scalers[i].transform(s.reshape(1, -1)).astype(np.float32)
            for i, s in enumerate([s1, s2, s3, s4])
        ]
        tensors = [torch.tensor(sc) for sc in streams_sc]
        mean_p, std_p = self.model.mc_predict(*tensors, n_samples=n_mc)
        return float(mean_p.item()), float(std_p.item())


# ── Lazy singleton ────────────────────────────────────────────────────────────

def _load_predictor() -> Optional[_Predictor]:
    global _predictor, _predictor_loaded
    if _predictor_loaded:
        return _predictor
    _predictor_loaded = True
    
    missing = [p for p in (_MODEL_PATH, _SCALERS_PATH) if not os.path.exists(p)]
    if missing:
        logger.error(
            "[NQSPredictor] CRITICAL: Model files not found at startup. "
            "Missing files: %s. "
            "Expected paths:\n"
            "  - %s (pth file)\n"
            "  - %s (scalers file)\n"
            "Place both files in app/models/ directory.",
            missing, _MODEL_PATH, _SCALERS_PATH,
        )
        return None
    
    try:
        logger.info(f"[NQSPredictor] Loading model from {_MODEL_PATH} and scalers from {_SCALERS_PATH}...")
        _predictor = _Predictor(_MODEL_PATH, _SCALERS_PATH)
        logger.info("[NQSPredictor] Successfully loaded NormQuadStream model and scalers")
    except ImportError as e:
        logger.error(
            "[NQSPredictor] Import error (likely missing torch): %s. "
            "Ensure torch is installed: pip install torch",
            e, exc_info=True
        )
        _predictor = None
    except FileNotFoundError as e:
        logger.error("[NQSPredictor] File not found during loading: %s", e, exc_info=True)
        _predictor = None
    except Exception as exc:
        logger.error("[NQSPredictor] Failed to load model: %s (type: %s)", exc, type(exc).__name__, exc_info=True)
        _predictor = None
    
    return _predictor


# ── Public API ────────────────────────────────────────────────────────────────

def _risk_level(risk_pct: float) -> str:
    if risk_pct >= 70:
        return "High"
    if risk_pct >= 40:
        return "Moderate"
    return "Low"


def predict_normquadstream_risk(
    s1: np.ndarray,
    s2: np.ndarray,
    s3: np.ndarray,
    s4: np.ndarray,
    n_mc: int = 200,
) -> Dict[str, Any]:
    """
    Run NormQuadStream inference on 4 × 3 feature vectors.

    Returns a dict with the same keys as predict_drawing_risk() so the
    frontend requires no changes:
        risk_percentage  : float  0–100
        risk_level       : "Low" | "Moderate" | "High"
        label            : "Normal" | "Parkinson's Detected"
        confidence       : float  0–100
        uncertainty_pct  : float  0–100   (MC Dropout std × 100)
        borderline       : bool   std > 0.15 → flag for clinician review
        source           : "normquadstream_nb22"
    """
    predictor = _load_predictor()
    if predictor is None:
        raise RuntimeError(
            "NormQuadStream model failed to load. "
            f"Model file: {_MODEL_PATH} "
            f"Scalers file: {_SCALERS_PATH} "
            "Check logs for detailed error. Ensure both .pth and .pkl files exist and are readable."
        )

    # Validate input shapes
    expected_shapes = [(3,), (3,), (3,), (3,)]
    actual_shapes = [s1.shape, s2.shape, s3.shape, s4.shape]
    if actual_shapes != expected_shapes:
        raise ValueError(
            f"Feature shape mismatch. Expected {expected_shapes}, got {actual_shapes}. "
            "Each stream must have exactly 3 features."
        )

    feat = np.concatenate([s1, s2, s3, s4])
    non_finite_indices = [i for i, v in enumerate(feat) if not np.isfinite(v)]
    if non_finite_indices:
        raise ValueError(
            f"Non-finite features (NaN/Inf) at indices {non_finite_indices} (values: {feat[non_finite_indices]}). "
            "Drawing may be too short, degenerate, or contain invalid points. "
            "Ensure drawing points have valid x, y, timestamp values."
        )

    try:
        prob, unc = predictor.predict(s1, s2, s3, s4, n_mc=n_mc)
    except Exception as e:
        logger.error(f"[NQSPredictor] Inference failed on valid features: {e}", exc_info=True)
        raise RuntimeError(f"Model inference failed: {str(e)}")
    
    risk_pct  = round(prob * 100, 2)

    return {
        "risk_percentage": risk_pct,
        "risk_level":      _risk_level(risk_pct),
        "label":           "Parkinson's Detected" if risk_pct >= 50 else "Normal",
        "confidence":      round(max(prob, 1.0 - prob) * 100, 2),
        "uncertainty_pct": round(unc * 100, 2),
        "borderline":      bool(unc > 0.15),
        "source":          "normquadstream_nb22",
    }
