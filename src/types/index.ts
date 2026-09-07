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
  callPricePerMinute?: number;
  minCallMinutes?: number;
  textQuestionPrice: number;
  videoResponsePrice: number;
  textPackagePrice?: number;
  textPackageCount?: number;
  videoPackagePrice?: number;
  videoPackageCount?: number;
  responseWindowDays?: number;
  responseRate?: number;
  avgResponseHours?: number;
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
  verificationStatus?: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  verificationData?: {
    idDocumentUrl?: string;
    certifications?: Array<{ title: string; issuer: string; year: string; proofUrl?: string }>;
    yearsOfExperience?: number;
    portfolioUrl?: string;
    mentorshipStatement?: string;
    submittedAt?: string;
    reviewedAt?: string;
    adminNotes?: string;
  };
  publicAccreditation?: {
    showCertifications?: boolean;
    showExperience?: boolean;
    showPortfolio?: boolean;
    showMentorshipStatement?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  _id: string;
  seeker: string | Partial<User>;
  expert: string | Partial<User>;
  conversation?: string;
  seekerProfile?: Profile;
  expertProfile?: Profile;
  type: 'text' | 'voice' | 'video';
  status: 'payment_pending' | 'pending' | 'answered' | 'declined' | 'refunded' | 'expired' | 'disputed';
  price: number;
  seekerContent: string;
  expertResponse?: string;
  expertResponseUrl?: string;
  quotaTotal?: number;
  quotaUsed?: number;
  paidWith?: 'paystack' | 'wallet';
  paymentReference?: string;
  escrowStatus?: 'held' | 'released' | 'refunded' | 'disputed';
  expiresAt: string;
  answeredAt?: string;
  disputeReason?: string;
  disputeDetails?: string;
  disputedAt?: string;
  extendedCount?: number;
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
