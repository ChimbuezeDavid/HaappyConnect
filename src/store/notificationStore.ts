import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'new_question' | 'question_answered' | 'question_declined' | 'new_booking' | 'booking_confirmed' | 'booking_cancelled' | 'booking_completed' | 'deposit_verified';
  title: string;
  body: string;
  data?: Record<string, any>;
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;

  // In-app toast queue — shown as floating toasts then auto-dismissed
  toastQueue: AppNotification[];

  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  toastQueue: [],

  addNotification: (n) => {
    const notification: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 100), // cap at 100
      unreadCount: state.unreadCount + 1,
      toastQueue: [...state.toastQueue, notification],
    }));
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  markRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  dismissToast: (id) => {
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0, toastQueue: [] });
  },
}));
