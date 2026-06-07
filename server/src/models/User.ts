import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: 'seeker' | 'expert';
  isOnboarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['seeker', 'expert'], default: 'seeker' },
    isOnboarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
