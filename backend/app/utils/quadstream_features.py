"""
16-feature extractor for TunedQuadStream (NB09).

Produces 4 streams from raw touch-point lists:
  S1 — Spiral Geometric  (3): residual_std, curvature_std, R²
  S2 — Spiral Kinematic  (5): mean_speed, speed_std, mean_accel, mean_jerk, duration
  S3 — Wave Geometric    (3): sine_rmse, amplitude, curvature_std
  S4 — Wave Kinematic    (5): mean_speed, speed_std, mean_accel, mean_jerk, stroke_length

Formulas are extracted verbatim from NB09 (09_QuadStream_TunedFinal_SaveModel.ipynb)
so the computed values match the StandardScaler fitted during training.
"""

from typing import Dict, List, Tuple

import numpy as np
from scipy.optimize import curve_fit
from sklearn.linear_model import LinearRegression


# ── Feature names (same order as training FEATURE_NAMES in NB09) ─────────────

STREAM_DIMS: Tuple[int, int, int, int] = (3, 5, 3, 5)

S1_NAMES = ["spiral_residual_std", "spiral_curvature_std", "spiral_r2"]
S2_NAMES = ["spiral_mean_speed", "spiral_speed_std", "spiral_mean_accel",
            "spiral_mean_jerk", "spiral_duration"]
S3_NAMES = ["wave_sine_rmse", "wave_amplitude", "wave_curvature_std"]
S4_NAMES = ["wave_mean_speed", "wave_speed_std", "wave_mean_accel",
            "wave_mean_jerk", "wave_stroke_length"]

ALL_FEATURE_NAMES: List[str] = S1_NAMES + S2_NAMES + S3_NAMES + S4_NAMES


# ── Low-level helpers (mirror NB09 exactly) ───────────────────────────────────

def _curvature_std(x: np.ndarray, y: np.ndarray) -> float:
    """std(κ) — signed curvature via np.gradient chains."""
    dx  = np.gradient(x)
    dy  = np.gradient(y)
    ddx = np.gradient(dx)
    ddy = np.gradient(dy)
    kappa = (dx * ddy - dy * ddx) / ((dx**2 + dy**2)**1.5 + 1e-8)
    return float(np.std(kappa))


def _sine_model(x: np.ndarray, A: float, w: float, phi: float, c: float) -> np.ndarray:
    return A * np.sin(w * x + phi) + c


def _points_to_arrays(
    points: List[Dict[str, float]],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Convert list of {x, y, timestamp} dicts → (x, y, t_ms) arrays.

    Timestamps are kept in milliseconds — the training dataset (.txt files) stored
    timestamps in ms, so velocity (px/ms), acceleration (px/ms²), and duration (ms)
    all match the scale the StandardScalers were fitted on.
    """
    x = np.array([p["x"] for p in points], dtype=float)
    y = np.array([p["y"] for p in points], dtype=float)
    t = np.array([p["timestamp"] for p in points], dtype=float)   # keep in ms
    return x, y, t


def _velocity_from_positions(
    x: np.ndarray, y: np.ndarray, t: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """Compute vx, vy in px/ms.

    Uses np.gradient for both numerator and denominator so that the first point
    gets dt[0] = t[1]-t[0] (not zero), avoiding the 1/1e-6 blow-up that
    np.diff(t, prepend=t[0]) causes at index 0.
    """
    dt = np.gradient(t)
    dt[dt == 0] = 1e-6
    vx = np.gradient(x) / dt
    vy = np.gradient(y) / dt
    return vx, vy


# ── S1: Spiral Geometric (3 features) ─────────────────────────────────────────

def extract_spiral_geometric(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """
    Returns [residual_std, curvature_std, R²].
    Centre coordinates, fit r = f(θ) with LinearRegression, measure residual spread.
    """
    xc = x - x.mean()
    yc = y - y.mean()

    r = np.sqrt(xc**2 + yc**2)
    theta = np.unwrap(np.arctan2(yc, xc)).reshape(-1, 1)

    model = LinearRegression()
    model.fit(theta, r)
    residual_std = float(np.std(r - model.predict(theta)))
    r2 = float(model.score(theta, r))

    curv_std = _curvature_std(x, y)

    return np.array([residual_std, curv_std, r2], dtype=float)


# ── S2: Spiral Kinematic (5 features) ─────────────────────────────────────────

def extract_spiral_kinematic(
    x: np.ndarray, y: np.ndarray, t: np.ndarray
) -> np.ndarray:
    """
    Returns [mean_speed, speed_std, mean_accel, mean_jerk, duration].
    Matches NB09/NB12 spiral_kinematic() exactly — S2[4] is elapsed time (t[-1]-t[0]).
    """
    vx, vy = _velocity_from_positions(x, y, t)
    speed = np.sqrt(vx**2 + vy**2)

    ax = np.gradient(vx)
    ay = np.gradient(vy)
    acc  = np.sqrt(ax**2 + ay**2)
    jerk = np.sqrt(np.gradient(ax)**2 + np.gradient(ay)**2)

    duration = float(t[-1] - t[0]) if len(t) > 1 else 1.0

    return np.array(
        [speed.mean(), speed.std(), acc.mean(), jerk.mean(), duration],
        dtype=float,
    )


# ── S3: Wave Geometric (3 features) ───────────────────────────────────────────

def extract_wave_geometric(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """
    Returns [sine_rmse, amplitude, curvature_std].
    Fits A·sin(w·x+φ)+c to normalised x; falls back to std(y) on failure.
    """
    x_norm = (x - x.min()) / (x.max() - x.min() + 1e-8)
    try:
        params, _ = curve_fit(
            _sine_model,
            x_norm,
            y,
            p0=[np.std(y), 2 * np.pi, 0.0, y.mean()],
            maxfev=5000,
        )
        rmse = float(np.sqrt(np.mean((y - _sine_model(x_norm, *params))**2)))
        amplitude = float(abs(params[0]))
    except Exception:
        rmse = float(np.std(y))
        amplitude = 0.0

    curv_std = _curvature_std(x, y)

    return np.array([rmse, amplitude, curv_std], dtype=float)


# ── S4: Wave Kinematic (5 features) ───────────────────────────────────────────

def extract_wave_kinematic(
    x: np.ndarray, y: np.ndarray, t: np.ndarray
) -> np.ndarray:
    """
    Returns [mean_speed, speed_std, mean_accel, mean_jerk, stroke_length].
    Matches NB09 wave_kinematic() exactly.
    """
    vx, vy = _velocity_from_positions(x, y, t)
    speed = np.sqrt(vx**2 + vy**2)

    ax = np.gradient(vx)
    ay = np.gradient(vy)
    acc  = np.sqrt(ax**2 + ay**2)
    jerk = np.sqrt(np.gradient(ax)**2 + np.gradient(ay)**2)

    stroke_length = float(np.sum(np.sqrt(np.diff(x)**2 + np.diff(y)**2)))

    return np.array(
        [speed.mean(), speed.std(), acc.mean(), jerk.mean(), stroke_length],
        dtype=float,
    )


# ── Public entry point ────────────────────────────────────────────────────────

def extract_quadstream_features(
    spiral_points: List[Dict[str, float]],
    wave_points:   List[Dict[str, float]],
    pixel_ratio:   float = 1.0,
) -> Dict[str, np.ndarray]:
    """
    Extract all 16 features and return as a dict with keys 's1'..'s4'.

    Each value is a 1-D numpy array ready to be stacked and scaled:
        s1 → shape (3,)  spiral geometric
        s2 → shape (5,)  spiral kinematic
        s3 → shape (3,)  wave geometric
        s4 → shape (5,)  wave kinematic

    pixel_ratio: multiply x/y by this to convert logical → physical pixels,
    matching the coordinate scale of the training data (Vivo X27, ~3× DPR).

    Returns zero-filled streams for any task that has fewer than 5 points.
    """
    s1 = np.zeros(3, dtype=float)
    s2 = np.zeros(5, dtype=float)
    s3 = np.zeros(3, dtype=float)
    s4 = np.zeros(5, dtype=float)

    if spiral_points and len(spiral_points) >= 5:
        sx, sy, st = _points_to_arrays(spiral_points)
        sx = sx * pixel_ratio
        sy = sy * pixel_ratio
        s1 = extract_spiral_geometric(sx, sy)
        s2 = extract_spiral_kinematic(sx, sy, st)

    if wave_points and len(wave_points) >= 5:
        wx, wy, wt = _points_to_arrays(wave_points)
        wx = wx * pixel_ratio
        wy = wy * pixel_ratio
        s3 = extract_wave_geometric(wx, wy)
        s4 = extract_wave_kinematic(wx, wy, wt)

    return {"s1": s1, "s2": s2, "s3": s3, "s4": s4}


def streams_to_feature_dict(streams: Dict[str, np.ndarray]) -> Dict[str, float]:
    """Flatten the 4 streams into a named {feature: value} dict for logging."""
    result: Dict[str, float] = {}
    for names, key in [(S1_NAMES, "s1"), (S2_NAMES, "s2"),
                       (S3_NAMES, "s3"), (S4_NAMES, "s4")]:
        for name, val in zip(names, streams[key]):
            result[name] = float(val)
    return result
