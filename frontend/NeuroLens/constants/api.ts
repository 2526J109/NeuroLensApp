const getApiBaseUrl = () => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Development mode - backend runs locally
    // NOTE: main.py prefixes all routes with /api (API_V1_STR),
    // so we include /api here to avoid duplicating it everywhere.
    // Android emulator cannot reach your PC via localhost; use 10.0.2.2.
    // For physical devices, set EXPO_PUBLIC_API_BASE_URL to your LAN IP.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require('react-native');
    if (Platform.OS === 'android') return 'https://neurolens-api-903113706545.asia-south1.run.app/api/';
    return 'http://localhost:8000/api';
  }
  return 'https://neurolens-api-903113706545.asia-south1.run.app/'; // Production URL
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  VOICE_ANALYSIS: {
    ANALYZE: `${API_BASE_URL}/api/voice-analysis/analyze`,
    RESULTS: (sessionId: string) => `${API_BASE_URL}/api/voice-analysis/results/${sessionId}`,
    UPLOAD: `${API_BASE_URL}/api/voice-analysis/upload`,
  },
};

