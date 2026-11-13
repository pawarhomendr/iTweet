import mongoose, { Document, Schema, Types } from 'mongoose';

export const MESSAGE_REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'] as const;
export type MessageReactionEmoji = typeof MESSAGE_REACTION_EMOJIS[number];

export interface IMessageReaction extends Document {
  message: Types.ObjectId;
  conversation: Types.ObjectId;
  user: Types.ObjectId;
  emoji: MessageReactionEmoji;
  createdAt: Date;
  updatedAt: Date;
}

const messageReactionSchema = new Schema<IMessageReaction>(
  {
    message: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, enum: MESSAGE_REACTION_EMOJIS, required: true },
  },
  { timestamps: true }
);

// A user has one reaction per message; changing emoji updates this record.
messageReactionSchema.index({ message: 1, user: 1 }, { unique: true });
messageReactionSchema.index({ conversation: 1, message: 1 });

export const MessageReaction = mongoose.model<IMessageReaction>('MessageReaction', messageReactionSchema);
