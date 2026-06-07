import { create } from 'zustand';
import { api, setAuthToken, removeAuthToken } from '../lib/api';
import { User, Profile } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  profile: Profile | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  
  signup: (email: string, password: string, role: 'seeker' | 'expert') => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setGuest: (isGuest: boolean) => void;
  updateOnboarding: (data: {
    fullName: string;
    username?: string;
    location?: string;
    goals?: string;
    communicationStyle?: 'Text' | 'Voice' | 'Video' | 'Any';
    experience?: string;
    negotiableTiers?: {
      hourlyRate?: boolean;
      textQuestionPrice?: boolean;
      videoResponsePrice?: boolean;
    };
    availabilityImmediate?: boolean;
    availabilityNote?: string;
    visibility?: 'Public' | 'Private';
    avatarUrl?: string;
    bio?: string;
    headline?: string;
    hourlyRate?: number;
    textQuestionPrice?: number;
    videoResponsePrice?: number;
    categories?: string[];
    role?: 'seeker' | 'expert';
  }) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  profile: null,
  isGuest: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),
  setGuest: (isGuest) => set({ isGuest, token: null, user: null, profile: null }),

  signup: async (email, password, role) => {
    set({ isLoading: true, error: null, isGuest: false });
    try {
      const data = await api.post('/auth/signup', { email, password, role });
      await setAuthToken(data.token);
      set({
        token: data.token,
        user: data.user,
        profile: null,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Signup failed', isLoading: false });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null, isGuest: false });
    try {
      const data = await api.post('/auth/login', { email, password });
      await setAuthToken(data.token);
      set({
        token: data.token,
        user: data.user,
        profile: data.profile,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Login failed', isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await removeAuthToken();
      set({
        token: null,
        user: null,
        profile: null,
        isGuest: false,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, isGuest: false });
    }
  },

  loadUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get('/profile/me');
      set({
        user: data.user,
        profile: data.profile,
        isGuest: false,
        isLoading: false,
      });
    } catch (error: any) {
      // If loading fails, it might mean token expired
      await removeAuthToken();
      set({
        token: null,
        user: null,
        profile: null,
        isGuest: false,
        isLoading: false,
      });
    }
  },

  updateOnboarding: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post('/profile/setup', profileData);
      set({
        profile: data.profile,
        user: data.user, // Server returns the updated user now
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Profile setup failed', isLoading: false });
      throw error;
    }
  },
}));
