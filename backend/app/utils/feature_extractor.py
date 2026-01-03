"""
Feature extraction utility for voice analysis.
Extracts audio features needed for model prediction.
"""
import numpy as np
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


def extract_features(audio_data: np.ndarray, sample_rate: int = 22050) -> np.ndarray:
    """
    Extract features from audio data.
    
    This is a placeholder. Replace with your actual feature extraction logic
    that matches what you used during training in Colab.
    
    Args:
        audio_data: Audio signal as numpy array
        sample_rate: Sample rate of the audio
    
    Returns:
        Feature vector as numpy array
    """
    try:
        import librosa
        
        features = []
        
        # Example feature extraction (replace with your actual features)
        # Pitch (F0)
        pitches, magnitudes = librosa.piptrack(y=audio_data, sr=sample_rate)
        pitch_mean = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
        
        # MFCC features
        mfccs = librosa.feature.mfcc(y=audio_data, sr=sample_rate, n_mfcc=13)
        mfcc_mean = np.mean(mfccs, axis=1)
        
        # Zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(audio_data)[0]
        zcr_mean = np.mean(zcr)
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=audio_data, sr=sample_rate)[0]
        spectral_mean = np.mean(spectral_centroids)
        
        # Combine features
        features.extend([pitch_mean, zcr_mean, spectral_mean])
        features.extend(mfcc_mean.tolist())
        
        return np.array(features)
        
    except ImportError:
        logger.warning("librosa not installed. Using placeholder features.")
        # Return placeholder features (replace with your actual feature count)
        return np.random.rand(20)  # Adjust size to match your model's input


def extract_features_from_file(audio_path: str) -> np.ndarray:
    """
    Extract features from audio file.
    
    Args:
        audio_path: Path to audio file
    
    Returns:
        Feature vector as numpy array
    """
    try:
        import librosa
        audio, sr = librosa.load(audio_path, sr=None)
        return extract_features(audio, sr)
    except Exception as e:
        logger.error(f"Error extracting features from {audio_path}: {e}")
        raise

