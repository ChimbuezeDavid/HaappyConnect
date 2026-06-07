import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_KEY = 'user_theme_preference';

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  setTheme: async (theme) => {
    try {
      await SecureStore.setItemAsync(THEME_KEY, theme);
      set({ theme });
    } catch (e) {
      console.warn('Error saving theme preference:', e);
    }
  },
  loadTheme: async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        set({ theme: savedTheme });
      }
    } catch (e) {
      console.warn('Error loading theme preference:', e);
    }
  },
}));
