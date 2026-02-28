const getApiBaseUrl = () => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Development mode - use localhost for web, or your IP for mobile
    return 'http://localhost:8000';
  }
  return 'https://neurolensapp-903113706545.europe-west1.run.app'; // Production URL
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  VOICE_ANALYSIS: {
    ANALYZE: `${API_BASE_URL}/api/voice-analysis/analyze`,
    RESULTS: (sessionId: string) => `${API_BASE_URL}/api/voice-analysis/results/${sessionId}`,
    UPLOAD: `${API_BASE_URL}/api/voice-analysis/upload`,
  },
};

