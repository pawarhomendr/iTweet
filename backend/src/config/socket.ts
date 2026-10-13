import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import xss from 'xss';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Notification } from '../models/Notification';

interface SocketUser {
  userId: string;
  username: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
    // Track which conversation rooms this socket has legitimately joined
    joinedRooms?: Set<string>;
  }
}

let io: SocketServer;

// FIX I-4: Simple per-socket rate limiter
const messageRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const RATE_LIMIT_MAX = 2; // max 2 messages per second

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = messageRateLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    messageRateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function initSocket(server: HttpServer): SocketServer {
  const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  // FIX SC-1: Fail explicitly if frontend URL is not set in production
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

  // Auth middleware — FIX A-1: pin algorithm
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('No auth token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as { userId: string; username: string };
      socket.user = { userId: payload.userId, username: payload.username };
      socket.joinedRooms = new Set();
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.user!;
    console.log(`[socket] user ${userId} connected`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Join a conversation (verifies membership) — FIX I-3: track joined rooms
    socket.on('join:conversation', async (conversationId: string) => {
      // Validate conversationId is a valid-looking MongoDB ObjectId (24 hex chars)
      if (!/^[a-fA-F0-9]{24}$/.test(conversationId)) {
        return socket.emit('error', { message: 'Invalid conversation ID' });
      }
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

    // Send message — FIX I-2: XSS sanitize; FIX I-4: rate limit
    socket.on('message:send', async (data: { conversationId: string; text: string }) => {
      const { conversationId, text } = data;

      // Basic validation
      if (!conversationId || !/^[a-fA-F0-9]{24}$/.test(conversationId)) {
        return socket.emit('error', { message: 'Invalid conversation ID' });
      }
      if (!text || typeof text !== 'string' || text.trim().length === 0) return;
      if (text.length > 2000) return socket.emit('error', { message: 'Message too long' });

      // FIX I-4: rate limit
      if (!checkRateLimit(userId)) {
        return socket.emit('error', { message: 'Slow down — you are sending messages too fast.' });
      }

      // FIX I-3: Verify this socket actually joined the conversation room
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

        // FIX I-2: XSS sanitize stored message text before DB write
        const safeText = xss(text.trim());

        const msg = await Message.create({
          conversation: conversationId,
          sender: userId,
          text: safeText,
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: msg._id,
          updatedAt: new Date(),
        });

        const populated = await msg.populate('sender', 'username avatar');
        io.to(`conv:${conversationId}`).emit('message:new', populated);

        // Notify the other participant(s)
        const others = memberIds.filter((id) => id !== userId);
        others.forEach((otherId) => {
          io.to(`user:${otherId}`).emit('notification:new', {
            type: 'message',
            conversationId,
          });
        });
      } catch {
        socket.emit('error', { message: 'Could not send message' });
      }
    });

    // FIX I-3: typing indicators — verify room membership before broadcast
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      if (!socket.joinedRooms?.has(conversationId)) return;
      socket.to(`conv:${conversationId}`).emit('typing:start', { userId, conversationId });
    });
    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      if (!socket.joinedRooms?.has(conversationId)) return;
      socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      messageRateLimit.delete(userId); // cleanup rate limit entry
      console.log(`[socket] user ${userId} disconnected`);
    });
  });

  return io;
}

/** Emit a notification to a specific user's room */
export function emitNotification(userId: string, payload: object): void {
  getIO().to(`user:${userId}`).emit('notification:new', payload);
}
