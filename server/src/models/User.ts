import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  role: 'seeker' | 'expert';
  isOnboarded: boolean;
  googleId?: string;
  twitterId?: string;
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
    role: { type: String, enum: ['seeker', 'expert'], default: 'seeker' },
    isOnboarded: { type: Boolean, default: false },
    googleId: { type: String, sparse: true, unique: true },
    twitterId: { type: String, sparse: true, unique: true },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date },
    pushToken: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
