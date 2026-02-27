import api from './api';

interface RegisterRequest {
  email: string;
  full_name?: string;
}

interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export const authService = {
  // Register user with backend after Firebase authentication
  register: async (firebaseToken: string, email: string, fullName?: string): Promise<UserProfile> => {
    console.log('📡 Calling backend register API...');
    console.log('URL:', api.defaults.baseURL + '/api/auth/register');
    console.log('Token (first 20 chars):', firebaseToken.substring(0, 20) + '...');
    
    try {
      const response = await api.post<UserProfile>(
        '/api/auth/register',
        {
          email,
          full_name: fullName,
        } as RegisterRequest,
        {
          headers: {
            Authorization: `Bearer ${firebaseToken}`,
          },
        }
      );
      console.log('✅ Backend response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Backend registration failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  },

  // Get current user profile
  getUserProfile: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/api/auth/me');
    return response.data;
  },

  // Update user profile
  updateProfile: async (fullName: string): Promise<UserProfile> => {
    const response = await api.put<UserProfile>('/api/auth/profile', {
      full_name: fullName,
    });
    return response.data;
  },
};
