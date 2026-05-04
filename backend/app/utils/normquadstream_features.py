"""
NormQuadStream feature extraction from mobile touch data.

Extracts 12 scale-invariant features (4 streams × 3) from
spiral and wave drawing point lists:
    S1 [3]: spiral_residual_std, spiral_curvature_cv, spiral_r_squared
    S2 [3]: spiral_vel_cv,       spiral_accel_cv,     spiral_jerk_cv
    S3 [3]: wave_sine_rmse,      wave_amplitude_norm, wave_curvature_cv
    S4 [3]: wave_vel_cv,         wave_accel_cv,       wave_stroke_ratio

Preprocessing matches kinematic_features.py:
    1. Timestamps in ms → seconds
    2. Resample to 60 Hz uniform grid
    3. Gaussian smooth (sigma=5) before kinematic computation
    4. Geometry features on resampled-but-raw coords
    5. Kinematic CV features on smoothed coords via np.diff chains
"""

import numpy as np
from scipy.optimize import curve_fit
from scipy.ndimage import gaussian_filter1d
from typing import Dict, List, Tuple

SIGMA = 5   # matches existing kinematic_features.py


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cv(values: np.ndarray, eps: float = 1e-8) -> float:
    """Coefficient of variation, clipped to [0, 10]."""
    mean = float(np.mean(values))
    if mean < eps:
        return 0.0
    return float(np.clip(np.std(values) / mean, 0.0, 10.0))


def _resample_60hz(
    x: np.ndarray, y: np.ndarray, t: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """Resample (x, y) to 60 Hz uniform time grid — matches training data rate."""
    if len(t) < 2:
        return x, y
    t_uniform = np.arange(t[0], t[-1], 1.0 / 60.0)
    if len(t_uniform) < 2:
        return x, y
    return np.interp(t_uniform, t, x), np.interp(t_uniform, t, y)


# ── Stream extractors ─────────────────────────────────────────────────────────

def _extract_s1(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Spiral geometric features from resampled (unsmoothed) x, y."""
    cx, cy = np.mean(x), np.mean(y)
    xc, yc = x - cx, y - cy
    r      = np.sqrt(xc**2 + yc**2)
    theta  = np.unwrap(np.arctan2(yc, xc))
    A      = np.column_stack([np.ones_like(theta), theta])
    try:
        coeffs, _, _, _ = np.linalg.lstsq(A, r, rcond=None)
        residuals = r - A @ coeffs
        ss_res    = np.sum(residuals**2)
        ss_tot    = np.sum((r - np.mean(r))**2)
        r_sq      = float(np.clip(1.0 - ss_res / (ss_tot + 1e-8), -1.0, 1.0))
        resid_std = float(np.std(residuals))
    except np.linalg.LinAlgError:
        r_sq      = 0.0
        resid_std = float(np.std(r))
    dx  = np.gradient(xc); dy  = np.gradient(yc)
    ddx = np.gradient(dx);  ddy = np.gradient(dy)
    curv = (dx*ddy - dy*ddx) / ((dx**2 + dy**2)**1.5 + 1e-8)
    return np.array([resid_std, _cv(np.abs(curv)), r_sq], dtype=np.float32)


def _extract_s2(x_sm: np.ndarray, y_sm: np.ndarray) -> np.ndarray:
    """Spiral kinematic features from Gaussian-smoothed x, y."""
    vx = np.diff(x_sm); vy = np.diff(y_sm)
    speed = np.sqrt(vx**2 + vy**2)
    ax = np.diff(vx); ay = np.diff(vy)
    accel = np.sqrt(ax**2 + ay**2)
    jx = np.diff(ax); jy = np.diff(ay)
    jerk = np.sqrt(jx**2 + jy**2)
    return np.array([_cv(speed), _cv(accel), _cv(jerk)], dtype=np.float32)


def _extract_s3(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Wave geometric features from resampled (unsmoothed) x, y."""
    x_norm = (x - x.min()) / (x.max() - x.min() + 1e-8) * 2 * np.pi
    try:
        def sine_model(xv, A, phi, C): return A * np.sin(xv + phi) + C
        p0     = [(y.max()-y.min())/2, 0.0, np.mean(y)]
        bounds = ([0, -np.pi, y.min()], [y.max()-y.min(), np.pi, y.max()])
        params, _ = curve_fit(sine_model, x_norm, y, p0=p0, bounds=bounds, maxfev=2000)
        sine_rmse = float(np.sqrt(np.mean((y - sine_model(x_norm, *params))**2)))
    except Exception:
        sine_rmse = float(np.std(y))
    peak_to_trough = y.max() - y.min()
    dy_g = np.gradient(y)
    sc   = np.where(np.diff(np.sign(dy_g)))[0]
    if len(sc) >= 2:
        amplitude_norm = float(np.clip(
            (y[sc].max()-y[sc].min()) / (peak_to_trough + 1e-8), 0.0, 2.0))
    else:
        amplitude_norm = 1.0
    dx_c = np.gradient(x); dy_c = np.gradient(y)
    ddx  = np.gradient(dx_c); ddy = np.gradient(dy_c)
    curv = (dx_c*ddy - dy_c*ddx) / ((dx_c**2 + dy_c**2)**1.5 + 1e-8)
    return np.array([sine_rmse, amplitude_norm, _cv(np.abs(curv))], dtype=np.float32)


def _extract_s4(
    x: np.ndarray, y: np.ndarray,
    x_sm: np.ndarray, y_sm: np.ndarray,
) -> np.ndarray:
    """Wave kinematic + stroke geometry from both raw (resampled) and smoothed coords."""
    vx = np.diff(x_sm); vy = np.diff(y_sm)
    speed = np.sqrt(vx**2 + vy**2)
    ax = np.diff(vx); ay = np.diff(vy)
    accel = np.sqrt(ax**2 + ay**2)
    # arc/chord ratio uses raw resampled positions (geometry, not kinematics)
    dx, dy       = np.diff(x), np.diff(y)
    arc          = float(np.sum(np.sqrt(dx**2 + dy**2)))
    chord        = float(np.sqrt((x[-1]-x[0])**2 + (y[-1]-y[0])**2))
    stroke_ratio = float(np.clip(arc / (chord + 1e-8), 1.0, 10.0))
    return np.array([_cv(speed), _cv(accel), stroke_ratio], dtype=np.float32)


# ── Public API ────────────────────────────────────────────────────────────────

NQS_FEATURE_NAMES = [
    "spiral_residual_std", "spiral_curvature_cv", "spiral_r_squared",
    "spiral_vel_cv",       "spiral_accel_cv",     "spiral_jerk_cv",
    "wave_sine_rmse",      "wave_amplitude_norm", "wave_curvature_cv",
    "wave_vel_cv",         "wave_accel_cv",       "wave_stroke_ratio",
]


def extract_normquadstream_features(
    spiral_points: List[Dict[str, float]],
    wave_points: List[Dict[str, float]],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Extract 4 × 3 = 12 scale-invariant features from mobile drawing data.

    Args:
        spiral_points: list of {"x": float, "y": float, "timestamp": float (ms)}
        wave_points:   list of {"x": float, "y": float, "timestamp": float (ms)}

    Returns:
        (s1, s2, s3, s4) — float32 arrays of shape (3,) each
        Returns zero vectors for any modality with fewer than 6 points.
    """
    # ── Spiral ────────────────────────────────────────────────────────────────
    if spiral_points and len(spiral_points) > 5:
        sx_raw = np.array([p["x"]         for p in spiral_points], dtype=float)
        sy_raw = np.array([p["y"]         for p in spiral_points], dtype=float)
        st_raw = np.array([p["timestamp"] for p in spiral_points], dtype=float) / 1000.0

        sx_r, sy_r = _resample_60hz(sx_raw, sy_raw, st_raw)
        if len(sx_r) < 6:
            sx_r, sy_r = sx_raw, sy_raw

        sx_sm = gaussian_filter1d(sx_r, sigma=SIGMA)
        sy_sm = gaussian_filter1d(sy_r, sigma=SIGMA)

        s1 = _extract_s1(sx_r, sy_r)       # geometry on resampled raw
        s2 = _extract_s2(sx_sm, sy_sm)     # kinematics on smoothed
    else:
        s1 = np.zeros(3, dtype=np.float32)
        s2 = np.zeros(3, dtype=np.float32)

    # ── Wave ──────────────────────────────────────────────────────────────────
    if wave_points and len(wave_points) > 5:
        wx_raw = np.array([p["x"]         for p in wave_points], dtype=float)
        wy_raw = np.array([p["y"]         for p in wave_points], dtype=float)
        wt_raw = np.array([p["timestamp"] for p in wave_points], dtype=float) / 1000.0

        wx_r, wy_r = _resample_60hz(wx_raw, wy_raw, wt_raw)
        if len(wx_r) < 6:
            wx_r, wy_r = wx_raw, wy_raw

        wx_sm = gaussian_filter1d(wx_r, sigma=SIGMA)
        wy_sm = gaussian_filter1d(wy_r, sigma=SIGMA)

        s3 = _extract_s3(wx_r, wy_r)                  # geometry on resampled raw
        s4 = _extract_s4(wx_r, wy_r, wx_sm, wy_sm)   # kinematics on smoothed, geometry on raw
    else:
        s3 = np.zeros(3, dtype=np.float32)
        s4 = np.zeros(3, dtype=np.float32)

    return s1, s2, s3, s4


def features_to_dict(
    s1: np.ndarray, s2: np.ndarray,
    s3: np.ndarray, s4: np.ndarray,
) -> Dict[str, float]:
    """Return a labelled dict of all 12 features for logging/transparency."""
    vals = np.concatenate([s1, s2, s3, s4])
    return {name: round(float(v), 6) for name, v in zip(NQS_FEATURE_NAMES, vals)}
