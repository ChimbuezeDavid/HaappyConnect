import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  user: Types.ObjectId;
  amount: number; // positive for income/deposit/refund, negative for expense/charge/withdrawal
  type: 'deposit' | 'withdrawal' | 'charge' | 'payout' | 'refund';
  status: 'pending' | 'success' | 'failed';
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ['deposit', 'withdrawal', 'charge', 'payout', 'refund'], 
      required: true 
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'success',
      required: true
    },
    description: { type: String, required: true },
    reference: { type: String, unique: true, sparse: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, type: 1 });

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
