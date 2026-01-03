"""
Model loader utility for loading trained models from various formats.
Supports PyTorch, TensorFlow, scikit-learn, and other common formats.
"""
import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Base directory for models
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')


def load_model(model_path: Optional[str] = None, model_type: Optional[str] = None) -> Any:
    """
    Load a trained model from file.
    
    Args:
        model_path: Path to the model file. If None, searches for common model files.
        model_type: Type of model ('pytorch', 'tensorflow', 'sklearn', 'joblib', 'onnx', 'auto')
                   If 'auto', detects from file extension.
    
    Returns:
        Loaded model object
    """
    # If no path provided, search for model files
    if model_path is None:
        model_path = _find_model_file()
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    # Auto-detect model type from extension if not provided
    if model_type is None or model_type == 'auto':
        model_type = _detect_model_type(model_path)
    
    logger.info(f"Loading {model_type} model from {model_path}")
    
    # Load based on type
    if model_type == 'pytorch':
        return _load_pytorch_model(model_path)
    elif model_type == 'tensorflow':
        return _load_tensorflow_model(model_path)
    elif model_type == 'sklearn' or model_type == 'joblib':
        return _load_sklearn_model(model_path)
    elif model_type == 'onnx':
        return _load_onnx_model(model_path)
    elif model_type == 'pickle':
        return _load_pickle_model(model_path)
    else:
        raise ValueError(f"Unsupported model type: {model_type}")


def _find_model_file() -> str:
    """Find model file in models directory."""
    if not os.path.exists(MODELS_DIR):
        raise FileNotFoundError(f"Models directory not found: {MODELS_DIR}")
    
    # Common model file extensions
    extensions = ['.pth', '.pt', '.pkl', '.joblib', '.h5', '.pb', '.onnx', '.model']
    
    for file in os.listdir(MODELS_DIR):
        if any(file.endswith(ext) for ext in extensions):
            return os.path.join(MODELS_DIR, file)
    
    raise FileNotFoundError(f"No model file found in {MODELS_DIR}")


def _detect_model_type(model_path: str) -> str:
    """Detect model type from file extension."""
    ext = os.path.splitext(model_path)[1].lower()
    
    type_map = {
        '.pth': 'pytorch',
        '.pt': 'pytorch',
        '.pkl': 'pickle',
        '.joblib': 'sklearn',
        '.h5': 'tensorflow',
        '.pb': 'tensorflow',
        '.onnx': 'onnx',
    }
    
    return type_map.get(ext, 'pickle')  # Default to pickle


def _load_pytorch_model(model_path: str) -> Any:
    """Load PyTorch model."""
    try:
        import torch
        
        # Try loading as state dict first (requires model architecture)
        # If that fails, try loading entire model
        try:
            model = torch.load(model_path, map_location='cpu')
            if hasattr(model, 'eval'):
                model.eval()
            return model
        except Exception:
            # If loading fails, return the state dict
            # User will need to load it with their model architecture
            return torch.load(model_path, map_location='cpu')
    except ImportError:
        raise ImportError("PyTorch not installed. Install with: pip install torch")


def _load_tensorflow_model(model_path: str) -> Any:
    """Load TensorFlow/Keras model."""
    try:
        import tensorflow as tf
        
        # Try loading as Keras model
        try:
            return tf.keras.models.load_model(model_path)
        except Exception:
            # Try loading as SavedModel
            return tf.saved_model.load(model_path)
    except ImportError:
        raise ImportError("TensorFlow not installed. Install with: pip install tensorflow")


def _load_sklearn_model(model_path: str) -> Any:
    """Load scikit-learn model."""
    try:
        import joblib
        return joblib.load(model_path)
    except ImportError:
        try:
            import pickle
            with open(model_path, 'rb') as f:
                return pickle.load(f)
        except Exception as e:
            raise ImportError(f"Could not load sklearn model. Install joblib: pip install joblib. Error: {e}")


def _load_onnx_model(model_path: str) -> Any:
    """Load ONNX model."""
    try:
        import onnxruntime as ort
        return ort.InferenceSession(model_path)
    except ImportError:
        raise ImportError("ONNX Runtime not installed. Install with: pip install onnxruntime")


def _load_pickle_model(model_path: str) -> Any:
    """Load pickle model."""
    import pickle
    with open(model_path, 'rb') as f:
        return pickle.load(f)

