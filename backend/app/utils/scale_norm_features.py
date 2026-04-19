"""
Scale-normalised 14-feature extractor — NB19 / NB20 style.

Produces 14 features (7 per task) that are device- and speed-invariant:
  curv_std, radius_resid_std, direction_change_rate,
  wave_rmse, vel_cv, pause_ratio, jerk_cv

Two public entry points:
  extract_scale_norm_flat()    -> Dict[str, float]  (14 named features for NB19 LR)
  extract_scale_norm_streams() -> Dict[str, np.ndarray]  (4 streams for NB20 NN)
    s1: (3,)  spiral geometric   [curv_std, radius_resid_std, direction_change_rate]
    s2: (4,)  spiral kinematic   [wave_rmse, vel_cv, pause_ratio, jerk_cv]
    s3: (3,)  wave geometric
    s4: (4,)  wave kinematic
"""

from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.ndimage import gaussian_filter1d

FEATURE_NAMES: List[str] = [
    "spiral_curv_std", "spiral_radius_resid_std", "spiral_direction_change_rate",
    "spiral_wave_rmse", "spiral_vel_cv", "spiral_pause_ratio", "spiral_jerk_cv",
    "wavy_curv_std",   "wavy_radius_resid_std",   "wavy_direction_change_rate",
    "wavy_wave_rmse",  "wavy_vel_cv",  "wavy_pause_ratio",  "wavy_jerk_cv",
]

STREAM_DIMS: Tuple[int, int, int, int] = (3, 4, 3, 4)   # NB20 stream sizes


def _points_to_arrays(
    points: List[Dict[str, float]],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    x = np.array([p["x"] for p in points], dtype=float)
    y = np.array([p["y"] for p in points], dtype=float)
    t = np.array([p["timestamp"] for p in points], dtype=float)
    return x, y, t


def _extract_7(
    x: np.ndarray,
    y: np.ndarray,
    t: np.ndarray,
    sigma: int = 5,
) -> np.ndarray:
    """Extract 7 scale-normalised features from (x, y, t) touch arrays."""
    # ── Geometric ─────────────────────────────────────────────────────────────
    dx  = np.gradient(x)
    dy  = np.gradient(y)
    ddx = np.gradient(dx)
    ddy = np.gradient(dy)
    curvature = np.abs(dx * ddy - dy * ddx) / ((dx**2 + dy**2)**1.5 + 1e-8)
    curv_std = float(np.std(curvature))

    radius_resid_std = float(np.std(np.sqrt(x**2 + y**2)))

    angle = np.arctan2(dy, dx)
    direction_change_rate = float(np.std(np.diff(angle))) if len(angle) > 1 else 0.0

    # Gaussian-smoothed RMSE — mobile-safe (no curve_fit)
    y_smooth = gaussian_filter1d(y.astype(float), sigma=sigma)
    wave_rmse = float(np.sqrt(np.mean((y - y_smooth) ** 2)))

    # ── Kinematic (scale-normalised via CV) ───────────────────────────────────
    dt = np.gradient(t)
    dt[dt == 0] = 1e-6
    vx = np.gradient(x) / dt
    vy = np.gradient(y) / dt
    vel = np.sqrt(vx**2 + vy**2)

    ax = np.gradient(vx) / dt
    ay = np.gradient(vy) / dt
    jx = np.gradient(ax) / dt
    jy = np.gradient(ay) / dt
    jerk = np.sqrt(jx**2 + jy**2)

    vel_cv  = float(np.std(vel)  / (np.mean(vel)  + 1e-8))
    jerk_cv = float(np.std(jerk) / (np.mean(jerk) + 1e-8))

    threshold   = np.percentile(vel, 10)
    pause_ratio = float(np.sum(vel < threshold) / len(vel))

    return np.array(
        [curv_std, radius_resid_std, direction_change_rate,
         wave_rmse, vel_cv, pause_ratio, jerk_cv],
        dtype=float,
    )


def _safe_extract(
    points: Optional[List[Dict[str, float]]],
    n_feats: int = 7,
    pixel_ratio: float = 1.0,
) -> np.ndarray:
    if not points or len(points) < 5:
        return np.zeros(n_feats, dtype=float)
    try:
        x, y, t = _points_to_arrays(points)
        x = x * pixel_ratio
        y = y * pixel_ratio
        feat = _extract_7(x, y, t)
        if not np.all(np.isfinite(feat)):
            return np.zeros(n_feats, dtype=float)
        return feat
    except Exception:
        return np.zeros(n_feats, dtype=float)


# ── Public functions ──────────────────────────────────────────────────────────

def extract_scale_norm_flat(
    spiral_points: List[Dict[str, float]],
    wave_points: List[Dict[str, float]],
    pixel_ratio: float = 1.0,
) -> Dict[str, float]:
    """
    Extract 14 scale-normalised features as a flat named dict (for NB19 LR).

    Returns
    -------
    dict[str, float] with keys matching FEATURE_NAMES (14 entries).
    Zero-filled for any task with < 5 points.
    """
    sp = _safe_extract(spiral_points, pixel_ratio=pixel_ratio)
    wp = _safe_extract(wave_points,   pixel_ratio=pixel_ratio)
    flat = np.concatenate([sp, wp])
    return {name: float(val) for name, val in zip(FEATURE_NAMES, flat)}


def extract_scale_norm_streams(
    spiral_points: List[Dict[str, float]],
    wave_points: List[Dict[str, float]],
    pixel_ratio: float = 1.0,
) -> Dict[str, np.ndarray]:
    """
    Extract 14 features split into 4 streams for NB20 NormQuadStream.

    Returns
    -------
    dict with keys 's1'..'s4':
      s1 (3,): spiral geometric  [curv_std, radius_resid_std, direction_change_rate]
      s2 (4,): spiral kinematic  [wave_rmse, vel_cv, pause_ratio, jerk_cv]
      s3 (3,): wave geometric
      s4 (4,): wave kinematic
    """
    sp = _safe_extract(spiral_points, pixel_ratio=pixel_ratio)
    wp = _safe_extract(wave_points,   pixel_ratio=pixel_ratio)

    return {
        "s1": sp[:3].copy(),   # curv_std, radius_resid_std, direction_change_rate
        "s2": sp[3:].copy(),   # wave_rmse, vel_cv, pause_ratio, jerk_cv
        "s3": wp[:3].copy(),
        "s4": wp[3:].copy(),
    }


def streams_to_flat(streams: Dict[str, np.ndarray]) -> Dict[str, float]:
    """Flatten NB20 streams into a named dict for logging."""
    geom_names = ["curv_std", "radius_resid_std", "direction_change_rate"]
    kin_names  = ["wave_rmse", "vel_cv", "pause_ratio", "jerk_cv"]
    result: Dict[str, float] = {}
    for prefix, key, names in [
        ("spiral", "s1", geom_names),
        ("spiral", "s2", kin_names),
        ("wavy",   "s3", geom_names),
        ("wavy",   "s4", kin_names),
    ]:
        for name, val in zip(names, streams[key]):
            result[f"{prefix}_{name}"] = float(val)
    return result
