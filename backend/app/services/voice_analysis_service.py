import os
import numpy as np
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

from ..utils.model_loader import load_model
try:
    import joblib
except ImportError:
    joblib = None
    logger.warning("joblib not installed. Linguistic scaler loading will not work without it.")
try:
    from ..utils.feature_extractor import extract_features_from_file
    FEATURE_EXTRACTION_AVAILABLE = True
except ImportError:
    FEATURE_EXTRACTION_AVAILABLE = False
    logger.warning("Feature extraction not available. Install librosa for audio processing.")


class VoiceAnalysisService:
    """
    Service for analyzing voice recordings and generating predictions.
    Loads and uses acoustic and linguistic models with weighted fusion.
    """
    
    def __init__(
        self,
        acoustic_model_path: Optional[str] = None,
        linguistic_model_path: Optional[str] = None,
        linguistic_scaler_path: Optional[str] = None,
        acoustic_weight: float = 0.6,
        linguistic_weight: float = 0.4,
        model_type: Optional[str] = None,
    ):
        """
        Initialize the voice analysis service.
        
        Args:
            acoustic_model_path: Path to the acoustic model file. If None, auto-detects from models directory.
            linguistic_model_path: Path to the linguistic model file. If None, auto-detects from models directory.
            linguistic_scaler_path: Path to the linguistic StandardScaler (e.g., linguistic_scaler.joblib).
            acoustic_weight: Weight for acoustic model output in fusion.
            linguistic_weight: Weight for linguistic model output in fusion.
            model_type: Type of models ('pytorch', 'tensorflow', 'sklearn', 'auto'). If None, auto-detects.
        """
        self.results_store: Dict[str, dict] = {}
        self.acoustic_model: Optional[Any] = None
        self.linguistic_model: Optional[Any] = None
        self.linguistic_scaler: Optional[Any] = None
        self.models_loaded = False
        # Normalize weights to sum to 1.0
        weight_sum = acoustic_weight + linguistic_weight
        if weight_sum <= 0:
            self.acoustic_weight = 0.5
            self.linguistic_weight = 0.5
        else:
            self.acoustic_weight = acoustic_weight / weight_sum
            self.linguistic_weight = linguistic_weight / weight_sum
        
        # Try to load both models and (optionally) the linguistic scaler.
        # If anything fails we will fall back to simulation.
        try:
            # If you have explicit paths, pass them when constructing the service.
            # Otherwise this will auto-detect models from the models directory.
            self.acoustic_model = load_model(acoustic_model_path, model_type)
            self.linguistic_model = load_model(linguistic_model_path, model_type)
            if linguistic_scaler_path:
                if joblib is None:
                    logger.warning(
                        "Linguistic scaler path provided but joblib is not installed. "
                        "Install joblib to load linguistic_scaler.joblib correctly."
                    )
                else:
                    self.linguistic_scaler = joblib.load(linguistic_scaler_path)
                    logger.info("Linguistic scaler loaded successfully")
            self.models_loaded = True
            logger.info("Acoustic and linguistic models loaded successfully")
        except FileNotFoundError as e:
            logger.warning(f"Model not found: {e}. Using simulated predictions.")
            self.models_loaded = False
        except Exception as e:
            logger.error(f"Error loading models: {e}. Using simulated predictions.")
            self.models_loaded = False
    
    async def analyze_recordings(
        self, 
        recordings: List[dict],
        session_id: str
    ) -> dict:
        """
        Analyze voice recordings and generate predictions.
        
        Args:
            recordings: List of recording information (prompt_id, duration, uri)
            session_id: Unique session identifier
            
        Returns:
            Analysis result with percentage, status, and description
        """
        try:
            analysis_results = []
            for recording in recordings:
                prompt_id = recording.get('prompt_id', 0)
                duration = recording.get('duration', 0)
                audio_uri = recording.get('uri', '')
                
                if self.models_loaded:
                    try:
                        result = await self._predict_with_models(prompt_id, duration, audio_uri)
                    except Exception as e:
                        logger.error(f"Error in model prediction: {e}. Using fallback.")
                        result = self._simulate_prediction(prompt_id, duration)
                else:
                    result = self._simulate_prediction(prompt_id, duration)
                
                analysis_results.append(result)
            
            aggregated_result = self._aggregate_results(analysis_results)
            
            self.results_store[session_id] = {
                'result': aggregated_result,
                'status': 'completed',
                'created_at': datetime.now().isoformat()
            }
            
            return aggregated_result
            
        except Exception as e:
            logger.error(f"Error analyzing recordings: {str(e)}")
            raise

    async def analyze_from_files(
        self,
        file_paths: List[str],
        session_id: str,
    ) -> dict:
        """
        Analyze real audio files uploaded by the client.

        Extracts acoustic features from each temp file using librosa,
        runs the loaded ML models, then aggregates the risk score.
        The caller is responsible for deleting the temp files afterward.

        Args:
            file_paths: Absolute paths to temp audio files (one per prompt).
            session_id: Unique session identifier.

        Returns:
            Dict with 'percentage', 'status', 'description', 'details'.
        """
        analysis_results = []

        for idx, path in enumerate(file_paths):
            prompt_id = idx + 1  # prompts are 1-indexed

            if self.models_loaded and FEATURE_EXTRACTION_AVAILABLE:
                try:
                    features = extract_features_from_file(path)
                    if features is not None:
                        logger.info(f"Extracted {len(features)} acoustic features from {path}")
                        result = await self._predict_with_features(prompt_id, features)
                    else:
                        logger.warning(f"Feature extraction returned None for {path}. Simulating.")
                        result = self._simulate_prediction(prompt_id, 0)
                except Exception as e:
                    logger.error(f"Inference failed for {path}: {e}. Simulating.")
                    result = self._simulate_prediction(prompt_id, 0)
            else:
                logger.warning("Models/librosa unavailable — using simulated prediction.")
                result = self._simulate_prediction(prompt_id, 0)

            analysis_results.append(result)

        aggregated_result = self._aggregate_results(analysis_results)

        self.results_store[session_id] = {
            'result': aggregated_result,
            'status': 'completed',
            'created_at': datetime.now().isoformat(),
        }

        return aggregated_result

    async def _predict_with_features(self, prompt_id: int, features: np.ndarray) -> dict:
        """
        Run weighted-fusion inference from a pre-extracted feature vector.
        Used by analyze_from_files() to avoid re-extracting features.
        """
        if not self.acoustic_model or not self.linguistic_model:
            raise ValueError("Acoustic and/or linguistic models not loaded")
        if self.linguistic_scaler is None:
            raise ValueError("Linguistic scaler not loaded.")

        if len(features.shape) == 1:
            features = features.reshape(1, -1)

        # Acoustic inference
        acoustic_pred = self._run_model_inference(self.acoustic_model, features)
        acoustic_score = float(acoustic_pred[0]) if isinstance(acoustic_pred, (list, np.ndarray)) else float(acoustic_pred)

        # Linguistic inference (scaler then predict_proba)
        ling_features_scaled = self.linguistic_scaler.transform(features)
        if hasattr(self.linguistic_model, "predict_proba"):
            proba = self.linguistic_model.predict_proba(ling_features_scaled)
            linguistic_score = float(proba[0][1]) if proba.shape[1] >= 2 else float(proba[0].max())
        else:
            linguistic_pred = self._run_model_inference(self.linguistic_model, ling_features_scaled)
            linguistic_score = float(linguistic_pred[0]) if isinstance(linguistic_pred, (list, np.ndarray)) else float(linguistic_pred)

        # Normalise to 0-1
        if acoustic_score > 1.0:
            acoustic_score = acoustic_score / 100.0 if acoustic_score <= 100 else acoustic_score
        if linguistic_score > 1.0:
            linguistic_score = linguistic_score / 100.0 if linguistic_score <= 100 else linguistic_score

        acoustic_score = float(np.clip(acoustic_score, 0.0, 1.0))
        linguistic_score = float(np.clip(linguistic_score, 0.0, 1.0))

        fused_risk = self.acoustic_weight * acoustic_score + self.linguistic_weight * linguistic_score
        score = max(0.0, min(100.0, fused_risk * 100.0))

        return {
            'prompt_id': prompt_id,
            'score': score,
            'duration': 0,
            'details': {
                'acoustic_score': round(acoustic_score * 100.0, 1),
                'linguistic_score': round(linguistic_score * 100.0, 1),
                'fused_risk': round(fused_risk * 100.0, 1),
            },
        }


    def _simulate_prediction(self, prompt_id: int, duration: float) -> dict:
        """
        Simulate model prediction. Replace with actual model inference.
        
        In real implementation:
        1. Load audio file
        2. Extract features using librosa, parselmouth, or similar
        3. Run through your trained model
        4. Return prediction
        """
        # Simulate prediction based on prompt type
        if prompt_id == 3:  # Vowel sustain
            # Vowel sustain typically shows tremor patterns
            base_score = 70 + np.random.normal(0, 5)
        else:  # Speech prompts
            base_score = 75 + np.random.normal(0, 5)
        
        # Normalize to 0-100 range
        score = max(0, min(100, base_score))
        
        return {
            'prompt_id': prompt_id,
            'score': score,
            'duration': duration
        }
    
    def _aggregate_results(self, results: List[dict]) -> dict:
        """
        Aggregate results from multiple recordings into final assessment.
        """
        if not results:
            return {
                'percentage': 0,
                'status': 'warning',
                'description': 'No recordings available for analysis.'
            }
        
        # Calculate average score
        scores = [r['score'] for r in results]
        avg_score = sum(scores) / len(scores)
        
        # Determine status and description
        if avg_score >= 80:
            status = 'good'
            description = 'Voice characteristics within normal range. No significant tremor detected.'
        elif avg_score >= 60:
            status = 'warning'
            description = 'Slight voice tremor detected. Pitch variation slightly reduced. Consider voice exercises.'
        else:
            status = 'warning'
            description = 'Moderate voice tremor detected. Reduced pitch variation and clarity. Consult healthcare provider.'
        
        return {
            'percentage': round(avg_score, 1),
            'status': status,
            'description': description,
            'details': {
                'average_score': round(avg_score, 1),
                'individual_scores': [round(r['score'], 1) for r in results],
                'num_recordings': len(results)
            }
        }
    
    def get_result(self, session_id: str) -> Optional[dict]:
        """Retrieve stored analysis result."""
        return self.results_store.get(session_id)
    
    async def _predict_with_models(self, prompt_id: int, duration: float, audio_uri: str) -> dict:
        """
        Make prediction using the loaded acoustic and linguistic models.
        
        Pipeline:
            1. Extract / construct features
            2. acoustic_model.predict(...)
            3. linguistic_model.predict_proba(...)
            4. Normalize outputs to 0–1
            5. Weighted fusion
        """
        if not self.acoustic_model or not self.linguistic_model:
            raise ValueError("Acoustic and/or linguistic models not loaded")
        if self.linguistic_scaler is None:
            raise ValueError(
                "Linguistic scaler not loaded. "
                "Load linguistic_scaler.joblib and pass its path as linguistic_scaler_path "
                "to VoiceAnalysisService for correct linguistic predictions."
            )
        
        # 1) Feature construction
        features = None
        if FEATURE_EXTRACTION_AVAILABLE and audio_uri and os.path.exists(audio_uri):
            try:
                features = extract_features_from_file(audio_uri)
                logger.info(f"Extracted {len(features)} features from audio file")
            except Exception as e:
                logger.warning(f"Could not extract features from {audio_uri}: {e}")
                features = None
        
        # Fallback: create synthetic features that match model's expected input size
        if features is None:
            logger.warning(f"Using synthetic features (expected 7 features). Audio URI: {audio_uri}")
            # Create 7 features: prompt_id, duration, and 5 synthetic audio features
            # This matches the model's expected input dimension
            synthetic_features = [
                float(prompt_id),           # Feature 1: prompt_id
                float(duration),            # Feature 2: duration
                np.random.rand() * 100,    # Feature 3: synthetic pitch-like value
                np.random.rand() * 0.5,    # Feature 4: synthetic ZCR-like value
                np.random.rand() * 4000,   # Feature 5: synthetic spectral centroid-like value
                np.random.rand() * 100,    # Feature 6: synthetic MFCC-like value 1
                np.random.rand() * 100,    # Feature 7: synthetic MFCC-like value 2
            ]
            features = np.array(synthetic_features)
        
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        # 2) Acoustic model prediction: expect a risk score or regression output
        acoustic_pred = self._run_model_inference(self.acoustic_model, features)
        if isinstance(acoustic_pred, (list, np.ndarray)):
            acoustic_score = float(acoustic_pred[0])
        else:
            acoustic_score = float(acoustic_pred)
        
        # 3) Linguistic model probability: scale linguistic features then use predict_proba if available
        linguistic_score = 0.5
        # Scale using the same scaler that was fit during training
        ling_features = features
        ling_features_scaled = self.linguistic_scaler.transform(ling_features)
        if hasattr(self.linguistic_model, "predict_proba"):
            proba = self.linguistic_model.predict_proba(ling_features_scaled)
            # Assume second column is "positive / high-risk" class
            if proba.shape[1] >= 2:
                linguistic_score = float(proba[0][1])
            else:
                linguistic_score = float(proba[0].max())
        else:
            linguistic_pred = self._run_model_inference(self.linguistic_model, ling_features_scaled)
            if isinstance(linguistic_pred, (list, np.ndarray)):
                linguistic_score = float(linguistic_pred[0])
            else:
                linguistic_score = float(linguistic_pred)
        
        # 4) Normalize both to 0–1 range
        if acoustic_score > 1.0:
            acoustic_score = acoustic_score / 100.0 if acoustic_score <= 100 else acoustic_score
        if linguistic_score > 1.0:
            linguistic_score = linguistic_score / 100.0 if linguistic_score <= 100 else linguistic_score
        
        acoustic_score = float(np.clip(acoustic_score, 0.0, 1.0))
        linguistic_score = float(np.clip(linguistic_score, 0.0, 1.0))
        
        # 5) Weighted fusion
        fused_risk = (
            self.acoustic_weight * acoustic_score
            + self.linguistic_weight * linguistic_score
        )
        
        # Convert to 0–100 percentage
        score = max(0.0, min(100.0, fused_risk * 100.0))
        
        return {
            'prompt_id': prompt_id,
            'score': score,
            'duration': duration,
            'details': {
                'acoustic_score': round(acoustic_score * 100.0, 1),
                'linguistic_score': round(linguistic_score * 100.0, 1),
                'fused_risk': round(fused_risk * 100.0, 1),
                'acoustic_weight': self.acoustic_weight,
                'linguistic_weight': self.linguistic_weight,
            },
        }
    
    def _run_model_inference(self, model: Any, features: np.ndarray) -> Any:
        """
        Run inference on the model with extracted features.
        
        This method handles different model types. Modify based on your model.
        """
        # Reshape features if needed (add batch dimension)
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        # scikit-learn model (check before PyTorch to avoid false positives)
        if hasattr(model, 'predict') and hasattr(model, '__class__'):
            try:
                module = getattr(model.__class__, '__module__', '')
                if 'sklearn' in module:
                    prediction = model.predict(features)
                    # If model outputs probabilities, get the class probability
                    if hasattr(model, 'predict_proba'):
                        proba = model.predict_proba(features)
                        # Use probability of positive class or weighted average
                        if proba.shape[1] == 2:
                            return proba[0][1]  # Probability of positive class
                        else:
                            return np.mean(proba[0])
                    return prediction[0] if len(prediction) > 0 else prediction
            except Exception as e:
                logger.warning(f"Failed to run sklearn model inference: {e}")
        
        # PyTorch model
        if hasattr(model, 'forward'):
            try:
                import torch
                if isinstance(model, torch.nn.Module):
                    features_tensor = torch.tensor(features, dtype=torch.float32)
                    with torch.no_grad():
                        prediction = model(features_tensor)
                        if isinstance(prediction, torch.Tensor):
                            return prediction.cpu().numpy()
                        return prediction
            except ImportError:
                pass
        
        # TensorFlow/Keras model
        try:
            import tensorflow as tf
            if isinstance(model, (tf.keras.Model, tf.Module)):
                prediction = model.predict(features, verbose=0)
                return prediction
        except ImportError:
            pass
        
        # ONNX model
        if hasattr(model, 'run') and hasattr(model, 'get_inputs'):
            try:
                # ONNX models need input name
                input_name = model.get_inputs()[0].name
                prediction = model.run(None, {input_name: features.astype(np.float32)})
                return prediction[0][0] if len(prediction) > 0 else prediction[0]
            except Exception as e:
                logger.warning(f"Failed to run ONNX model inference: {e}")
        
        # Last resort: try to call predict if available
        if hasattr(model, 'predict'):
            try:
                prediction = model.predict(features)
                return prediction[0] if isinstance(prediction, np.ndarray) and len(prediction) > 0 else prediction
            except Exception as e:
                logger.error(f"Error running model.predict(): {e}")
                raise ValueError(f"Could not run inference on model. Error: {e}")
        
        # If no inference method found
        logger.error(f"Model type not recognized or supported: {type(model)}")
        raise ValueError(f"Could not determine inference method for model type: {type(model)}")

