import { create } from 'zustand';
import { api, setAuthTokens, clearAuthTokens, getAuthToken, getRefreshToken } from '../lib/api';
import { User, Profile } from '../types';

// Lazy imports to avoid circular dependency — resolved at runtime
const getChatStore = () => require('../store/chatStore').useChatStore;
const getWalletStore = () => require('../store/walletStore').useWalletStore;

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  profile: Profile | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  
  signup: (email: string, password: string, role: 'seeker' | 'expert') => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  socialLogin: (payload: {
    provider: 'google' | 'linkedin' | 'apple' | 'twitter';
    email: string;
    fullName?: string;
    avatarUrl?: string;
    providerId?: string;
    role?: 'seeker' | 'expert';
  }) => Promise<void>;
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
  loginWithOAuth: (token: string, refreshToken: string | null, user: User, profile?: Profile | null) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  profile: null,
  isGuest: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),
  setGuest: (isGuest) => set({ isGuest, token: null, refreshToken: null, user: null, profile: null }),

  signup: async (email, password, role) => {
    set({ isLoading: true, error: null, isGuest: false });
    try {
      const data = await api.post('/auth/signup', { email, password, role });
      await setAuthTokens(data.token, data.refreshToken);
      set({
        token: data.token,
        refreshToken: data.refreshToken || null,
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
      await setAuthTokens(data.token, data.refreshToken);
      set({
        token: data.token,
        refreshToken: data.refreshToken || null,
        user: data.user,
        profile: data.profile,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Login failed', isLoading: false });
      throw error;
    }
  },

  socialLogin: async (payload) => {
    set({ isLoading: true, error: null, isGuest: false });
    try {
      const data = await api.post('/auth/social-login', payload);
      await setAuthTokens(data.token, data.refreshToken);
      set({
        token: data.token,
        refreshToken: data.refreshToken || null,
        user: data.user,
        profile: data.profile,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Social sign-in failed', isLoading: false });
      throw error;
    }
  },

  loginWithOAuth: async (token, refreshToken, user, profile = null) => {
    set({ isLoading: true, error: null, isGuest: false });
    try {
      await setAuthTokens(token, refreshToken || undefined);
      set({
        token,
        refreshToken: refreshToken || null,
        user,
        profile,
      });
      // If user is onboarded, load complete profile metrics
      if (user.isOnboarded) {
        await get().loadUser();
      } else {
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'OAuth login failed', isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const currentRefresh = await getRefreshToken();
      if (currentRefresh) {
        api.post('/auth/logout', { refreshToken: currentRefresh }).catch(() => {});
      }
      await clearAuthTokens();
      set({
        token: null,
        refreshToken: null,
        user: null,
        profile: null,
        isGuest: false,
        isLoading: false,
      });
      // Tear down dependent stores to prevent stale data between sessions
      try {
        const chatStore = getChatStore().getState();
        chatStore.disconnectSocket();
        getChatStore().setState({ conversations: [], messages: [], activeChatId: null, isTyping: false });
      } catch (_) {}
      try {
        getWalletStore().getState().clearWalletState();
      } catch (_) {}
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
      // If loading fails, clear invalid tokens
      await clearAuthTokens();
      set({
        token: null,
        refreshToken: null,
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
