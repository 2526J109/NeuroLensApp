import os
import numpy as np
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

from ..utils.model_loader import load_model
try:
    from ..utils.feature_extractor import extract_features_from_file
    FEATURE_EXTRACTION_AVAILABLE = True
except ImportError:
    FEATURE_EXTRACTION_AVAILABLE = False
    logger.warning("Feature extraction not available. Install librosa for audio processing.")


class VoiceAnalysisService:
    """
    Service for analyzing voice recordings and generating predictions.
    Loads and uses trained ML model for predictions.
    """
    
    def __init__(self, model_path: Optional[str] = None, model_type: Optional[str] = None):
        """
        Initialize the voice analysis service.
        
        Args:
            model_path: Path to the trained model file. If None, auto-detects from models directory.
            model_type: Type of model ('pytorch', 'tensorflow', 'sklearn', 'auto'). If None, auto-detects.
        """
        self.results_store: Dict[str, dict] = {}
        self.model: Optional[Any] = None
        self.model_loaded = False
        
        # Try to load model
        try:
            self.model = load_model(model_path, model_type)
            self.model_loaded = True
            logger.info("Model loaded successfully")
        except FileNotFoundError as e:
            logger.warning(f"Model not found: {e}. Using simulated predictions.")
            self.model_loaded = False
        except Exception as e:
            logger.error(f"Error loading model: {e}. Using simulated predictions.")
            self.model_loaded = False
    
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
            # TODO: Replace this with actual model prediction
            # For now, this is a placeholder that simulates model predictions
            
            # Analyze each recording
            analysis_results = []
            for recording in recordings:
                prompt_id = recording.get('prompt_id', 0)
                duration = recording.get('duration', 0)
                audio_uri = recording.get('uri', '')
                
                # Use actual model if available, otherwise simulate
                if self.model_loaded:
                    try:
                        # Try to use model prediction
                        # Note: If audio_uri is not a file path, you may need to handle it differently
                        result = await self._predict_with_model(prompt_id, duration, audio_uri)
                    except Exception as e:
                        logger.error(f"Error in model prediction: {e}. Using fallback.")
                        result = self._simulate_prediction(prompt_id, duration)
                else:
                    # Fallback to simulation if model not loaded
                    result = self._simulate_prediction(prompt_id, duration)
                
                analysis_results.append(result)
            
            # Aggregate results from all recordings
            aggregated_result = self._aggregate_results(analysis_results)
            
            # Store result
            self.results_store[session_id] = {
                'result': aggregated_result,
                'status': 'completed',
                'created_at': datetime.now().isoformat()
            }
            
            return aggregated_result
            
        except Exception as e:
            logger.error(f"Error analyzing recordings: {str(e)}")
            raise
    
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
    
    async def _predict_with_model(self, prompt_id: int, duration: float, audio_uri: str) -> dict:
        """
        Make prediction using the loaded model.
        
        This method handles different model types (PyTorch, TensorFlow, sklearn, etc.)
        Modify this method to match your specific model's input/output format.
        
        Args:
            prompt_id: ID of the prompt
            duration: Duration of recording
            audio_uri: URI/path to audio file
        
        Returns:
            Dictionary with prediction results
        """
        if not self.model:
            raise ValueError("Model not loaded")
        
        # Extract features from audio file
        # Note: If your model doesn't need audio files, you can skip this
        # and use metadata-based features instead
        if FEATURE_EXTRACTION_AVAILABLE and audio_uri and os.path.exists(audio_uri):
            try:
                features = extract_features_from_file(audio_uri)
            except Exception as e:
                logger.warning(f"Could not extract features from {audio_uri}: {e}")
                # Fallback: use duration and prompt_id as features if audio extraction fails
                features = np.array([prompt_id, duration])
        else:
            # If no audio file available, use metadata-based features
            # You may need to adjust this based on your model's requirements
            logger.info(f"Using metadata-based features (no audio file: {audio_uri})")
            features = np.array([prompt_id, duration])
            # If your model needs more features, you can add them here
            # For example: features = np.array([prompt_id, duration, ...])
        
        # Make prediction based on model type
        prediction = self._run_model_inference(features)
        
        # Convert prediction to score (0-100)
        # Adjust this based on your model's output format
        if isinstance(prediction, (list, np.ndarray)):
            score = float(prediction[0]) if len(prediction) > 0 else 75.0
        else:
            score = float(prediction)
        
        # Ensure score is in 0-100 range
        # If your model outputs probabilities (0-1), multiply by 100
        if score < 1.0:
            score = score * 100
        
        score = max(0, min(100, score))
        
        return {
            'prompt_id': prompt_id,
            'score': score,
            'duration': duration
        }
    
    def _run_model_inference(self, features: np.ndarray) -> Any:
        """
        Run inference on the model with extracted features.
        
        This method handles different model types. Modify based on your model.
        """
        # Reshape features if needed (add batch dimension)
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        # PyTorch model
        if hasattr(self.model, 'forward') or hasattr(self.model, '__call__'):
            try:
                import torch
                if isinstance(self.model, torch.nn.Module):
                    features_tensor = torch.tensor(features, dtype=torch.float32)
                    with torch.no_grad():
                        prediction = self.model(features_tensor)
                        if isinstance(prediction, torch.Tensor):
                            return prediction.cpu().numpy()
                        return prediction
            except ImportError:
                pass
        
        # TensorFlow/Keras model
        if hasattr(self.model, 'predict'):
            try:
                import tensorflow as tf
                if isinstance(self.model, (tf.keras.Model, tf.Module)):
                    prediction = self.model.predict(features, verbose=0)
                    return prediction
            except ImportError:
                pass
        
        # scikit-learn model
        if hasattr(self.model, 'predict'):
            try:
                prediction = self.model.predict(features)
                # If model outputs probabilities, get the class probability
                if hasattr(self.model, 'predict_proba'):
                    proba = self.model.predict_proba(features)
                    # Use probability of positive class or weighted average
                    if proba.shape[1] == 2:
                        return proba[0][1]  # Probability of positive class
                    else:
                        return np.mean(proba[0])
                return prediction[0] if len(prediction) > 0 else prediction
            except Exception:
                pass
        
        # ONNX model
        if hasattr(self.model, 'run'):
            try:
                # ONNX models need input name
                input_name = self.model.get_inputs()[0].name
                prediction = self.model.run(None, {input_name: features.astype(np.float32)})
                return prediction[0][0] if len(prediction) > 0 else prediction[0]
            except Exception:
                pass
        
        # Generic callable
        try:
            prediction = self.model(features)
            return prediction
        except Exception as e:
            logger.error(f"Error running model inference: {e}")
            raise ValueError(f"Could not run inference on model. Error: {e}")

