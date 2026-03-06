import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { authService } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  full_name?: string;
  gender?: string;
  birthday?: string;
  handedness?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    gender?: string,
    birthday?: string,
    handedness?: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from backend
  const fetchUserProfile = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem('authToken', token);
      console.log('Token: ', token);
      const profile = await authService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };



  // Monitor Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        setUserProfile(null);
        await AsyncStorage.removeItem('authToken');
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up with email and password
  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    gender?: string,
    birthday?: string,
    handedness?: string
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      await authService.register(token, email, fullName, gender, birthday, handedness);
      await fetchUserProfile(userCredential.user);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign up');
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserProfile(userCredential.user);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('authToken');
      setUserProfile(null);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to logout');
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  // Refresh user profile from backend
  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    logout,
    resetPassword,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
