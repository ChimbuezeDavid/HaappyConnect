import { Schema, model, Document, Types } from 'mongoose';

export interface ISystemSettings extends Document {
  platformFeePercentage: number; // default 20 (80/20 split)
  baseLiveCallPricePerMinute: number; // base per-minute rate
  responseSlaDays: number; // default 7 days escrow hold / SLA
  allowAdminRegistration: boolean; // default true, admin can toggle off to lock down portal
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    platformFeePercentage: { type: Number, default: 20, min: 0, max: 100 },
    baseLiveCallPricePerMinute: { type: Number, default: 500, min: 0 },
    responseSlaDays: { type: Number, default: 7, min: 1, max: 30 },
    allowAdminRegistration: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Helper function to get or create settings singleton
export async function getSystemSettings(): Promise<ISystemSettings> {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({
      platformFeePercentage: 20,
      baseLiveCallPricePerMinute: 500,
      responseSlaDays: 7,
      allowAdminRegistration: true,
    });
  }
  return settings;
}

export const SystemSettings = model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
