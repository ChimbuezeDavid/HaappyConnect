import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  role: 'seeker' | 'expert' | 'admin';
  isOnboarded: boolean;
  googleId?: string;
  twitterId?: string;
  linkedinId?: string;
  appleId?: string;
  refreshTokens?: string[];
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  pushToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    role: { type: String, enum: ['seeker', 'expert', 'admin'], default: 'seeker' },
    isOnboarded: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true },
    twitterId: { type: String, sparse: true, unique: true },
    linkedinId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    refreshTokens: [{ type: String }],
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date },
    pushToken: { type: String },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });

export const User = model<IUser>('User', UserSchema);
