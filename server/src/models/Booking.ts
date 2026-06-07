import { Schema, model, Document, Types } from 'mongoose';

export interface IBooking extends Document {
  seeker: Types.ObjectId;
  expert: Types.ObjectId;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    seeker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expert: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    price: { type: Number, required: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    meetingLink: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Booking = model<IBooking>('Booking', BookingSchema);
