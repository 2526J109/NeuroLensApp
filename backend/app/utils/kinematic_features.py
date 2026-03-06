import numpy as np
from typing import List, Dict, Any

def compute_velocity(x, y, t):
    """
    Compute velocity from coordinates and timestamps.
    """
    dx = np.diff(x)
    dy = np.diff(y)
    dt = np.diff(t)

    # Avoid division by zero
    dt[dt == 0] = 1e-6
    velocity = np.sqrt(dx**2 + dy**2) / dt
    return velocity


def compute_curvature(x, y):
    """
    Compute curvature from coordinates.
    """
    dx = np.gradient(x)
    dy = np.gradient(y)

    ddx = np.gradient(dx)
    ddy = np.gradient(dy)

    # Formula for curvature in 2D
    curvature = np.abs(dx * ddy - dy * ddx) / ((dx**2 + dy**2)**1.5 + 1e-6)
    return curvature


def compute_pause_ratio(velocity, threshold=0.01):
    """
    Compute the ratio of pauses (velocity below threshold).
    """
    if len(velocity) == 0:
        return 0.0
    pauses = velocity < threshold
    return np.sum(pauses) / len(velocity)


def compute_vel_cv(velocity):
    """
    Compute Coefficient of Variation (CV) for velocity.
    """
    if len(velocity) == 0:
        return 0.0
    return np.std(velocity) / (np.mean(velocity) + 1e-6)


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
