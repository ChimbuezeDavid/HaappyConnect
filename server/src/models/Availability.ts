import { Schema, model, Document, Types } from 'mongoose';

export interface ISlot {
  start: string; // "HH:MM" e.g. "09:00"
  end: string;   // "HH:MM" e.g. "17:00"
}

export interface IWeeklySchedule {
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)
  enabled: boolean;
  slots: ISlot[];
}

export interface IAvailability extends Document {
  expert: Types.ObjectId; // ref: User
  weeklyHours: IWeeklySchedule[];
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema = new Schema({
  start: { type: String, required: true },
  end: { type: String, required: true }
});

const WeeklyScheduleSchema = new Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  enabled: { type: Boolean, default: true },
  slots: [SlotSchema]
});

const AvailabilitySchema = new Schema<IAvailability>(
  {
    expert: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    weeklyHours: {
      type: [WeeklyScheduleSchema],
      default: () => [
        { dayOfWeek: 1, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 2, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 3, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 4, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 5, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { dayOfWeek: 0, enabled: false, slots: [] },
        { dayOfWeek: 6, enabled: false, slots: [] }
      ]
    },
    timezone: { type: String, default: 'UTC' }
  },
  { timestamps: true }
);

export const Availability = model<IAvailability>('Availability', AvailabilitySchema);
