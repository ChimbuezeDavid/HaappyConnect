import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { getAuthToken, removeAuthToken } from '@/lib/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '@/store/themeStore';
import { useChatStore } from '@/store/chatStore';
import '../global.css';

// Keep splash screen visible while we load auth state
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { token, user, loadUser, isLoading, isGuest } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments() as unknown as string[];

  // NativeWind Theme hooks
  const { colorScheme, setColorScheme } = useColorScheme();
  const { theme, loadTheme } = useThemeStore();

  // Load persistent theme preference on startup
  useEffect(() => {
    loadTheme();
  }, []);

  // Update NativeWind colorScheme when store preference changes
  useEffect(() => {
    if (theme === 'system') {
      setColorScheme('system');
    } else {
      setColorScheme(theme);
    }
  }, [theme]);

  // Try to restore user session on startup
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      // Safety timer: hide splash screen after 2.5 seconds regardless of network response
      const safetyTimeout = setTimeout(() => {
        if (active) {
          console.warn('[Auth Init] Safety timeout triggered: hiding splash screen');
          setIsReady(true);
        }
      }, 2500);

      try {
        const savedToken = await getAuthToken();
        if (savedToken && active) {
          useAuthStore.setState({ token: savedToken });
          
          // Race loadUser() against a 2-second timeout to avoid launch delays on slow/dormant networks
          await Promise.race([
            loadUser(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 2000))
          ]);
        }
      } catch (e) {
        console.warn('Failed or timed out restoring session:', e);
        if (active) {
          await removeAuthToken();
          useAuthStore.setState({ token: null, user: null, profile: null, isGuest: false });
        }
      } finally {
        clearTimeout(safetyTimeout);
        if (active) {
          setIsReady(true);
        }
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  // Sync socket connection with auth token
  useEffect(() => {
    if (token) {
      useChatStore.getState().connectSocket(token);
    } else {
      useChatStore.getState().disconnectSocket();
    }
    return () => {
      useChatStore.getState().disconnectSocket();
    };
  }, [token]);

  // Hide splash screen once auth state is resolved
  useEffect(() => {
    if (isReady && !isLoading) {
      // Delay hiding the splash screen to allow the initial routing replacement
      // to complete rendering, avoiding any millisecond welcome page flickers.
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isReady, isLoading]);

  // Handle routing based on session state
  useEffect(() => {
    if (!isReady || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!token) {
      // Unauthenticated flow
      // If the user is not a guest, they must be in the auth group.
      // Otherwise, redirect them to the welcome page.
      if (!isGuest && !inAuthGroup) {
        router.replace('/(auth)/welcome' as any);
      }
    } else if (user) {
      // Authenticated flow
      if (!user.isOnboarded) {
        // Redirect to onboarding if not completed and not in onboarding group
        if (!inOnboardingGroup) {
          router.replace('/(onboarding)/role-selection' as any);
        }
      } else {
        // Redirect to tabs if authenticated, onboarded, and in auth/onboarding group
        if (inAuthGroup || inOnboardingGroup || segments.length === 0 || segments[0] === undefined) {
          router.replace('/(tabs)' as any);
        }
      }
    }
  }, [token, user, isReady, segments, isGuest, isLoading]);

  const isDark = colorScheme === 'dark';

  const headerStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
    borderBottomWidth: 1,
    shadowColor: 'transparent',
  };
  const headerTintColor = isDark ? '#ffffff' : '#0f172a';
  const headerTitleStyle = {
    color: isDark ? '#ffffff' : '#0f172a',
    fontWeight: 'bold' as const,
  };

  // CRITICAL: Always render the Stack navigator.
  // Never conditionally return a non-navigator view (e.g. loading spinner).
  // The splash screen handles the loading UI.
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="chat/[conversationId]"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="bookings/call"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="seeker/book-call"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Book Live Call',
            headerStyle,
            headerTintColor,
            headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="seeker/ask-question"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Ask an Expert',
            headerStyle,
            headerTintColor,
            headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="expert/edit-profile"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Edit Profile',
            headerStyle,
            headerTintColor,
            headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="expert/[id]"
          options={{
            headerShown: true,
            title: 'Expert Profile',
            headerStyle,
            headerTintColor,
            headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="bookings/response-viewer"
          options={{
            headerShown: true,
            title: 'Response',
            headerStyle,
            headerTintColor,
            headerTitleStyle,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
