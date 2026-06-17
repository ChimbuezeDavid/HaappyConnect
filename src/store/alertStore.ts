import { create } from 'zustand';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],

  showAlert: (title, message, buttons) => {
    set({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }]
    });
  },

  hideAlert: () => {
    set({ visible: false });
  }
}));

// Safe wrapper utility to invoke the custom alert from anywhere
export const showCustomAlert = (title: string, message: string, buttons?: AlertButton[]) => {
  useAlertStore.getState().showAlert(title, message, buttons);
};
