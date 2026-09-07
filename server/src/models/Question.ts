import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  seeker: Types.ObjectId;
  expert: Types.ObjectId;
  conversation?: Types.ObjectId;
  type: 'text' | 'voice' | 'video';
  status: 'payment_pending' | 'pending' | 'answered' | 'declined' | 'refunded' | 'expired' | 'disputed';
  price: number;
  seekerContent: string;
  expertResponse: string;
  expertResponseUrl?: string;
  quotaTotal: number;
  quotaUsed: number;
  paidWith?: 'paystack' | 'wallet';
  paymentReference?: string;
  escrowStatus?: 'held' | 'released' | 'refunded' | 'disputed';
  expiresAt: Date;
  answeredAt?: Date;
  disputeReason?: string;
  disputeDetails?: string;
  disputedAt?: Date;
  extendedCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    seeker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expert: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    type: { type: String, enum: ['text', 'voice', 'video'], required: true },
    status: {
      type: String,
      enum: ['payment_pending', 'pending', 'answered', 'declined', 'refunded', 'expired', 'disputed'],
      default: 'pending'
    },
    price: { type: Number, required: true },
    seekerContent: { type: String, required: true },
    expertResponse: { type: String, default: '' },
    expertResponseUrl: { type: String, default: '' },
    quotaTotal: { type: Number, default: 1 },
    quotaUsed: { type: Number, default: 0 },
    paidWith: { type: String, enum: ['paystack', 'wallet'], default: 'paystack' },
    paymentReference: { type: String, default: '' },
    escrowStatus: {
      type: String,
      enum: ['held', 'released', 'refunded', 'disputed'],
      default: 'held'
    },
    expiresAt: { type: Date, required: true },
    answeredAt: { type: Date },
    disputeReason: { type: String, default: '' },
    disputeDetails: { type: String, default: '' },
    disputedAt: { type: Date },
    extendedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

QuestionSchema.index({ expert: 1, status: 1, expiresAt: 1 });
QuestionSchema.index({ seeker: 1, status: 1 });
QuestionSchema.index({ conversation: 1, status: 1 });
QuestionSchema.index({ paymentReference: 1 });

export const Question = model<IQuestion>('Question', QuestionSchema);
