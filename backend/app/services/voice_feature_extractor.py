"""
Voice Feature Extractor
=======================
Extracts acoustic and linguistic features from an audio file.

Acoustic features  → Parselmouth / Praat  (MDVP-compatible: pitch, jitter,
                     shimmer, NHR, HNR and derived composites)
Linguistic features → openai-whisper (ASR) + simple NLP

Why Parselmouth?
    The trained model was built from a dataset whose acoustic features were
    extracted by Praat (the same tool behind MDVP).  Using librosa for that
    step produces values on a completely different numerical scale, causing
    the model to output near-constant predictions.  Parselmouth is a Python
    wrapper around Praat, so it reproduces the original feature distributions.
"""

from __future__ import annotations

import logging
import re
import warnings
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Parselmouth import (optional – falls back gracefully if not installed)
# ---------------------------------------------------------------------------
try:
    import parselmouth
    from parselmouth.praat import call as praat_call
    _PARSELMOUTH_AVAILABLE = True
    logger.info("Parselmouth (Praat) is available — using MDVP-compatible extraction")
except ImportError:
    _PARSELMOUTH_AVAILABLE = False
    logger.warning(
        "parselmouth not installed.  Install it with:  pip install praat-parselmouth\n"
        "Falling back to librosa-based extraction (less accurate)."
    )


# ---------------------------------------------------------------------------
# Audio loading helper
# ---------------------------------------------------------------------------

def _load_audio(path: str, sr: int = 22050):
    """Load audio, returning (y, sr). Tries soundfile first, falls back to librosa."""
    try:
        y, file_sr = sf.read(path, always_2d=False)
        if y.ndim > 1:
            y = y.mean(axis=1)
        y = y.astype(np.float32)
        if file_sr != sr:
            y = librosa.resample(y, orig_sr=file_sr, target_sr=sr)
    except Exception:
        y, _ = librosa.load(path, sr=sr, mono=True)
    return y, sr


# ---------------------------------------------------------------------------
# Nonlinear measures (shared between Parselmouth and fallback paths)
# ---------------------------------------------------------------------------

def _f0_series_librosa(y: np.ndarray, sr: int) -> np.ndarray:
    """Return voiced F0 values (Hz) using librosa YIN."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        f0 = librosa.yin(y, fmin=50, fmax=500, sr=sr)
    voiced = f0[(f0 > 50) & (f0 < 500)]
    return voiced if len(voiced) >= 2 else np.array([120.0, 120.0], dtype=np.float32)


def _dfa_exponent(series: np.ndarray, scales: int = 10) -> float:
    """Approximate Detrended Fluctuation Analysis exponent (log-log regression)."""
    n = len(series)
    if n < 20:
        return 0.7
    series = series - series.mean()
    profile = np.cumsum(series)
    min_scale = max(4, n // 50)
    max_scale = n // 4
    if min_scale >= max_scale:
        return 0.7
    scale_vec = np.unique(
        np.logspace(np.log10(min_scale), np.log10(max_scale), scales).astype(int)
    )
    fluctuations = []
    for s in scale_vec:
        segments = len(profile) // s
        if segments < 2:
            continue
        rms_vals = []
        for k in range(segments):
            seg = profile[k * s:(k + 1) * s]
            t = np.arange(s)
            coeff = np.polyfit(t, seg, 1)
            trend = np.polyval(coeff, t)
            rms_vals.append(np.sqrt(np.mean((seg - trend) ** 2)))
        fluctuations.append(np.mean(rms_vals))
    if len(fluctuations) < 2:
        return 0.7
    log_s = np.log(scale_vec[:len(fluctuations)])
    log_f = np.log(np.array(fluctuations) + 1e-10)
    alpha = np.polyfit(log_s, log_f, 1)[0]
    return float(np.clip(alpha, 0.0, 2.0))


def _rpde(f0: np.ndarray, bins: int = 30) -> float:
    """Recurrence Period Density Entropy from the F0 series."""
    if len(f0) < 10:
        return 0.5
    hist, _ = np.histogram(f0, bins=bins)
    p = hist / (hist.sum() + 1e-10)
    p = p[p > 0]
    entropy = -np.sum(p * np.log(p))
    max_entropy = np.log(bins)
    return float(np.clip(entropy / (max_entropy + 1e-10), 0.0, 1.0))


def _correlation_dimension(f0: np.ndarray) -> float:
    """Rough correlation dimension (D2) via Grassberger-Procaccia on F0."""
    n = len(f0)
    if n < 20:
        return 2.0
    x = (f0 - f0.mean()) / (f0.std() + 1e-10)
    emb = np.column_stack([x[:-2], x[1:-1], x[2:]])
    dists = []
    idx = np.random.choice(len(emb), min(len(emb), 50), replace=False)
    for i in idx:
        d = np.sqrt(np.sum((emb - emb[i]) ** 2, axis=1))
        dists.extend(d[d > 0].tolist())
    if not dists:
        return 2.0
    dists = np.sort(dists)
    r_vals = np.logspace(np.log10(dists[5]), np.log10(dists[-5]), 10)
    C = [np.mean(dists < r) for r in r_vals]
    C = np.array([c for c in C if c > 0])
    if len(C) < 2:
        return 2.0
    log_r = np.log(r_vals[:len(C)])
    log_C = np.log(C)
    d2 = np.polyfit(log_r, log_C, 1)[0]
    return float(np.clip(d2, 0.5, 5.0))


# ---------------------------------------------------------------------------
# Public API — Acoustic (Parselmouth / Praat path)
# ---------------------------------------------------------------------------

def _extract_praat_features(audio_path: str) -> dict:
    """
    Use Parselmouth to extract MDVP-compatible features that match the
    distribution of the training dataset.

    Returns a dict with all 18 columns the acoustic scaler expects:
        MDVP:Fo(Hz), MDVP:Fhi(Hz), MDVP:Flo(Hz),
        MDVP:Jitter(%), MDVP:Jitter(Abs),
        MDVP:Shimmer, NHR, HNR,
        RPDE, DFA, spread1, spread2, D2,
        instability_ratio, signal_quality, freq_range,
        complexity_score, voice_health_score
    """
    sound = parselmouth.Sound(audio_path)

    # ── Pitch ────────────────────────────────────────────────────────────────
    pitch = praat_call(sound, "To Pitch", 0.0, 75.0, 600.0)
    fo_mean = praat_call(pitch, "Get mean", 0, 0, "Hertz")
    fo_max  = praat_call(pitch, "Get maximum", 0, 0, "Hertz", "Parabolic")
    fo_min  = praat_call(pitch, "Get minimum", 0, 0, "Hertz", "Parabolic")

    # Guard against Praat returning NaN / inf / 0 for poor-quality audio
    if not np.isfinite(fo_mean) or fo_mean <= 0:
        fo_mean = 120.0
    if not np.isfinite(fo_max) or fo_max <= 0:
        fo_max = fo_mean * 1.2
    if not np.isfinite(fo_min) or fo_min <= 0:
        fo_min = fo_mean * 0.8

    # ── Jitter (local) ──────────────────────────────────────────────────────
    point_process = praat_call([sound, pitch], "To PointProcess (cc)")
    # jitter_local is dimensionless fraction; multiply × 100 → MDVP:Jitter(%)
    jitter_local = praat_call(
        point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3
    )
    if not np.isfinite(jitter_local) or jitter_local < 0:
        jitter_local = 0.00371
    jitter_pct = jitter_local * 100.0
    # MDVP:Jitter(Abs) = mean absolute period difference in seconds
    jitter_abs = praat_call(
        point_process, "Get jitter (local, absolute)", 0, 0, 0.0001, 0.02, 1.3
    )
    if not np.isfinite(jitter_abs) or jitter_abs < 0:
        jitter_abs = jitter_pct / (fo_mean * 100.0 + 1e-10)

    # ── Shimmer (local) ─────────────────────────────────────────────────────
    shimmer_local = praat_call(
        [sound, point_process],
        "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6
    )
    if not np.isfinite(shimmer_local) or shimmer_local < 0:
        shimmer_local = 0.02971

    # ── Harmonics-to-Noise Ratio (HNR) ─────────────────────────────────────
    harmonicity = praat_call(sound, "To Harmonicity (cc)", 0.01, 75.0, 0.1, 1.0)
    hnr = praat_call(harmonicity, "Get mean", 0, 0)
    if not np.isfinite(hnr):
        hnr = 21.03
    # NHR = 1/HNR (clamped to a realistic range)
    nhr = float(np.clip(1.0 / (hnr + 1e-6), 0.0, 0.5))

    # ── Nonlinear measures from the F0 series ───────────────────────────────
    # We rebuild an F0 array from librosa for DFA/RPDE/D2 (needs dense series)
    y, sr = _load_audio(audio_path)
    f0_arr = _f0_series_librosa(y, sr)

    dfa    = _dfa_exponent(f0_arr)
    rpde   = _rpde(f0_arr)
    d2     = _correlation_dimension(f0_arr)
    spread1 = float(np.std(np.log(f0_arr + 1e-10)))
    spread2 = float(np.std(f0_arr))

    # ── Composite / derived features (same formulas as training script) ──────
    freq_range         = fo_max - fo_min
    instability_ratio  = jitter_pct * shimmer_local
    signal_quality     = hnr / (nhr + 1e-10)
    voice_health_score = float(np.clip(
        hnr / (jitter_pct * shimmer_local + 1e-10), 0.0, 200.0
    ))
    complexity_score   = float(rpde * d2)

    return {
        "MDVP:Fo(Hz)":        float(fo_mean),
        "MDVP:Fhi(Hz)":       float(fo_max),
        "MDVP:Flo(Hz)":       float(fo_min),
        "MDVP:Jitter(%)":     float(jitter_pct),
        "MDVP:Jitter(Abs)":   float(jitter_abs),
        "MDVP:Shimmer":       float(shimmer_local),
        "NHR":                float(nhr),
        "HNR":                float(hnr),
        "RPDE":               float(rpde),
        "DFA":                float(dfa),
        "spread1":            float(spread1),
        "spread2":            float(spread2),
        "D2":                 float(d2),
        "instability_ratio":  float(instability_ratio),
        "signal_quality":     float(signal_quality),
        "freq_range":         float(freq_range),
        "complexity_score":   float(complexity_score),
        "voice_health_score": float(voice_health_score),
    }


# ---------------------------------------------------------------------------
# Fallback: librosa path (used when Parselmouth is not installed)
# ---------------------------------------------------------------------------

def _extract_librosa_features(audio_path: str) -> dict:
    """
    Librosa-based acoustic extraction.
    Less accurate than the Praat path but still structurally correct.
    """
    try:
        y, sr = _load_audio(audio_path)
    except Exception as e:
        logger.warning("Could not load audio %s: %s — using fallback values", audio_path, e)
        return _fallback_acoustic()

    f0 = _f0_series_librosa(y, sr)
    fo_mean = float(np.mean(f0))
    fo_max  = float(np.max(f0))
    fo_min  = float(np.min(f0))

    diff_f0   = np.abs(np.diff(f0))
    jitter_abs = float(np.mean(diff_f0)) / (fo_mean + 1e-10)  # seconds (approx)
    jitter_pct = float((np.mean(diff_f0) / (fo_mean + 1e-10)) * 100)

    rms = librosa.feature.rms(y=y, frame_length=512, hop_length=128)[0]
    shimmer = float(np.mean(np.abs(np.diff(rms))) / (np.mean(rms) + 1e-10))

    flatness = librosa.feature.spectral_flatness(y=y)[0]
    nhr = float(np.mean(flatness))
    hnr = float(1.0 / (nhr + 1e-6))

    freq_range         = fo_max - fo_min
    instability_ratio  = jitter_pct * shimmer
    signal_quality     = hnr / (nhr + 1e-10)
    voice_health_score = float(np.clip(hnr / (jitter_pct * shimmer + 1e-10), 0.0, 200.0))

    dfa    = _dfa_exponent(f0)
    rpde   = _rpde(f0)
    d2     = _correlation_dimension(f0)
    spread1 = float(np.std(np.log(f0 + 1e-10)))
    spread2 = float(np.std(f0))
    complexity_score = float(rpde * d2)

    return {
        "MDVP:Fo(Hz)":        fo_mean,
        "MDVP:Fhi(Hz)":       fo_max,
        "MDVP:Flo(Hz)":       fo_min,
        "MDVP:Jitter(%)":     jitter_pct,
        "MDVP:Jitter(Abs)":   jitter_abs,
        "MDVP:Shimmer":       shimmer,
        "NHR":                nhr,
        "HNR":                hnr,
        "RPDE":               rpde,
        "DFA":                dfa,
        "spread1":            spread1,
        "spread2":            spread2,
        "D2":                 d2,
        "instability_ratio":  instability_ratio,
        "signal_quality":     signal_quality,
        "freq_range":         freq_range,
        "complexity_score":   complexity_score,
        "voice_health_score": voice_health_score,
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def extract_acoustic_features(audio_path: str) -> dict:
    """
    Extract the 18 acoustic feature columns the model scaler was fit on.

    Prefers Parselmouth (Praat) for MDVP-compatible values.
    Falls back to librosa if Parselmouth is not installed.
    Returns hardcoded healthy-voice defaults if the audio cannot be read.
    """
    if audio_path is None:
        return _fallback_acoustic()

    try:
        if _PARSELMOUTH_AVAILABLE:
            logger.info("Extracting acoustic features via Parselmouth (Praat)")
            return _extract_praat_features(audio_path)
        else:
            logger.warning("Parselmouth unavailable — using librosa extraction")
            return _extract_librosa_features(audio_path)
    except Exception as e:
        logger.warning(
            "Acoustic feature extraction failed for %s: %s — using fallback",
            audio_path, e
        )
        return _fallback_acoustic()


def _fallback_acoustic() -> dict:
    """
    Realistic healthy-voice UCI-range values used when audio cannot be processed.
    Values sourced from the UCI Parkinson's dataset healthy-subject mean.
    """
    return {
        "MDVP:Fo(Hz)":        154.229,
        "MDVP:Fhi(Hz)":       197.105,
        "MDVP:Flo(Hz)":       116.325,
        "MDVP:Jitter(%)":     0.00371,
        "MDVP:Jitter(Abs)":   0.0000220,
        "MDVP:Shimmer":       0.02971,
        "NHR":                0.0249,
        "HNR":                21.033,
        "RPDE":               0.4985,
        "DFA":                0.7180,
        "spread1":            -6.636,
        "spread2":             0.226,
        "D2":                  2.301,
        "instability_ratio":   0.000110,
        "signal_quality":    844.98,
        "freq_range":         80.78,
        "complexity_score":    1.147,
        "voice_health_score": 191.4,
    }


# ---------------------------------------------------------------------------
# Linguistic helpers  (unchanged from original)
# ---------------------------------------------------------------------------

_FILLERS = {"uh", "um", "er", "ah", "like", "you know", "i mean"}
_VOWELS  = "aeiouAEIOU"


def _count_syllables(word: str) -> int:
    word = word.lower().strip(".,!?;:")
    if not word:
        return 0
    count = len(re.findall(r'[aeiou]+', word))
    return max(1, count)


def _mtld(tokens: list[str], threshold: float = 0.72) -> float:
    """Measure of Textual Lexical Diversity (simplified)."""
    if len(tokens) < 5:
        return float(len(set(tokens)))

    def _one_pass(toks):
        types, total, factors = set(), 0, 0.0
        for t in toks:
            types.add(t)
            total += 1
            ttr = len(types) / total
            if ttr <= threshold:
                factors += 1
                types, total = set(), 0
        if total > 0:
            factors += (1 - ttr) / (1 - threshold + 1e-10)
        return len(toks) / (factors + 1e-10)

    return float((_one_pass(tokens) + _one_pass(list(reversed(tokens)))) / 2)


def _hdd(tokens: list[str], draws: int = 42) -> float:
    """Hypergeometric Distribution Diversity (simplified)."""
    n = len(tokens)
    if n < draws:
        return len(set(tokens)) / (n + 1e-10)
    freq: dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    hdd_val = sum(1 - (1 - cnt / n) ** draws for cnt in freq.values())
    return float(hdd_val / (len(freq) + 1e-10))


def _extract_pauses_from_audio(audio_path: str) -> float:
    """Estimate pause frequency: number of silence segments per second."""
    try:
        y, sr = _load_audio(audio_path)
        duration = len(y) / sr
        if duration < 0.5:
            return 0.0
        intervals = librosa.effects.split(y, top_db=30)
        n_pauses = max(0, len(intervals) - 1)
        return float(n_pauses / duration)
    except Exception:
        return 0.1


# ---------------------------------------------------------------------------
# Public API — Linguistic (unchanged)
# ---------------------------------------------------------------------------

def extract_linguistic_features(text: str, audio_path: str | None = None) -> dict:
    """
    Returns the 13 linguistic features the model was trained on from the
    whisper-transcribed text (and optionally the source audio for pauses).
    """
    if not text or not text.strip():
        return _fallback_linguistic()

    tokens = re.findall(r"[a-zA-Z']+", text.lower())
    if len(tokens) < 3:
        return _fallback_linguistic()

    sentences = re.split(r'[.!?]+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    n_sent = max(1, len(sentences))
    n_tok  = len(tokens)

    ttr  = len(set(tokens)) / n_tok
    mtld = _mtld(tokens)
    hdd  = _hdd(tokens)

    word_lengths    = [len(w) for w in tokens]
    word_length_std = float(np.std(word_lengths))
    syllables       = [_count_syllables(w) for w in tokens]
    avg_syllables   = float(np.mean(syllables))

    words_per_sent = n_tok / n_sent

    common_adj_suffixes = ("ful", "ous", "ive", "al", "ible", "able", "ical")
    noun_suffixes       = ("tion", "ness", "ment", "ity", "ism", "ist", "er", "or")
    noun_count = sum(1 for w in tokens if w.endswith(noun_suffixes))
    adj_count  = sum(1 for w in tokens if w.endswith(common_adj_suffixes))
    noun_ratio = noun_count / n_tok
    adj_ratio  = adj_count  / n_tok

    filler_count     = sum(1 for w in tokens if w in _FILLERS)
    filler_ratio     = filler_count / n_tok
    rep_count        = sum(1 for a, b in zip(tokens, tokens[1:]) if a == b)
    repetition_ratio = rep_count / n_tok

    q_count        = sum(1 for s in sentences if s.strip().endswith("?"))
    question_ratio = q_count / n_sent

    parse_depth    = float(np.clip(words_per_sent / 5.0 + 1.5, 1.5, 6.0))
    pause_frequency = _extract_pauses_from_audio(audio_path) if audio_path else 0.12

    return {
        "lexical_diversity_mtld":     float(mtld),
        "pause_frequency":            float(pause_frequency),
        "parse_tree_depth_avg":       float(parse_depth),
        "lexical_diversity_ttr":      float(ttr),
        "adjective_ratio":            float(adj_ratio),
        "repetition_ratio":           float(repetition_ratio),
        "lexical_diversity_hdd":      float(hdd),
        "word_length_std":            float(word_length_std),
        "question_ratio":             float(question_ratio),
        "average_syllables_per_word": float(avg_syllables),
        "filler_ratio":               float(filler_ratio),
        "words_per_sentence":         float(words_per_sent),
        "noun_ratio":                 float(noun_ratio),
    }


def _fallback_linguistic() -> dict:
    return {
        "lexical_diversity_mtld":     72.5,
        "pause_frequency":             0.12,
        "parse_tree_depth_avg":        3.4,
        "lexical_diversity_ttr":       0.68,
        "adjective_ratio":             0.08,
        "repetition_ratio":            0.05,
        "lexical_diversity_hdd":       0.81,
        "word_length_std":             1.9,
        "question_ratio":              0.04,
        "average_syllables_per_word":  1.5,
        "filler_ratio":                0.03,
        "words_per_sentence":         12.3,
        "noun_ratio":                  0.22,
    }
