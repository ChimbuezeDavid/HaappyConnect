import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  seeker: Types.ObjectId;
  expert: Types.ObjectId;
  type: 'text' | 'voice' | 'video';
  status: 'pending' | 'answered' | 'declined' | 'refunded';
  price: number;
  seekerContent: string;
  expertResponse: string;
  expertResponseUrl?: string;
  expiresAt: Date;
  answeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    seeker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expert: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'voice', 'video'], required: true },
    status: { type: String, enum: ['pending', 'answered', 'declined', 'refunded'], default: 'pending' },
    price: { type: Number, required: true },
    seekerContent: { type: String, required: true },
    expertResponse: { type: String, default: '' },
    expertResponseUrl: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
    answeredAt: { type: Date },
  },
  { timestamps: true }
);

export const Question = model<IQuestion>('Question', QuestionSchema);
