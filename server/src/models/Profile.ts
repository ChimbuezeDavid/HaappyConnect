import { Schema, model, Document, Types } from 'mongoose';

export interface IProfile extends Document {
  user: Types.ObjectId;
  fullName: string;
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
  avatarUrl: string;
  bio: string;
  headline: string;
  hourlyRate: number;
  callPricePerMinute?: number;
  minCallMinutes?: number;
  textQuestionPrice: number;
  videoResponsePrice: number;
  responseRate?: number;
  avgResponseHours?: number;
  categories: Types.ObjectId[];
  ratingAverage: number;
  reviewsCount: number;
  isVerified: boolean;
  verificationStatus?: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  verificationData?: {
    idDocumentUrl?: string;
    certifications?: Array<{ title: string; issuer: string; year: string; proofUrl?: string }>;
    yearsOfExperience?: number;
    portfolioUrl?: string;
    mentorshipStatement?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    adminNotes?: string;
  };
  publicAccreditation?: {
    showCertifications?: boolean;
    showExperience?: boolean;
    showPortfolio?: boolean;
    showMentorshipStatement?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    location: { type: String, default: '' },
    goals: { type: String, default: '' },
    communicationStyle: { type: String, enum: ['Text', 'Voice', 'Video', 'Any'], default: 'Text' },
    experience: { type: String, default: '' },
    negotiableTiers: {
      hourlyRate: { type: Boolean, default: false },
      textQuestionPrice: { type: Boolean, default: false },
      videoResponsePrice: { type: Boolean, default: false },
    },
    availabilityImmediate: { type: Boolean, default: true },
    availabilityNote: { type: String, default: '' },
    visibility: { type: String, enum: ['Public', 'Private'], default: 'Public' },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    headline: { type: String, default: '' },
    hourlyRate: { type: Number, default: 0 },
    callPricePerMinute: { type: Number, default: 500 },
    minCallMinutes: { type: Number, default: 15 },
    textQuestionPrice: { type: Number, default: 0 },
    videoResponsePrice: { type: Number, default: 0 },
    responseRate: { type: Number, default: 98 },
    avgResponseHours: { type: Number, default: 4 },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    ratingAverage: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['unsubmitted', 'pending', 'approved', 'rejected'],
      default: 'unsubmitted'
    },
    verificationData: {
      idDocumentUrl: { type: String, default: '' },
      certifications: [{
        title: { type: String, default: '' },
        issuer: { type: String, default: '' },
        year: { type: String, default: '' },
        proofUrl: { type: String, default: '' }
      }],
      yearsOfExperience: { type: Number, default: 0 },
      portfolioUrl: { type: String, default: '' },
      mentorshipStatement: { type: String, default: '' },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      adminNotes: { type: String, default: '' }
    },
    publicAccreditation: {
      showCertifications: { type: Boolean, default: true },
      showExperience: { type: Boolean, default: true },
      showPortfolio: { type: Boolean, default: true },
      showMentorshipStatement: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

ProfileSchema.index({ ratingAverage: -1, reviewsCount: -1 });
ProfileSchema.index({ isVerified: 1, createdAt: -1 });
ProfileSchema.index({ categories: 1 });

export const Profile = model<IProfile>('Profile', ProfileSchema);
