import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  user: Types.ObjectId;
  amount: number; // positive for income, negative for expense
  type: 'charge' | 'payout' | 'refund';
  description: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['charge', 'payout', 'refund'], required: true },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
