import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  seeker: Types.ObjectId;
  expert: Types.ObjectId;
  rating: number;
  comment: string;
  booking?: Types.ObjectId;
  question?: Types.ObjectId;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    seeker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expert: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking' },
    question: { type: Schema.Types.ObjectId, ref: 'Question' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Review = model<IReview>('Review', ReviewSchema);
