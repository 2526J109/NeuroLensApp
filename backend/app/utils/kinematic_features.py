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
    r = np.sqrt(x**2 + y**2)
    return float(np.std(r))


def _resample_uniform(x: np.ndarray, y: np.ndarray, t: np.ndarray, hz: float = 60.0):
    """
    Resample (x, y) to a uniform time grid at `hz` Hz using linear interpolation.
    This matches the fixed-rate tablet digitizer data the model was trained on,
    and removes velocity spikes caused by irregular mobile touch event timing.
    """
    if len(t) < 2:
        return x, y, t
    t_uniform = np.arange(t[0], t[-1], 1.0 / hz)
    if len(t_uniform) < 2:
        return x, y, t
    x_r = np.interp(t_uniform, t, x)
    y_r = np.interp(t_uniform, t, y)
    return x_r, y_r, t_uniform


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
    """
    Matches the training  preprocessing exactly:
      1. Resample to 60 Hz  (training app captured at uniform 60 Hz)
      2. Geometry features on resampled raw positions  (notebook
         extract_geometry_features uses raw x,y -- no time normalization)
      3. Kinematic features on Gaussian-smoothed (sigma=5) resampled positions
         -- approximates the hardware-smooth vx,vy stored in training CSVs
      4. Velocity/jerk via np.diff chains (paper Sec 3.3: a=Dv/Dt, j=Da/Dt);
         vel_cv and jerk_cv are dimensionless std/mean ratios so dt cancels
    """
    SIGMA = 5

    features: Dict[str, float] = {k: 0.0 for k in RFE_FEATURE_NAMES}

    if spiral_points and len(spiral_points) > 5:
        sx_raw = np.array([p["x"] for p in spiral_points], dtype=float)
        sy_raw = np.array([p["y"] for p in spiral_points], dtype=float)
        st_raw = np.array([p["timestamp"] for p in spiral_points], dtype=float) / 1000.0

        sx_r, sy_r, _ = _resample_uniform(sx_raw, sy_raw, st_raw, hz=60.0)
        if len(sx_r) < 6:
            sx_r, sy_r = sx_raw, sy_raw

        sx = gaussian_filter1d(sx_r, sigma=SIGMA)
        sy = gaussian_filter1d(sy_r, sigma=SIGMA)

        vx = np.diff(sx)
        vy = np.diff(sy)
        vel = np.sqrt(vx**2 + vy**2)
        features["spiral_vel_cv"] = float(np.std(vel) / (np.mean(vel) + 1e-8))

        ax = np.diff(vx)
        ay = np.diff(vy)
        jx = np.diff(ax)
        jy = np.diff(ay)
        jerk = np.sqrt(jx**2 + jy**2)
        features["spiral_jerk_cv"] = float(np.std(jerk) / (np.mean(jerk) + 1e-8))

    if wave_points and len(wave_points) > 5:
        wx_raw = np.array([p["x"] for p in wave_points], dtype=float)
        wy_raw = np.array([p["y"] for p in wave_points], dtype=float)
        wt_raw = np.array([p["timestamp"] for p in wave_points], dtype=float) / 1000.0

        wx_r, wy_r, _ = _resample_uniform(wx_raw, wy_raw, wt_raw, hz=60.0)
        if len(wx_r) < 6:
            wx_r, wy_r = wx_raw, wy_raw

        # Geometry on resampled raw positions -- matches notebook extract_geometry_features
        y_ref = gaussian_filter1d(wy_r, sigma=SIGMA)
        features["wavy_wave_rmse"]        = float(np.sqrt(np.mean((wy_r - y_ref)**2)))
        features["wavy_radius_resid_std"] = float(np.std(np.sqrt(wx_r**2 + wy_r**2)))

        wx = gaussian_filter1d(wx_r, sigma=SIGMA)
        wy = gaussian_filter1d(wy_r, sigma=SIGMA)

        vx = np.diff(wx)
        vy = np.diff(wy)
        vel = np.sqrt(vx**2 + vy**2)
        features["wavy_vel_cv"] = float(np.std(vel) / (np.mean(vel) + 1e-8))

        ax = np.diff(vx)
        ay = np.diff(vy)
        jx = np.diff(ax)
        jy = np.diff(ay)
        jerk = np.sqrt(jx**2 + jy**2)
        features["wavy_jerk_cv"] = float(np.std(jerk) / (np.mean(jerk) + 1e-8))

    return features

# ── Original 5-feature extractor (used by existing HF-Space pipeline) ────────

def extract_kinematic_features(spiral_points: List[Dict[str, float]], wave_points: List[Dict[str, float]]) -> Dict[str, float]:
    """
    Extract 5 core kinematic features from spiral and wave point sequences.
    Uses the same preprocessing as extract_rfe_features:
      - Raw pixel coordinates (no DPI conversion)
      - Resample to 60 Hz (matches training data capture rate)
      - Gaussian smooth (sigma=5) before kinematic computation
      - np.diff-based velocity (via compute_velocity)
    """
    SIGMA = 5
    features = {}

    # ---- Spiral Data ----
    if spiral_points and len(spiral_points) > 5:
        sx_raw = np.array([p["x"] for p in spiral_points], dtype=float)
        sy_raw = np.array([p["y"] for p in spiral_points], dtype=float)
        st_raw = np.array([p["timestamp"] for p in spiral_points], dtype=float) / 1000.0

        sx_r, sy_r, st_r = _resample_uniform(sx_raw, sy_raw, st_raw, hz=60.0)
        if len(sx_r) < 6:
            sx_r, sy_r, st_r = sx_raw, sy_raw, st_raw

        sx = gaussian_filter1d(sx_r, sigma=SIGMA)
        sy = gaussian_filter1d(sy_r, sigma=SIGMA)

        spiral_velocity = compute_velocity(sx, sy, st_r)
        spiral_curvature = compute_curvature(sx, sy)

        features["spiral_vel_cv"] = float(compute_vel_cv(spiral_velocity))
        features["spiral_pause_ratio"] = float(compute_pause_ratio(spiral_velocity))
        features["spiral_curv_std"] = float(np.std(spiral_curvature))
    else:
        features["spiral_vel_cv"] = 0.0
        features["spiral_pause_ratio"] = 0.0
        features["spiral_curv_std"] = 0.0

    # ---- Wave Data ----
    if wave_points and len(wave_points) > 5:
        wx_raw = np.array([p["x"] for p in wave_points], dtype=float)
        wy_raw = np.array([p["y"] for p in wave_points], dtype=float)
        wt_raw = np.array([p["timestamp"] for p in wave_points], dtype=float) / 1000.0

        wx_r, wy_r, wt_r = _resample_uniform(wx_raw, wy_raw, wt_raw, hz=60.0)
        if len(wx_r) < 6:
            wx_r, wy_r, wt_r = wx_raw, wy_raw, wt_raw

        wx = gaussian_filter1d(wx_r, sigma=SIGMA)
        wy = gaussian_filter1d(wy_r, sigma=SIGMA)

        wave_velocity = compute_velocity(wx, wy, wt_r)

        features["wave_vel_cv"] = float(compute_vel_cv(wave_velocity))
        features["wave_pause_ratio"] = float(compute_pause_ratio(wave_velocity))
    else:
        features["wave_vel_cv"] = 0.0
        features["wave_pause_ratio"] = 0.0

    return features
