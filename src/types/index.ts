export interface User {
  id: string;
  email: string;
  role: 'seeker' | 'expert';
  isOnboarded: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
}

export interface Profile {
  _id: string;
  user: string | Partial<User>;
  fullName: string;
  avatarUrl: string;
  bio: string;
  headline: string;
  hourlyRate: number;
  textQuestionPrice: number;
  videoResponsePrice: number;
  categories: Category[];
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
  ratingAverage: number;
  reviewsCount: number;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  _id: string;
  seeker: string | Partial<User>;
  expert: string | Partial<User>;
  seekerProfile?: Profile;
  expertProfile?: Profile;
  type: 'text' | 'voice' | 'video';
  status: 'pending' | 'answered' | 'declined' | 'refunded';
  price: number;
  seekerContent: string;
  expertResponse?: string;
  expiresAt: string;
  answeredAt?: string;
  createdAt: string;
  updatedAt: string;
  hasReview?: boolean;
}

export interface Booking {
  _id: string;
  seeker: string | Partial<User>;
  expert: string | Partial<User>;
  seekerProfile?: Profile;
  expertProfile?: Profile;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
  hasReview?: boolean;
}

export interface Transaction {
  _id: string;
  user: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'charge' | 'payout' | 'refund';
  status: 'pending' | 'success' | 'failed';
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  seeker: string | Partial<User>;
  expert: string | Partial<User>;
  rating: number;
  comment: string;
  seekerProfile?: Profile;
  booking?: string;
  question?: string;
  createdAt: string;
}
