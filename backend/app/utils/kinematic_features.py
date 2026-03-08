import numpy as np
from scipy.ndimage import gaussian_filter1d
from typing import List, Dict, Any


# ── Low-level primitive helpers ───────────────────────────────────────────────

def compute_velocity(x, y, t):
    dx = np.diff(x)
    dy = np.diff(y)
    dt = np.diff(t)
    dt[dt == 0] = 1e-6
    return np.sqrt(dx**2 + dy**2) / dt


def compute_curvature(x, y):
    dx = np.gradient(x)
    dy = np.gradient(y)
    ddx = np.gradient(dx)
    ddy = np.gradient(dy)
    return np.abs(dx * ddy - dy * ddx) / ((dx**2 + dy**2)**1.5 + 1e-6)


def compute_pause_ratio(velocity, threshold=0.01):
    if len(velocity) == 0:
        return 0.0
    return float(np.sum(velocity < threshold) / len(velocity))


def compute_vel_cv(velocity):
    if len(velocity) == 0:
        return 0.0
    return float(np.std(velocity) / (np.mean(velocity) + 1e-8))


def _compute_jerk_cv(x: np.ndarray, y: np.ndarray, t: np.ndarray) -> float:
    """CV of jerk magnitude — captures movement smoothness / micro-tremor."""
    dt = np.gradient(t) + 1e-8
    vx = np.gradient(x) / dt
    vy = np.gradient(y) / dt
    ax = np.gradient(vx) / dt
    ay = np.gradient(vy) / dt
    jx = np.gradient(ax) / dt
    jy = np.gradient(ay) / dt
    jerk = np.sqrt(jx**2 + jy**2)
    return float(np.std(jerk) / (np.mean(jerk) + 1e-8))


def _compute_radius_resid_std(x: np.ndarray, y: np.ndarray) -> float:
    """Std of radial distance from centroid — path deviation from ideal circle."""
    r = np.sqrt((x - np.mean(x))**2 + (y - np.mean(y))**2)
    return float(np.std(r))


def _compute_wave_rmse(y: np.ndarray) -> float:
    """RMSE of y-trajectory vs its Gaussian-smoothed version — wave path smoothness."""
    y_smooth = gaussian_filter1d(y.astype(float), sigma=5)
    return float(np.sqrt(np.mean((y - y_smooth)**2)))



RFE_FEATURE_NAMES: List[str] = [
    "spiral_vel_cv",        
    "spiral_jerk_cv",       
    "wavy_vel_cv",          
    "wavy_wave_rmse",       
    "wavy_radius_resid_std",# radial deviation on wavy task
    "wavy_jerk_cv",         # jerk CV on wavy task
]


def extract_rfe_features(
    spiral_points: List[Dict[str, float]],
    wave_points: List[Dict[str, float]],
) -> Dict[str, float]:
    features: Dict[str, float] = {k: 0.0 for k in RFE_FEATURE_NAMES}

    # ── Spiral (spiral_vel_cv, spiral_jerk_cv) ────────────────────────────
    if spiral_points and len(spiral_points) > 1:
        sx = np.array([p["x"] for p in spiral_points], dtype=float)
        sy = np.array([p["y"] for p in spiral_points], dtype=float)
        st = np.array([p["timestamp"] for p in spiral_points], dtype=float) / 1000.0

        sv = compute_velocity(sx, sy, st)
        features["spiral_vel_cv"]   = compute_vel_cv(sv)
        features["spiral_jerk_cv"]  = _compute_jerk_cv(sx, sy, st)

    # ── Wavy (wavy_vel_cv, wavy_wave_rmse, wavy_radius_resid_std, wavy_jerk_cv)
    if wave_points and len(wave_points) > 1:
        wx = np.array([p["x"] for p in wave_points], dtype=float)
        wy = np.array([p["y"] for p in wave_points], dtype=float)
        wt = np.array([p["timestamp"] for p in wave_points], dtype=float) / 1000.0

        wv = compute_velocity(wx, wy, wt)
        features["wavy_vel_cv"]          = compute_vel_cv(wv)
        features["wavy_wave_rmse"]        = _compute_wave_rmse(wy)
        features["wavy_radius_resid_std"] = _compute_radius_resid_std(wx, wy)
        features["wavy_jerk_cv"]          = _compute_jerk_cv(wx, wy, wt)

    return features


# ── Original 5-feature extractor (used by existing HF-Space pipeline) ────────

def extract_kinematic_features(spiral_points: List[Dict[str, float]], wave_points: List[Dict[str, float]]) -> Dict[str, float]:
    """
    Extract 5 core kinematic features from spiral and wave point sequences.
    
    Args:
        spiral_points: List of dicts with 'x', 'y', 'timestamp' (ms)
        wave_points: List of dicts with 'x', 'y', 'timestamp' (ms)
        
    Returns:
        Dictionary of 5 extracted features
    """
    features = {}

    # ---- Spiral Data ----
    if spiral_points and len(spiral_points) > 1:
        sx = np.array([p["x"] for p in spiral_points])
        sy = np.array([p["y"] for p in spiral_points])
        st = np.array([p["timestamp"] for p in spiral_points]) / 1000.0

        spiral_velocity = compute_velocity(sx, sy, st)
        spiral_curvature = compute_curvature(sx, sy)

        features["spiral_vel_cv"] = float(compute_vel_cv(spiral_velocity))
        features["spiral_pause_ratio"] = float(compute_pause_ratio(spiral_velocity))
        features["spiral_curv_std"] = float(np.std(spiral_curvature))
    else:
        features["spiral_vel_cv"] = 0.0
        features["spiral_pause_ratio"] = 0.0
        features["spiral_curv_std"] = 0.0

    # ---- Wave Data ----
    if wave_points and len(wave_points) > 1:
        wx = np.array([p["x"] for p in wave_points])
        wy = np.array([p["y"] for p in wave_points])
        wt = np.array([p["timestamp"] for p in wave_points]) / 1000.0

        wave_velocity = compute_velocity(wx, wy, wt)

        features["wave_vel_cv"] = float(compute_vel_cv(wave_velocity))
        features["wave_pause_ratio"] = float(compute_pause_ratio(wave_velocity))
    else:
        features["wave_vel_cv"] = 0.0
        features["wave_pause_ratio"] = 0.0

    return features
