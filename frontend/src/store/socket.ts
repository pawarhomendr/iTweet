import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth';

interface SocketState {
  socket: Socket | null;
  unreadCount: number;
  onlineUserIds: string[];
  connect: () => void;
  disconnect: () => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  isUserOnline: (userId: string) => boolean;
}

export function resolveSocketUrl(env: { VITE_SOCKET_URL?: string; VITE_API_URL?: string } = import.meta.env): string {
  const socketUrl = env.VITE_SOCKET_URL?.trim();
  if (socketUrl) return socketUrl;

  const apiUrl = env.VITE_API_URL?.trim();
  if (apiUrl) {
    try {
      return new URL(apiUrl).origin;
    } catch {
      // Non-absolute or invalid API URL (e.g. '/api') should keep local proxy fallback.
    }
  }

  return '/';
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  unreadCount: 0,
  onlineUserIds: [],
  connect: () => {
    if (get().socket?.connected) return;
    const token = useAuthStore.getState().getToken();
    if (!token) return;

    const socket = io(resolveSocketUrl(), { auth: { token }, transports: ['websocket', 'polling'] });

    socket.on('notification:new', () => set((s) => ({ unreadCount: s.unreadCount + 1 })));

    socket.on('presence:sync', (userIds: string[]) => {
      set({ onlineUserIds: userIds });
    });

    socket.on('user:online', ({ userId }: { userId: string }) => {
      set((s) => ({
        onlineUserIds: s.onlineUserIds.includes(userId) ? s.onlineUserIds : [...s.onlineUserIds, userId],
      }));
    });

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      set((s) => ({
        onlineUserIds: s.onlineUserIds.filter((id) => id !== userId),
      }));
    });

    set({ socket });
  },
  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, onlineUserIds: [] });
  },
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
  isUserOnline: (userId: string) => {
    return get().onlineUserIds.includes(userId);
  },
}));
