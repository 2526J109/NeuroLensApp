// API Configuration
// Update this URL to match your backend server
// For development: use your local IP address (e.g., http://192.168.1.100:8000)
// For production: use your production API URL

// For mobile testing, replace localhost with your computer's IP address
// Example: 'http://192.168.1.100:8000'
const getApiBaseUrl = () => {
  // If you set EXPO_PUBLIC_API_BASE_URL, it will override everything (best for real device testing).
  // Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000/api
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Development mode - backend runs locally
    // NOTE: main.py prefixes all routes with /api (API_V1_STR),
    // so we include /api here to avoid duplicating it everywhere.
    // Android emulator cannot reach your PC via localhost; use 10.0.2.2.
    // For physical devices, set EXPO_PUBLIC_API_BASE_URL to your LAN IP.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') return 'https://neurolens-api-903113706545.asia-south1.run.app';
    return 'http://localhost:8000';
  }
  // Production URL (include /api prefix to match backend)
  return 'https://neurolens-api-903113706545.asia-south1.run.app';
};

export const API_BASE_URL = getApiBaseUrl();


export const API_ENDPOINTS = {
  VOICE_ANALYSIS: {
    // JSON endpoint (kept for reference)
    PREDICT_MULTIMODAL: `${API_BASE_URL}/api/predict-multimodal`,
    // Audio-upload endpoint — sends actual recordings for real feature extraction
    PREDICT_MULTIMODAL_AUDIO: `${API_BASE_URL}/api/predict-multimodal-audio`,
  },
  DRAWING_ANALYSIS: {
    ANALYZE: `${API_BASE_URL}/api/drawing-prediction/analyze`,
  },
};

