import { create } from 'zustand';

export interface OnboardingState {
  currentStep: number;
  role: 'seeker' | 'expert';
  fullName: string;
  username: string;
  location: string;
  bio: string;
  avatarUrl: string;
  interests: string[]; // for seekers
  goals: string; // for seekers
  communicationStyle: 'Text' | 'Voice' | 'Video' | 'Any'; // for seekers
  headline: string; // for experts
  experience: string; // for experts
  categories: string[]; // for experts (expert category IDs)
  textPrice: string; // Naira price as text
  videoPrice: string;
  callPrice: string;
  textNegotiable: boolean;
  videoNegotiable: boolean;
  callNegotiable: boolean;
  availabilityImmediate: boolean;
  availabilityNote: string;
  visibility: 'Public' | 'Private';
}

interface OnboardingStore extends OnboardingState {
  updateDraft: (fields: Partial<OnboardingState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetOnboarding: (initialRole?: 'seeker' | 'expert') => void;
}

const initialStates = (role: 'seeker' | 'expert' = 'seeker'): OnboardingState => ({
  currentStep: 1,
  role,
  fullName: '',
  username: '',
  location: '',
  bio: '',
  avatarUrl: '',
  interests: [],
  goals: '',
  communicationStyle: 'Text',
  headline: '',
  experience: '',
  categories: [],
  textPrice: '2000', // Naira defaults
  videoPrice: '5000',
  callPrice: '15000',
  textNegotiable: false,
  videoNegotiable: false,
  callNegotiable: false,
  availabilityImmediate: true,
  availabilityNote: 'Available on request',
  visibility: 'Public',
});

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initialStates('seeker'),

  updateDraft: (fields) => set((state) => ({ ...state, ...fields })),
  
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  
  resetOnboarding: (initialRole) => set(initialStates(initialRole || 'seeker')),
}));
