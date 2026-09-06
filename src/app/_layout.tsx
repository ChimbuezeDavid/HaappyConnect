import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { getAuthToken, getRefreshToken, clearAuthTokens } from '@/lib/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { useThemeStore } from '@/store/themeStore';
import { useChatStore } from '@/store/chatStore';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import '../global.css';
import { Platform, Alert } from 'react-native';
import ToastNotificationContainer from '@/components/ui/ToastNotification';
import { showCustomAlert } from '@/store/alertStore';
import CustomAlertContainer from '@/components/ui/CustomAlert';
import RingingOverlay from '@/components/ui/RingingOverlay';
import PermissionPrimerModal from '@/components/ui/PermissionPrimerModal';
import { SplashScreenOverlay } from '@/components/ui/SplashScreenOverlay';
import Constants from 'expo-constants';

// Globally polyfill React Native's Alert.alert to render our custom HCI dialogs
Alert.alert = (title, message, buttons) => {
  const formattedButtons = buttons?.map(btn => ({
    text: btn.text || 'OK',
    style: btn.style,
    onPress: btn.onPress
  }));
  showCustomAlert(title || '', message || '', formattedButtons);
};

// Configure in-app notifications behaviour
try {
  if (Platform.OS !== 'web') {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } as any),
    });
  }
} catch (e) {
  console.warn('[Notifications] Failed to initialize setNotificationHandler:', e);
}

// Immediately dismiss any splash screen so the app loads directly
SplashScreen.hideAsync().catch(() => {});

export default function RootLayout() {
  const { token, user, loadUser, isLoading, isGuest } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments() as unknown as string[];

  // Load custom typography fonts
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // NativeWind Theme hooks
  const { colorScheme, setColorScheme } = useColorScheme();
  const { theme, loadTheme } = useThemeStore();

  // Load persistent theme preference on startup
  useEffect(() => {
    loadTheme();
  }, []);

  // Register Expo Push Notifications (only if previously granted)
  useEffect(() => {
    if (!token || !user) return;

    let isMounted = true;

    const registerPushNotifications = async () => {
      try {
        if (Platform.OS === 'web') return;

        const Notifications = require('expo-notifications');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();

        // Respect user autonomy: only register push token if user has explicitly granted permission
        if (existingStatus !== 'granted') {
          return;
        }

        // Fetch token with safety fallback for projectId
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

        if (pushToken && isMounted) {
          console.log('[Push Notification] Expo Push Token:', pushToken);
          // Register token with backend
          const { api } = require('@/lib/api');
          await api.post('/auth/register-push-token', { token: pushToken });
        }
      } catch (err) {
        console.warn('[Push Notification] Error registering push token:', err);
      }
    };

    registerPushNotifications();

    return () => {
      isMounted = false;
    };
  }, [token, user]);

  // Update NativeWind colorScheme when store preference changes
  useEffect(() => {
    if (theme === 'system') {
      setColorScheme('system');
    } else {
      setColorScheme(theme);
    }
  }, [theme]);

  // On web with darkMode: 'class', manually drive the <html> class
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const root = document.documentElement;
    if (colorScheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [colorScheme]);

  // Try to restore user session on startup while showing animated splash screen
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      const startTime = Date.now();
      const minDisplayDuration = 2000; // 2 seconds minimum splash duration for branding & DB check

      try {
        const savedToken = await getAuthToken();
        const savedRefreshToken = await getRefreshToken();

        if ((savedToken || savedRefreshToken) && active) {
          useAuthStore.setState({ token: savedToken, refreshToken: savedRefreshToken });
          
          // Verify with database
          await Promise.race([
            loadUser(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 3000))
          ]);
        }
      } catch (e) {
        console.warn('Failed or timed out restoring session:', e);
        if (active) {
          await clearAuthTokens();
          useAuthStore.setState({ token: null, refreshToken: null, user: null, profile: null, isGuest: false });
        }
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDisplayDuration - elapsed);
        setTimeout(() => {
          if (active) {
            setIsReady(true);
          }
        }, remaining);
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

  // Handle routing based on session state
  useEffect(() => {
    if (!isReady || isLoading || (!fontsLoaded && !fontError)) return;

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
  }, [token, user, isReady, segments, isGuest, isLoading, fontsLoaded, fontError]);

  const isDark = colorScheme === 'dark';

  const headerStyle = {
    backgroundColor: isDark ? '#131A22' : '#FAF8F5',
    borderBottomColor: isDark ? '#222D3D' : '#E7E1D8',
    borderBottomWidth: 1,
    shadowColor: 'transparent',
  };
  const headerTintColor = isDark ? '#F8FAFC' : '#0F172A';
  const headerTitleStyle = {
    color: isDark ? '#F8FAFC' : '#0F172A',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 17,
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
          name="expert/availability"
          options={{
            presentation: 'modal',
            headerShown: false,
            title: 'Call Availability',
            headerStyle,
            headerTintColor,
            headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="expert/[id]"
          options={{
            headerShown: false,
            title: 'Expert Profile',
            headerStyle,
            headerTintColor,
            headerTitleStyle,
          }}
        />
        <Stack.Screen
          name="bookings/response-viewer"
          options={{
            headerShown: false,
            title: 'Response',
            headerStyle,
            headerTintColor,
            headerTitleStyle,
          }}
        />
      </Stack>
      <ToastNotificationContainer />
      <CustomAlertContainer />
      <RingingOverlay />
      <PermissionPrimerModal />
      <SplashScreenOverlay isVisible={!isReady || isLoading || (!fontsLoaded && !fontError)} />
    </SafeAreaProvider>
  );
}
