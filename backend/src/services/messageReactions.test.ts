import { describe, expect, it } from 'vitest';
import { MessageReaction, MESSAGE_REACTION_EMOJIS } from '../models/MessageReaction';
import { isMessageReactionEmoji } from './messageReactions';

describe('message reaction rules', () => {
  it('accepts only the supported reaction set', () => {
    expect(MESSAGE_REACTION_EMOJIS).toEqual(['❤️', '👍', '😂', '😮', '😢', '🔥']);
    expect(isMessageReactionEmoji('❤️')).toBe(true);
    expect(isMessageReactionEmoji('🚀')).toBe(false);
  });

  it('defines unique message/user persistence and conversation indexes', () => {
    const indexes = MessageReaction.schema.indexes();
    expect(indexes).toContainEqual([{ message: 1, user: 1 }, { background: true, unique: true }]);
    expect(indexes).toContainEqual([{ conversation: 1, message: 1 }, { background: true }]);
  });
});
