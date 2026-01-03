// API Configuration
// Update this URL to match your backend server
// For development: use your local IP address (e.g., http://192.168.1.100:8000)
// For production: use your production API URL

// For mobile testing, replace localhost with your computer's IP address
// Example: 'http://192.168.1.100:8000'
const getApiBaseUrl = () => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Development mode - use localhost for web, or your IP for mobile
    return 'http://localhost:8000';
  }
  return 'https://api.neurolens.com'; // Production URL
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  VOICE_ANALYSIS: {
    ANALYZE: `${API_BASE_URL}/api/voice-analysis/analyze`,
    RESULTS: (sessionId: string) => `${API_BASE_URL}/api/voice-analysis/results/${sessionId}`,
    UPLOAD: `${API_BASE_URL}/api/voice-analysis/upload`,
  },
};

