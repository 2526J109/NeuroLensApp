import api from './api';

interface RegisterRequest {
  email: string;
  full_name?: string;
  gender?: string;
  birthday?: string;
  handedness?: string;
}

interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  full_name?: string;
  created_at: string;
}

export const authService = {
  register: async (
    firebaseToken: string,
    email: string,
    fullName?: string,
    gender?: string,
    birthday?: string,
    handedness?: string
  ): Promise<UserProfile> => {
    const response = await api.post<UserProfile>(
      '/api/auth/register',
      {
        email,
        full_name: fullName,
        gender,
        birthday,
        handedness,
      } as RegisterRequest,
      {
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
        },
      }
    );
    return response.data;
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
