"""
Quick end-to-end pipeline diagnostic.
Run from the backend directory:
    ./venv/Scripts/python test_pipeline.py
"""
import sys, math
import numpy as np

sys.path.insert(0, ".")

# ── 1. Generate realistic fake drawings ──────────────────────────────────────
def make_spiral(n=80):
    t_ms = [i * 60 for i in range(n)]                # 60 ms per point
    angle = [i * 4 * math.pi / n for i in range(n)]  # 2 full turns
    r = [50 + 100 * i / n for i in range(n)]
    x = [175 + r[i] * math.cos(angle[i]) for i in range(n)]
    y = [175 + r[i] * math.sin(angle[i]) for i in range(n)]
    return [{"x": x[i], "y": y[i], "timestamp": t_ms[i]} for i in range(n)]

def make_wave(n=80):
    t_ms = [i * 60 for i in range(n)]
    x = [50 + 250 * i / n for i in range(n)]
    y = [110 + 40 * math.sin(2 * math.pi * i / (n / 3)) for i in range(n)]
    return [{"x": x[i], "y": y[i], "timestamp": t_ms[i]} for i in range(n)]

spiral = make_spiral()
wave   = make_wave()

print("=" * 60)
print("STEP 1 — Input check")
print(f"  spiral points : {len(spiral)}")
print(f"  wave points   : {len(wave)}")
print(f"  spiral[0]     : {spiral[0]}")
print(f"  spiral[1]     : {spiral[1]}")
print()

# ── 2. Feature extraction ─────────────────────────────────────────────────────
print("STEP 2 — Feature extraction (pixel_ratio=3.0)")
try:
    from app.utils.quadstream_features import extract_quadstream_features, streams_to_feature_dict
    streams = extract_quadstream_features(spiral, wave, pixel_ratio=3.0)
    feat = streams_to_feature_dict(streams)
    all_zero = all(v == 0.0 for v in feat.values())
    for k, v in feat.items():
        print(f"  {k:<35} {v:>12.4f}")
    print(f"  all_zero: {all_zero}")
except Exception as e:
    print(f"  ERROR: {e}")
    sys.exit(1)

print()

# ── 3. NB09 model inference ───────────────────────────────────────────────────
print("STEP 3 — NB09 TunedQuadStream inference")
try:
    from app.models.quadstream_predictor import predict_quadstream_risk
    r = predict_quadstream_risk(streams)
    for k, v in r.items():
        print(f"  {k}: {v}")
except RuntimeError as e:
    print(f"  FAILED (RuntimeError): {e}")
except Exception as e:
    print(f"  ERROR: {type(e).__name__}: {e}")

print()

# ── 4. NB12 model inference ───────────────────────────────────────────────────
print("STEP 4 — NB12 ImprovedQuadStream inference")
try:
    from app.models.improved_quadstream_predictor import predict_improved_quadstream_risk
    r2 = predict_improved_quadstream_risk(streams)
    for k, v in r2.items():
        print(f"  {k}: {v}")
except RuntimeError as e:
    print(f"  FAILED (RuntimeError): {e}")
except Exception as e:
    print(f"  ERROR: {type(e).__name__}: {e}")

print()

# ── 5. All-zeros input test ───────────────────────────────────────────────────
print("STEP 5 — What happens with all-zero features (empty drawing)")
try:
    import importlib
    # reset the loaded flag so we can test with zero streams
    import app.models.quadstream_predictor as qp
    zero_streams = {
        "s1": np.zeros(3),
        "s2": np.zeros(5),
        "s3": np.zeros(3),
        "s4": np.zeros(5),
    }
    if qp._model is not None:
        r_zero = predict_quadstream_risk(zero_streams)
        print(f"  risk_percentage with zero input: {r_zero['risk_percentage']}")
    else:
        print("  (NB09 model not loaded, skipping zero test)")
except Exception as e:
    print(f"  {type(e).__name__}: {e}")

print()
print("=" * 60)
print("DONE")
