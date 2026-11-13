import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import xss from 'xss';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { MessageReaction } from '../models/MessageReaction';
import { User } from '../models/User';
import { isMessageReactionEmoji, serializeMessageReactions } from '../services/messageReactions';
import { isAccountUnavailable } from '../middleware/auth';
import type { IUser } from '../models/User';

interface SocketUser {
  userId: string;
  username: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
    // Track which conversation rooms this socket has legitimately joined
    joinedRooms?: Set<string>;
    accountCheckedAt?: number;
    accountActive?: boolean;
  }
}

let io: SocketServer;

// Server-managed online presence: userId -> Set of socket IDs
const onlineUsers = new Map<string, Set<string>>();

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && (onlineUsers.get(userId)?.size ?? 0) > 0;
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

type RateLimitEntry = { count: number; resetAt: number };
const socketRateLimits = new Map<string, Map<string, RateLimitEntry>>();

// This limiter is intentionally conservative for unauthenticated callers: they share one bucket.
// State is process-local; deployments with multiple backend instances need a shared limiter store.
const ANONYMOUS_RATE_LIMIT_KEY = '__anonymous__';

export const SOCKET_RATE_LIMIT_ERROR = {
  code: 'SOCKET_RATE_LIMITED',
  message: 'Too many requests. Please try again later.',
} as const;

export const SOCKET_EVENT_RATE_LIMITS = {
  message: { max: 4, windowMs: 1_000 },
  join: { max: 20, windowMs: 60_000 },
  reaction: { max: 30, windowMs: 10_000 },
  typing: { max: 20, windowMs: 5_000 },
  presence: { max: 10, windowMs: 60_000 },
} as const;

function getSocketRateLimitKey(userId?: string): string {
  return typeof userId === 'string' && userId.trim() ? userId.trim() : ANONYMOUS_RATE_LIMIT_KEY;
}

export function pruneSocketRateLimits(now = Date.now()): void {
  for (const [key, userLimits] of socketRateLimits) {
    for (const [event, entry] of userLimits) {
      if (now >= entry.resetAt) userLimits.delete(event);
    }
    if (userLimits.size === 0) socketRateLimits.delete(key);
  }
}

export function checkSocketEventRateLimit(
  userId: string | undefined,
  event: keyof typeof SOCKET_EVENT_RATE_LIMITS,
  now = Date.now(),
): boolean {
  pruneSocketRateLimits(now);
  const config = SOCKET_EVENT_RATE_LIMITS[event];
  const key = getSocketRateLimitKey(userId);
  const userLimits = socketRateLimits.get(key) ?? new Map<string, RateLimitEntry>();
  const entry = userLimits.get(event);

  if (!entry || now >= entry.resetAt) {
    userLimits.set(event, { count: 1, resetAt: now + config.windowMs });
    socketRateLimits.set(key, userLimits);
    return true;
  }

  if (entry.count >= config.max) return false;
  entry.count++;
  return true;
}

export function resetSocketRateLimits(): void {
  socketRateLimits.clear();
}

export function emitSocketRateLimitError(socket: Pick<Socket, 'emit'>): void {
  socket.emit('error', SOCKET_RATE_LIMIT_ERROR);
}

const SOCKET_USER_ID_PATTERN = /^[a-f\d]{24}$/i;

export function verifySocketAccessToken(token: unknown, secret = process.env.JWT_SECRET): string {
  if (typeof token !== 'string' || token.length < 1 || token.length > 8192 || !secret) {
    throw new Error('Invalid socket token');
  }

  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { userId?: unknown };
  if (typeof payload.userId !== 'string' || !SOCKET_USER_ID_PATTERN.test(payload.userId)) {
    throw new Error('Invalid socket token');
  }
  return payload.userId;
}

export function isSocketAccountEligible(
  user: Pick<IUser, 'emailVerified' | 'isSuspended' | 'suspendedUntil' | 'isDisabled'> | null,
): boolean {
  return Boolean(user && user.emailVerified && !isAccountUnavailable(user));
}

export async function ensureSocketAccountActive(socket: Socket): Promise<boolean> {
  const now = Date.now();
  const userId = socket.user?.userId;
  if (!userId) {
    socket.emit('error', { message: 'Account unavailable' });
    socket.disconnect(true);
    return false;
  }

  let user: Pick<IUser, 'username' | 'emailVerified' | 'isSuspended' | 'suspendedUntil' | 'isDisabled'> | null = null;
  try {
    user = await User.findById(userId).select('username emailVerified isSuspended suspendedUntil isDisabled').lean();
  } catch {
    socket.accountCheckedAt = now;
    socket.accountActive = false;
  }

  socket.accountCheckedAt = now;
  socket.accountActive = isSocketAccountEligible(user);

  if (!user || !socket.accountActive) {
    socket.emit('error', { message: 'Account unavailable' });
    socket.disconnect(true);
    return false;
  }

  socket.user!.username = user.username;
  return true;
}

export async function authorizeAndRateLimitSocketEvent(
  socket: Socket,
  event: keyof typeof SOCKET_EVENT_RATE_LIMITS,
): Promise<boolean> {
  if (!(await ensureSocketAccountActive(socket))) return false;

  if (!checkSocketEventRateLimit(socket.user?.userId, event)) {
    emitSocketRateLimitError(socket);
    return false;
  }

  return true;
}

export async function authenticateSocket(socket: Socket, next: (error?: Error) => void): Promise<void> {
  const token = socket.handshake.auth?.token as unknown;
  if (!token) {
    next(new Error('No auth token'));
    return;
  }

  try {
    const userId = verifySocketAccessToken(token);
    const user = await User.findById(userId)
      .select('username emailVerified isSuspended suspendedUntil isDisabled')
      .lean();

    if (!user || !isSocketAccountEligible(user)) {
      next(new Error('Account unavailable'));
      return;
    }

    socket.user = { userId: String(user._id), username: user.username };
    socket.joinedRooms = new Set();
    socket.accountCheckedAt = Date.now();
    socket.accountActive = true;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

function isAllowedImageUrl(value: string): boolean {
  if (value.startsWith('data:image/')) return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i.test(value);
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function initSocket(server: HttpServer): SocketServer {
  const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    throw new Error('[startup] FATAL: FRONTEND_URL must be set for Socket.IO CORS in production');
  }

  io = new SocketServer(server, {
    cors: {
      origin: frontendOrigin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use((socket, next) => {
    void authenticateSocket(socket, next);
  });

  io.on('connection', (socket) => {
    const { userId, username } = socket.user!;

    // Track presence across multiple tabs/devices
    const userSockets = onlineUsers.get(userId) || new Set<string>();
    const wasAlreadyOnline = userSockets.size > 0;
    userSockets.add(socket.id);
    onlineUsers.set(userId, userSockets);

    // If this is the user's first active connection, broadcast online status
    if (!wasAlreadyOnline) {
      io.emit('user:online', { userId, username });
    }

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Allow client to request current list of online user IDs
    socket.on('presence:get', async () => {
      if (!(await authorizeAndRateLimitSocketEvent(socket, 'presence'))) return;
      socket.emit('presence:sync', Array.from(onlineUsers.keys()));
    });

    // Send presence list immediately on connection
    socket.emit('presence:sync', Array.from(onlineUsers.keys()));

    // Join a conversation (verifies membership)
    socket.on('join:conversation', async (conversationId: string) => {
      if (!(await authorizeAndRateLimitSocketEvent(socket, 'join'))) return;
      if (typeof conversationId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(conversationId)) {
        return socket.emit('error', { message: 'Invalid conversation ID' });
      }
      if (socket.joinedRooms?.has(conversationId)) return;
      try {
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) return socket.emit('error', { message: 'Conversation not found' });
        const memberIds = conv.participants.map((p) => p.toString());
        if (!memberIds.includes(userId)) {
          return socket.emit('error', { message: 'Not a participant' });
        }
        socket.join(`conv:${conversationId}`);
        socket.joinedRooms?.add(conversationId);
      } catch {
        socket.emit('error', { message: 'Could not join conversation' });
      }
    });

    // Send message — supports text, imageUrl, and gifUrl
    socket.on('message:send', async (data: { conversationId: string; text?: string; imageUrl?: string; gifUrl?: string }) => {
      if (!(await authorizeAndRateLimitSocketEvent(socket, 'message'))) return;
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid message payload' });
      }
      const { conversationId, text = '', imageUrl = '', gifUrl = '' } = data;

      if (!conversationId || !/^[a-fA-F0-9]{24}$/.test(conversationId)) {
        return socket.emit('error', { message: 'Invalid conversation ID' });
      }

      const hasContent = (typeof text === 'string' && text.trim().length > 0) || Boolean(imageUrl) || Boolean(gifUrl);
      if (!hasContent) return;

      if (text && text.length > 2000) {
        return socket.emit('error', { message: 'Message too long' });
      }

      if (!socket.joinedRooms?.has(conversationId)) {
        return socket.emit('error', { message: 'Join the conversation first' });
      }

      try {
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv) return socket.emit('error', { message: 'Conversation not found' });
        const memberIds = conv.participants.map((p) => p.toString());
        if (!memberIds.includes(userId)) {
          return socket.emit('error', { message: 'Not a participant' });
        }

        const safeText = text ? xss(text.trim()) : '';
         if (imageUrl && (!isAllowedImageUrl(imageUrl) || imageUrl.length > 1_000_000)) {
           return socket.emit('error', { message: 'Invalid image attachment' });
         }
         const safeImageUrl = imageUrl && typeof imageUrl === 'string' ? imageUrl : '';
        const safeGifUrl = gifUrl && typeof gifUrl === 'string' ? gifUrl.slice(0, 1000) : '';

        const msg = await Message.create({
          conversation: conversationId,
          sender: userId,
          text: safeText,
          imageUrl: safeImageUrl,
          gifUrl: safeGifUrl,
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: msg._id,
          updatedAt: new Date(),
        });

         const populated = await msg.populate('sender', 'username displayName avatar isVerified');
         io.to(`conv:${conversationId}`).emit('message:new', { ...populated.toObject(), reactions: [] });

        // Notify other participants
        const others = memberIds.filter((id) => id !== userId);
        others.forEach((otherId) => {
          io.to(`user:${otherId}`).emit('notification:new', {
            type: 'message',
            conversationId,
            message: safeText || (safeImageUrl ? 'Sent an image' : 'Sent a GIF'),
          });
        });
      } catch {
        socket.emit('error', { message: 'Could not send message' });
      }
    });

    // Toggle one persisted reaction per user/message and synchronize the room.
    socket.on('reaction:toggle', async (data: { conversationId: string; messageId: string; emoji: string }) => {
      if (!data || typeof data !== 'object') {
        return socket.emit('error', { message: 'Invalid reaction payload' });
      }
      const { conversationId, messageId, emoji } = data;
      if (!(await authorizeAndRateLimitSocketEvent(socket, 'reaction'))) return;
      if (!/^[a-fA-F0-9]{24}$/.test(conversationId) || !/^[a-fA-F0-9]{24}$/.test(messageId)) {
        return socket.emit('error', { message: 'Invalid reaction target' });
      }
      if (!isMessageReactionEmoji(emoji)) {
        return socket.emit('error', { message: 'Unsupported reaction' });
      }
      if (!socket.joinedRooms?.has(conversationId)) {
        return socket.emit('error', { message: 'Join the conversation first' });
      }

      try {
        const conv = await Conversation.findById(conversationId).lean();
        if (!conv || !conv.participants.some((participant) => participant.toString() === userId)) {
          return socket.emit('error', { message: 'Not a participant' });
        }
        const message = await Message.findOne({ _id: messageId, conversation: conversationId }).lean();
        if (!message) return socket.emit('error', { message: 'Message not found' });

        const existing = await MessageReaction.findOne({ message: messageId, user: userId });
        if (existing?.emoji === emoji) await existing.deleteOne();
        else if (existing) {
          existing.emoji = emoji;
          await existing.save();
        } else {
          await MessageReaction.create({ message: messageId, conversation: conversationId, user: userId, emoji });
        }

        const reactions = await serializeMessageReactions(messageId);
        io.to(`conv:${conversationId}`).emit('reaction:update', { conversationId, messageId, reactions });
      } catch {
        socket.emit('error', { message: 'Could not update reaction' });
      }
    });

    // Typing indicators
    socket.on('typing:start', async (data: { conversationId: string }) => {
      if (!data || typeof data !== 'object') return;
      const { conversationId } = data;
      if (!(await authorizeAndRateLimitSocketEvent(socket, 'typing'))) return;
      if (typeof conversationId !== 'string' || !socket.joinedRooms?.has(conversationId)) return;
      socket.to(`conv:${conversationId}`).emit('typing:start', { userId, conversationId });
    });
    socket.on('typing:stop', async (data: { conversationId: string }) => {
      if (!data || typeof data !== 'object') return;
      const { conversationId } = data;
      if (!(await authorizeAndRateLimitSocketEvent(socket, 'typing'))) return;
      if (typeof conversationId !== 'string' || !socket.joinedRooms?.has(conversationId)) return;
      socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          socketRateLimits.delete(getSocketRateLimitKey(userId));
          const lastSeen = new Date();
          // Update user's lastSeen in DB
          User.findByIdAndUpdate(userId, { lastSeen }).exec();
          // Broadcast offline status
          io.emit('user:offline', { userId, lastSeen });
        }
      }
    });
  });

  return io;
}

/** Emit a notification to a specific user's room */
export function emitNotification(userId: string, payload: object): void {
  getIO().to(`user:${userId}`).emit('notification:new', payload);
}
