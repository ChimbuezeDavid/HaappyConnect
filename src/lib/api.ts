import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Dynamically determine the backend URL based on platform and environment
const getBaseUrl = () => {
  // Robust check for emulator / simulator
  const brand = Device.brand?.toLowerCase() || '';
  const model = Device.modelName?.toLowerCase() || '';
  const product = Device.productName?.toLowerCase() || '';
  
  const isEmulator = 
    Device.isDevice === false ||
    brand === '' ||
    brand.includes('generic') ||
    brand.includes('sdk') ||
    model.includes('emulator') ||
    model.includes('simulator') ||
    model.includes('sdk_gphone') ||
    product.includes('sdk') ||
    product.includes('emulator');

  console.log(`[Device Detection] isDevice: ${Device.isDevice}, brand: ${Device.brand}, model: ${Device.modelName}, isEmulator: ${isEmulator}`);

  const hostUri = Constants.expoConfig?.hostUri;
  const hostIp = hostUri ? hostUri.split(':')[0] : null;

  let url = process.env.EXPO_PUBLIC_API_URL;
  if (url) {
    // If running on Android emulator and the URL points to localhost, dynamically map it to 10.0.2.2
    if (Platform.OS === 'android' && isEmulator && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      const updatedUrl = url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
      console.log(`[Base URL] Android Emulator detected: Rewriting localhost URL to: ${updatedUrl}`);
      return updatedUrl;
    }
    // If running on a physical device, try to replace localhost with the host machine's IP
    if (Device.isDevice && (url.includes('localhost') || url.includes('127.0.0.1')) && hostIp) {
      const updatedUrl = url.replace('localhost', hostIp).replace('127.0.0.1', hostIp);
      console.log(`[Base URL] Physical Device detected: Rewriting localhost URL to: ${updatedUrl}`);
      return updatedUrl;
    }
    return url;
  }

  // If on Android emulator, use the standard 10.0.2.2 loopback address (avoids Windows Firewall blocks)
  if (Platform.OS === 'android' && isEmulator) {
    return 'http://10.0.2.2:3000/api';
  }

  // Try to get host IP from Expo Constants (works for physical devices on the local network)
  if (hostIp) {
    return `http://${hostIp}:3000/api`;
  }

  // Fallbacks
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
};

export const API_URL = getBaseUrl();
const TOKEN_KEY = 'haappyconnect_jwt_token';
const REFRESH_TOKEN_KEY = 'haappyconnect_refresh_token';

// Retrieve access token from secure storage
export const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error reading auth token', error);
    return null;
  }
};

// Set access token in secure storage
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving auth token', error);
  }
};

// Retrieve refresh token from secure storage
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error reading refresh token', error);
    return null;
  }
};

// Set refresh token in secure storage
export const setRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      return;
    }
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Error saving refresh token', error);
  }
};

// Set both auth and refresh tokens
export const setAuthTokens = async (token: string, refreshToken?: string): Promise<void> => {
  await setAuthToken(token);
  if (refreshToken) {
    await setRefreshToken(refreshToken);
  }
};

// Remove access token
export const removeAuthToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error deleting auth token', error);
  }
};

// Clear all session tokens
export const clearAuthTokens = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
    ]);
  } catch (error) {
    console.error('Error clearing auth tokens', error);
  }
};

// Concurrent refresh mutex and subscriber queue
let isRefreshing = false;
let refreshSubscribers: ((newToken: string | null) => void)[] = [];

const onTokenRefreshed = (newToken: string | null) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (newToken: string | null) => void) => {
  refreshSubscribers.push(callback);
};

interface RequestOptions extends RequestInit {
  bodyData?: any;
  isRetryAfterRefresh?: boolean;
}

export const apiRequest = async (endpoint: string, options: RequestOptions = {}): Promise<any> => {
  const token = await getAuthToken();
  const url = `${API_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set up request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

  const config: RequestInit = {
    ...options,
    headers,
    signal: controller.signal,
  };

  if (options.bodyData) {
    config.body = JSON.stringify(options.bodyData);
  }

  try {
    console.log(`[API Request] ${options.method || 'GET'} -> ${url}`);
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    const textData = await response.text();
    let jsonData: any;

    try {
      jsonData = JSON.parse(textData);
    } catch {
      jsonData = { message: textData };
    }

    // Handle 401 Unauthorized with Intelligent Session Recovery (Silent Refresh)
    if (response.status === 401) {
      const isAuthRoute =
        endpoint.includes('/auth/login') ||
        endpoint.includes('/auth/signup') ||
        endpoint.includes('/auth/refresh') ||
        options.isRetryAfterRefresh;

      if (!isAuthRoute) {
        if (!isRefreshing) {
          isRefreshing = true;
          const currentRefreshToken = await getRefreshToken();

          if (currentRefreshToken) {
            try {
              console.log('[Auth Session] Access token expired. Attempting silent refresh...');
              const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: currentRefreshToken }),
              });

              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                console.log('[Auth Session] Silent token refresh successful.');
                await setAuthTokens(refreshData.token, refreshData.refreshToken);
                isRefreshing = false;
                onTokenRefreshed(refreshData.token);

                // Retry the original request with new token
                return apiRequest(endpoint, { ...options, isRetryAfterRefresh: true });
              }
            } catch (refreshErr) {
              console.warn('[Auth Session] Silent refresh request failed:', refreshErr);
            }
          }

          // Refresh token invalid, expired, or missing
          isRefreshing = false;
          onTokenRefreshed(null);
          await clearAuthTokens();

          try {
            const { useAuthStore } = require('@/store/authStore');
            useAuthStore.getState().logout();

            const { useNotificationStore } = require('@/store/notificationStore');
            useNotificationStore.getState().addNotification({
              type: 'system',
              title: 'Session Expired',
              body: 'Your session has expired. Please sign in again.',
            });
          } catch (_) {}

          throw new Error('Session expired. Please sign in again.');
        } else {
          // If refresh is already underway, enqueue this request to wait for the new token
          return new Promise((resolve, reject) => {
            addRefreshSubscriber((newToken) => {
              if (newToken) {
                resolve(apiRequest(endpoint, { ...options, isRetryAfterRefresh: true }));
              } else {
                reject(new Error('Session expired. Please sign in again.'));
              }
            });
          });
        }
      }

      throw new Error(jsonData.error || jsonData.message || `HTTP error ${response.status}`);
    }

    if (!response.ok) {
      throw new Error(jsonData.error || jsonData.message || `HTTP error ${response.status}`);
    }

    return jsonData;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log(`[API Timeout] ${endpoint}: Request timed out after 8000ms`);
      throw new Error('Network timeout. Please check your connection or server status.');
    }
    console.warn(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
};

export const api = {
  get: (endpoint: string, options: RequestOptions = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body: any, options: RequestOptions = {}) => apiRequest(endpoint, { ...options, method: 'POST', bodyData: body }),
  put: (endpoint: string, body: any, options: RequestOptions = {}) => apiRequest(endpoint, { ...options, method: 'PUT', bodyData: body }),
  patch: (endpoint: string, body: any, options: RequestOptions = {}) => apiRequest(endpoint, { ...options, method: 'PATCH', bodyData: body }),
  delete: (endpoint: string, options: RequestOptions = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

// Cross-platform helper to convert local URI to Base64
export const convertUriToBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Native (Android/iOS)
  try {
    // In Expo SDK 54+, legacy methods are imported from expo-file-system/legacy
    // to avoid deprecation warnings and runtime errors.
    const FileSystem = require('expo-file-system/legacy');
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType?.Base64 || 'base64',
    });
  } catch (fsErr) {
    console.warn('[convertUriToBase64] expo-file-system/legacy read failed, falling back to fetch/blob:', fsErr);
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
};

// Generic media upload helper (primarily for chat and response media)
export const uploadMedia = async (
  uri: string,
  fileName: string,
  fileType?: string,
  conversationId?: string
): Promise<{ url: string }> => {
  try {
    const base64 = await convertUriToBase64(uri);
    const ext = fileName.split('.').pop()?.toLowerCase();
    const resolvedFileType =
      fileType ||
      (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'mp4' ? 'video/mp4' : ext === 'm4a' ? 'audio/m4a' : 'image/jpeg');

    const endpoint = conversationId 
      ? `/chat/conversations/${conversationId}/upload` 
      : '/profile/upload-media';
    return await api.post(endpoint, {
      base64,
      fileName,
      fileType: resolvedFileType,
    });
  } catch (error: any) {
    console.error('[Upload Media Error]', error);
    throw new Error(error.message || 'Failed to upload media');
  }
};

// Avatar specific upload helper
export const uploadAvatar = async (
  uri: string,
  fileName: string = 'avatar.jpg',
  fileType?: string
): Promise<{ url: string }> => {
  try {
    const base64 = await convertUriToBase64(uri);
    const ext = fileName.split('.').pop()?.toLowerCase();
    const resolvedFileType =
      fileType ||
      (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

    return await api.post('/profile/upload-avatar', {
      base64,
      fileName,
      fileType: resolvedFileType,
    });
  } catch (error: any) {
    console.error('[Upload Avatar Error]', error);
    throw new Error(error.message || 'Failed to upload avatar');
  }
};
