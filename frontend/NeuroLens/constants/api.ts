const getApiBaseUrl = () => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') return 'http://localhost:8000';
    return 'http://localhost:8000';
  }
  return 'http://localhost:8000'; // Production URL
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  VOICE_ANALYSIS: {
    ANALYZE: `${API_BASE_URL}/api/voice-analysis/analyze`,
    RESULTS: (sessionId: string) => `${API_BASE_URL}/api/voice-analysis/results/${sessionId}`,
    UPLOAD: `${API_BASE_URL}/api/voice-analysis/upload`,
  },
  DRAWING_ANALYSIS: {
    ANALYZE: `${API_BASE_URL}/api/drawing-prediction/analyze`,
  },
};

