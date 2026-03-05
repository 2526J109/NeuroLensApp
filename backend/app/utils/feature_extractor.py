"""
Feature extraction utility for voice analysis.
Extracts audio features needed for Parkinson's disease detection model prediction.

Acoustic Model Features (7):
- PPE (Pitch Period Entropy)
- RPDE (Recurrence Period Density Entropy)
- HNR (Harmonic-to-Noise Ratio)
- Shimmer
- Jitter(%)
- NHR (Noise-to-Harmonic Ratio)
- age

Linguistic Model Features (13):
- coleman_liau_index, noun_ratio, lexical_diversity_ttr, flesch_reading_ease
- words_per_sentence, question_ratio, lexical_diversity_hdd
- average_syllables_per_word, function_word_ratio, adjective_ratio
- pronoun_ratio, filler_ratio, pause_frequency
"""
import numpy as np
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def extract_acoustic_features(audio_data: np.ndarray, sample_rate: int = 22050) -> np.ndarray:
    """
    Extract acoustic features from audio data for Parkinson's detection.
    
    Returns 7 features:
    1. PPE (Pitch Period Entropy)
    2. RPDE (Recurrence Period Density Entropy)
    3. HNR (Harmonic-to-Noise Ratio)
    4. Shimmer
    5. Jitter(%)
    6. NHR (Noise-to-Harmonic Ratio)
    7. age (placeholder - use 0 or get from user profile)
    
    Args:
        audio_data: Audio signal as numpy array
        sample_rate: Sample rate of the audio
    
    Returns:
        Feature vector of 7 acoustic features
    """
    try:
        import librosa
        
        features = []
        
        # 1. PPE (Pitch Period Entropy) - simplified calculation
        pitches, magnitudes = librosa.piptrack(y=audio_data, sr=sample_rate)
        pitch_values = pitches[pitches > 0]
        if len(pitch_values) > 0:
            ppe = -np.sum((pitch_values / np.sum(pitch_values)) * np.log2(pitch_values / np.sum(pitch_values) + 1e-10))
        else:
            ppe = 0.0
        features.append(ppe)
        
        # 2. RPDE (Recurrence Period Density Entropy) - simplified
        # Using spectral entropy as a proxy
        D = librosa.stft(audio_data)
        S = np.abs(D) ** 2
        S_normalized = S / np.sum(S)
        rpde = -np.sum(S_normalized[S_normalized > 0] * np.log2(S_normalized[S_normalized > 0] + 1e-10))
        features.append(rpde / np.log2(S.shape[0] * S.shape[1]) if rpde > 0 else 0.0)
        
        # 3. HNR (Harmonic-to-Noise Ratio)
        # Estimate harmonic and noise components
        harmonic = librosa.effects.harmonic(audio_data)
        noise = audio_data - harmonic
        harmonic_power = np.mean(harmonic ** 2)
        noise_power = np.mean(noise ** 2)
        hnr = 10 * np.log10(harmonic_power / (noise_power + 1e-10))
        features.append(max(0, hnr))
        
        # 4. Shimmer (amplitude variation)
        # Frame-based amplitude variation
        frame_length = int(0.02 * sample_rate)  # 20ms frames
        frames = librosa.util.frame(np.abs(audio_data), frame_length=frame_length, hop_length=frame_length // 2)
        frame_energies = np.mean(frames ** 2, axis=0)
        if len(frame_energies) > 1:
            shimmer = np.mean(np.abs(np.diff(frame_energies)) / (frame_energies[:-1] + 1e-10))
        else:
            shimmer = 0.0
        features.append(shimmer)
        
        # 5. Jitter (%) (frequency variation)
        # Estimate F0 and measure variation
        f0_times, f0_values = librosa.piptrack(y=audio_data, sr=sample_rate, threshold=0.1)
        f0_track = f0_values[np.argmax(f0_values, axis=0), np.arange(f0_values.shape[1])]
        f0_track = f0_track[f0_track > 0]
        if len(f0_track) > 1:
            jitter = np.mean(np.abs(np.diff(f0_track)) / (f0_track[:-1] + 1e-10)) * 100
        else:
            jitter = 0.0
        features.append(jitter)
        
        # 6. NHR (Noise-to-Harmonic Ratio) - inverse of HNR
        nhr = 1.0 / (10 ** (hnr / 10) + 1e-10)
        features.append(nhr)
        
        # 7. Age (placeholder - should come from user profile, default to 0)
        features.append(0.0)
        
        return np.array(features)
        
    except ImportError:
        logger.warning("librosa not installed. Cannot extract acoustic features.")
        return None
    except Exception as e:
        logger.error(f"Error extracting acoustic features: {e}")
        return None


def extract_linguistic_features(text: str) -> np.ndarray:
    """
    Extract linguistic features from transcribed text.
    
    Returns 13 features:
    1. coleman_liau_index
    2. noun_ratio
    3. lexical_diversity_ttr
    4. flesch_reading_ease
    5. words_per_sentence
    6. question_ratio
    7. lexical_diversity_hdd
    8. average_syllables_per_word
    9. function_word_ratio
    10. adjective_ratio
    11. pronoun_ratio
    12. filler_ratio
    13. pause_frequency
    
    Args:
        text: Transcribed text from voice
    
    Returns:
        Feature vector of 13 linguistic features
    """
    try:
        import nltk
        from nltk.corpus import stopwords
        from nltk.tokenize import sent_tokenize, word_tokenize
        from nltk.tag import pos_tag
        from nltk.corpus import wordnet
        
        # Download required NLTK data
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt', quiet=True)
        try:
            nltk.data.find('taggers/averaged_perceptron_tagger')
        except LookupError:
            nltk.download('averaged_perceptron_tagger', quiet=True)
        try:
            nltk.data.find('corpora/wordnet')
        except LookupError:
            nltk.download('wordnet', quiet=True)
        
        features = []
        
        # Tokenize
        sentences = sent_tokenize(text)
        words = word_tokenize(text.lower())
        words = [w for w in words if w.isalnum()]
        
        # 1. Coleman-Liau Index
        chars = len([c for c in text if c.isalpha()])
        spaces = len([c for c in text if c.isspace()])
        sentences_count = len(sentences) if len(sentences) > 0 else 1
        cli = (0.06 * (chars / max(len(words), 1)) * 100) - (0.02 * (sentences_count / max(len(words), 1)) * 100) - 2.66
        features.append(max(0, cli))
        
        # POS tagging
        pos_tags = pos_tag(words)
        
        # 2. Noun Ratio
        noun_count = sum(1 for _, pos in pos_tags if pos.startswith('NN'))
        features.append(noun_count / max(len(words), 1))
        
        # 3. Lexical Diversity (Type-Token Ratio)
        unique_words = len(set(words))
        ttr = unique_words / max(len(words), 1)
        features.append(ttr)
        
        # 4. Flesch Reading Ease
        syllables = sum(count_syllables(w) for w in words)
        fre = 206.835 - (1.015 * (len(words) / max(sentences_count, 1))) - (84.6 * (syllables / max(len(words), 1)))
        features.append(max(0, min(100, fre)))
        
        # 5. Words per Sentence
        wps = len(words) / max(sentences_count, 1)
        features.append(wps)
        
        # 6. Question Ratio
        question_count = sum(1 for s in sentences if s.strip().endswith('?'))
        features.append(question_count / max(sentences_count, 1))
        
        # 7. Lexical Diversity (Honore's R) - simplified
        hdd = (unique_words ** 2) / max((2 * len(words)) - unique_words, 1)
        features.append(hdd)
        
        # 8. Average Syllables per Word
        avg_syllables = syllables / max(len(words), 1) if len(words) > 0 else 0
        features.append(avg_syllables)
        
        # 9. Function Word Ratio
        function_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from'}
        fw_count = sum(1 for w in words if w in function_words)
        features.append(fw_count / max(len(words), 1))
        
        # 10. Adjective Ratio
        adj_count = sum(1 for _, pos in pos_tags if pos.startswith('JJ'))
        features.append(adj_count / max(len(words), 1))
        
        # 11. Pronoun Ratio
        pronoun_count = sum(1 for _, pos in pos_tags if pos in ['PRP', 'PRP$', 'WP', 'WP$'])
        features.append(pronoun_count / max(len(words), 1))
        
        # 12. Filler Ratio (um, uh, ah, etc.)
        fillers = {'um', 'uh', 'ah', 'er', 'like', 'you know', 'i mean'}
        filler_count = sum(1 for w in words if w in fillers)
        features.append(filler_count / max(len(words), 1))
        
        # 13. Pause Frequency (commas, ellipses, dashes as proxies)
        pause_marks = text.count(',') + text.count('...') + text.count('—') + text.count('--')
        features.append(pause_marks / max(sentences_count, 1))
        
        return np.array(features)
        
    except Exception as e:
        logger.warning(f"Error extracting linguistic features: {e}")
        return None


def count_syllables(word: str) -> int:
    """
    Estimate syllable count for a word.
    """
    word = word.lower()
    syllable_count = 0
    vowels = 'aeiou'
    previous_was_vowel = False
    
    for char in word:
        is_vowel = char in vowels
        if is_vowel and not previous_was_vowel:
            syllable_count += 1
        previous_was_vowel = is_vowel
    
    # Adjust for silent 'e'
    if word.endswith('e'):
        syllable_count -= 1
    
    # Ensure minimum of 1 syllable
    return max(1, syllable_count)


def extract_features(audio_data: np.ndarray, sample_rate: int = 22050) -> np.ndarray:
    """
    Extract all features from audio data (acoustic features).
    For linguistic features, use extract_linguistic_features with transcribed text.
    
    Args:
        audio_data: Audio signal as numpy array
        sample_rate: Sample rate of the audio
    
    Returns:
        Feature vector (7 acoustic features)
    """
    return extract_acoustic_features(audio_data, sample_rate)


def extract_features_from_file(audio_path: str) -> np.ndarray:
    """
    Extract acoustic features from audio file.
    
    Args:
        audio_path: Path to audio file
    
    Returns:
        Feature vector (7 acoustic features)
    """
    try:
        import librosa
        audio, sr = librosa.load(audio_path, sr=None)
        return extract_acoustic_features(audio, sr)
    except Exception as e:
        logger.error(f"Error extracting features from {audio_path}: {e}")
        return None

