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
  textQuestionPrice: number;
  videoResponsePrice: number;
  categories: Types.ObjectId[];
  ratingAverage: number;
  reviewsCount: number;
  isVerified: boolean;
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
    textQuestionPrice: { type: Number, default: 0 },
    videoResponsePrice: { type: Number, default: 0 },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    ratingAverage: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProfileSchema.index({ ratingAverage: -1, reviewsCount: -1 });
ProfileSchema.index({ isVerified: 1, createdAt: -1 });
ProfileSchema.index({ categories: 1 });

export const Profile = model<IProfile>('Profile', ProfileSchema);
