import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  unreadCounts: {
    user: Types.ObjectId;
    count: number;
  }[];
  relatedTo?: {
    modelType: 'Booking' | 'Question';
    id: Types.ObjectId;
  };
  blockedBy: Types.ObjectId[];
  reportedBy: {
    reporter: Types.ObjectId;
    reason: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: [
        (val: any[]) => val.length === 2,
        'A conversation must have exactly 2 participants'
      ]
    },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    unreadCounts: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        count: { type: Number, default: 0 }
      }
    ],
    relatedTo: {
      modelType: { type: String, enum: ['Booking', 'Question'] },
      id: { type: Schema.Types.ObjectId, refPath: 'relatedTo.modelType' }
    },
    blockedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reportedBy: [
      {
        reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

// Indexes for performance
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ 'relatedTo.id': 1 });

export const Conversation = model<IConversation>('Conversation', ConversationSchema);
