import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  seeker: Types.ObjectId;
  expert: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    seeker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expert: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Review = model<IReview>('Review', ReviewSchema);
