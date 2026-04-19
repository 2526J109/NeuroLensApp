// API Configuration
// Update this URL to match your backend server
// For development: use your local IP address (e.g., http://192.168.1.100:8000)
// For production: use your production API URL

// For mobile testing, replace localhost with your computer's IP address
// Example: 'http://192.168.1.100:8000'
const getApiBaseUrl = () => {
  // If you set EXPO_PUBLIC_API_BASE_URL, it will override everything (best for real device testing).
  // Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Development mode - backend runs locally
    // Android emulator cannot reach your PC via localhost; use 10.0.2.2.
    // For physical devices, set EXPO_PUBLIC_API_BASE_URL to your LAN IP.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
    return 'http://localhost:8000';
  }
  // Production URL
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();


export const API_ENDPOINTS = {
  VOICE_ANALYSIS: {
    PREDICT_MULTIMODAL: `${API_BASE_URL}/api/predict-multimodal`,
    PREDICT_MULTIMODAL_AUDIO: `${API_BASE_URL}/api/predict-multimodal-audio`,
  },
  DRAWING_ANALYSIS: {
    ANALYZE: `${API_BASE_URL}/api/drawing-prediction/analyze`,
    ANALYZE_LOCAL: `${API_BASE_URL}/api/drawing-prediction/analyze-local`,
    ANALYZE_QUADSTREAM: `${API_BASE_URL}/api/drawing-prediction/analyze-quadstream`,
    ANALYZE_QUADSTREAM_V2: `${API_BASE_URL}/api/drawing-prediction/analyze-quadstream-v2`,
    ANALYZE_MICRO: `${API_BASE_URL}/api/drawing-prediction/analyze-micro`,
    ANALYZE_SCALE_NORM: `${API_BASE_URL}/api/drawing-prediction/analyze-scale-norm`,
    ANALYZE_NORMQUAD: `${API_BASE_URL}/api/drawing-prediction/analyze-normquad`,
  },
  WEARABLE_ANALYSIS: {
    ANALYZE: `${API_BASE_URL}/api/wearable-prediction/analyze`,
  },
};

export type DrawingModelKey =
  | 'ANALYZE_LOCAL'
  | 'ANALYZE_QUADSTREAM'
  | 'ANALYZE_QUADSTREAM_V2'
  | 'ANALYZE_MICRO'
  | 'ANALYZE_SCALE_NORM'
  | 'ANALYZE_NORMQUAD';

export interface DrawingModelOption {
  key: DrawingModelKey;
  label: string;
  description: string;
  badge: string;
  badgeColor: string;
}

export const DRAWING_MODEL_OPTIONS: DrawingModelOption[] = [
  {
    key: 'ANALYZE_LOCAL',
    label: 'NB05 · Scale-Norm LR',
    description: '6 CV features · Mobile-proven',
    badge: 'Recommended',
    badgeColor: '#10B981',
  },
  {
    key: 'ANALYZE_QUADSTREAM',
    label: 'NB09 · TunedQuadStream',
    description: '237 params · 93.1% LOOCV',
    badge: 'NN',
    badgeColor: '#6366F1',
  },
  {
    key: 'ANALYZE_QUADSTREAM_V2',
    label: 'NB12 · ImprovedQuadStream',
    description: '339 params · 94.8% LOOCV · AUC 98.4%',
    badge: 'Best LOOCV',
    badgeColor: '#8B5CF6',
  },
  {
    key: 'ANALYZE_MICRO',
    label: 'NB13 · MicroQuadStream',
    description: '53 params · No BatchNorm · Tanh',
    badge: 'Micro',
    badgeColor: '#F59E0B',
  },
  {
    key: 'ANALYZE_SCALE_NORM',
    label: 'NB19 · Scale-Norm LR + RFECV',
    description: '14 CV features · Time Warp aug',
    badge: 'New',
    badgeColor: '#14B8A6',
  },
  {
    key: 'ANALYZE_NORMQUAD',
    label: 'NB20 · NormQuadStream',
    description: '14 CV features · No BatchNorm · ELU',
    badge: 'New',
    badgeColor: '#14B8A6',
  },
];

