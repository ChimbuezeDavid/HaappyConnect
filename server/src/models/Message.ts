import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content?: string;
  media?: {
    url: string;
    type: 'image' | 'audio' | 'video';
  };
  readBy: Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    media: {
      url: { type: String },
      type: { type: String, enum: ['image', 'audio', 'video'] }
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for query performance
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1 });

export const Message = model<IMessage>('Message', MessageSchema);
