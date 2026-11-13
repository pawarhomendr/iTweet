import { Types } from 'mongoose';
import { MessageReaction, MESSAGE_REACTION_EMOJIS, MessageReactionEmoji } from '../models/MessageReaction';

export interface SerializedMessageReaction {
  userId: string;
  username: string;
  displayName: string;
  emoji: MessageReactionEmoji;
}

export function isMessageReactionEmoji(value: unknown): value is MessageReactionEmoji {
  return MESSAGE_REACTION_EMOJIS.includes(value as MessageReactionEmoji);
}

export async function loadMessageReactions(messageIds: Array<string | Types.ObjectId>): Promise<Map<string, SerializedMessageReaction[]>> {
  const ids = messageIds.map((id) => String(id));
  const docs = await MessageReaction.find({ message: { $in: ids } })
    .populate('user', 'username displayName')
    .lean();
  const grouped = new Map<string, SerializedMessageReaction[]>();

  for (const doc of docs as any[]) {
    if (!doc.user) continue;
    const key = String(doc.message);
    const list = grouped.get(key) ?? [];
    list.push({
      userId: String(doc.user._id),
      username: doc.user.username,
      displayName: doc.user.displayName,
      emoji: doc.emoji,
    });
    grouped.set(key, list);
  }

  return grouped;
}

export async function serializeMessageReactions(messageId: string | Types.ObjectId): Promise<SerializedMessageReaction[]> {
  const grouped = await loadMessageReactions([messageId]);
  return grouped.get(String(messageId)) ?? [];
}
