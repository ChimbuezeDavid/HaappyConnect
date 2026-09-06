import { Platform, Linking } from 'react-native';
import { create } from 'zustand';

export type PermissionType = 'notifications' | 'camera' | 'media_library' | 'microphone';

interface PermissionPrimerState {
  isVisible: boolean;
  type: PermissionType;
  title: string;
  description: string;
  benefitPoints: string[];
  resolveCallback: ((granted: boolean) => void) | null;
  
  showPrimer: (config: {
    type: PermissionType;
    title: string;
    description: string;
    benefitPoints: string[];
  }) => Promise<boolean>;
  
  hidePrimer: (granted: boolean) => void;
}

export const usePermissionPrimerStore = create<PermissionPrimerState>((set, get) => ({
  isVisible: false,
  type: 'notifications',
  title: '',
  description: '',
  benefitPoints: [],
  resolveCallback: null,

  showPrimer: ({ type, title, description, benefitPoints }) => {
    return new Promise<boolean>((resolve) => {
      set({
        isVisible: true,
        type,
        title,
        description,
        benefitPoints,
        resolveCallback: resolve,
      });
    });
  },

  hidePrimer: (granted: boolean) => {
    const { resolveCallback } = get();
    if (resolveCallback) {
      resolveCallback(granted);
    }
    set({
      isVisible: false,
      resolveCallback: null,
    });
  },
}));

/**
 * Request Notification permission with human-centric Just-In-Time priming.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return true;

  try {
    const Notifications = require('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') {
      return true;
    }

    const userAgreed = await usePermissionPrimerStore.getState().showPrimer({
      type: 'notifications',
      title: 'Stay Connected to Your Consultations',
      description: 'HaappyConnect sends timely alerts so you never miss important mentorship activity.',
      benefitPoints: [
        'Instant alert when an expert answers your question',
        'Reminder 10 minutes before your live 1:1 consultation starts',
        'Real-time messages from your clients and mentors',
      ],
    });

    if (!userAgreed) {
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('[Permission] Failed to request notifications:', error);
    return false;
  }
};

/**
 * Request Camera permission with Just-In-Time priming.
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return true;

  try {
    const ImagePicker = require('expo-image-picker');
    const { status: existingStatus } = await ImagePicker.getCameraPermissionsAsync();
    if (existingStatus === 'granted') {
      return true;
    }

    const userAgreed = await usePermissionPrimerStore.getState().showPrimer({
      type: 'camera',
      title: 'Enable Camera for Identity & Video',
      description: 'Take a clear headshot for your profile and prepare for live video consultations.',
      benefitPoints: [
        'Snap a professional avatar photo directly from your phone',
        'Verify your visual identity for high-trust consultation sessions',
      ],
    });

    if (!userAgreed) {
      return false;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('[Permission] Failed to request camera:', error);
    return false;
  }
};

/**
 * Request Microphone / Audio permission with Just-In-Time priming.
 */
export const requestAudioPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return true;

  try {
    const { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } = require('expo-audio');
    const existing = await getRecordingPermissionsAsync();
    if (existing?.granted) {
      return true;
    }

    const userAgreed = await usePermissionPrimerStore.getState().showPrimer({
      type: 'microphone',
      title: 'Enable Microphone for Voice Notes',
      description: 'Record voice memos to ask questions or deliver high-value spoken advice.',
      benefitPoints: [
        'Send quick spoken memos without lengthy typing',
        'Deliver expressive voice consultation responses to seekers',
        'Participate in live 1:1 voice calls',
      ],
    });

    if (!userAgreed) {
      return false;
    }

    const res = await requestRecordingPermissionsAsync();
    return res.granted;
  } catch (error) {
    console.warn('[Permission] Failed to request microphone:', error);
    return false;
  }
};
