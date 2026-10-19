import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth';

interface SocketState {
  socket: Socket | null;
  unreadCount: number;
  connect: () => void;
  disconnect: () => void;
  incrementUnread: () => void;
  resetUnread: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  unreadCount: 0,
  connect: () => {
    if (get().socket?.connected) return;
    const token = useAuthStore.getState().getToken();
    if (!token) return;
    const socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('notification:new', () => set((s) => ({ unreadCount: s.unreadCount + 1 })));
    set({ socket });
  },
  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null });
  },
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
}));

