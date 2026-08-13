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

// Retrieve token from secure storage
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

// Set token in secure storage
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

// Remove token from secure storage
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

interface RequestOptions extends RequestInit {
  bodyData?: any;
}

export const apiRequest = async (endpoint: string, options: RequestOptions = {}) => {
  const token = await getAuthToken();
  const url = `${API_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set up request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

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
    let jsonData;

    try {
      jsonData = JSON.parse(textData);
    } catch {
      jsonData = { message: textData };
    }

    if (!response.ok) {
      if (response.status === 401) {
        try {
          const { useAuthStore } = require('@/store/authStore');
          useAuthStore.getState().logout();

          const { useNotificationStore } = require('@/store/notificationStore');
          useNotificationStore.getState().addNotification({
            type: 'question_declined',
            title: 'Session Expired',
            body: 'Your login session has expired. Please sign in again.',
          });
        } catch (_) {}
      }
      throw new Error(jsonData.error || jsonData.message || `HTTP error ${response.status}`);
    }

    return jsonData;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log(`[API Timeout] ${endpoint}: Request timed out after 6000ms`);
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
  } else {
    const FileSystem = require('expo-file-system');
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
};

// Generic media upload helper (primarily for chat and response media)
export const uploadMedia = async (
  uri: string,
  fileName: string,
  fileType: string,
  conversationId?: string
): Promise<{ url: string }> => {
  try {
    const base64 = await convertUriToBase64(uri);
    const endpoint = conversationId 
      ? `/chat/conversations/${conversationId}/upload` 
      : '/profile/upload-media';
    return await api.post(endpoint, {
      base64,
      fileName,
      fileType,
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
  fileType: string = 'image/jpeg'
): Promise<{ url: string }> => {
  try {
    const base64 = await convertUriToBase64(uri);
    return await api.post('/profile/upload-avatar', {
      base64,
      fileName,
      fileType,
    });
  } catch (error: any) {
    console.error('[Upload Avatar Error]', error);
    throw new Error(error.message || 'Failed to upload avatar');
  }
};
