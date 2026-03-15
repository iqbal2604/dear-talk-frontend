import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Room, Message, WsTypingPayload } from './types';

// =============================================
// Auth Store
// =============================================
interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('access_token', token);
        // Normalize semua numeric ID jadi number
        // (JSON dari localStorage bisa kembalikan string)
        const normalizedUser = {
          ...user,
          id: Number(user.id),
        };
        set({ user: normalizedUser, token });
      },
      clearAuth: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null });
      },
      updateUser: (user) => set({ user: { ...user, id: Number(user.id) } }),
    }),
    {
      name: 'deartalk-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

// =============================================
// Chat Store
// =============================================
interface TypingState {
  [roomId: number]: { [userId: number]: boolean };
}

interface ChatState {
  rooms: Room[];
  activeRoomId: number | null;
  messages: Record<number, Message[]>;
  unreadCounts: Record<number, number>;
  typing: TypingState;
  onlineUsers: Set<number>;

  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  removeRoom: (roomId: number) => void;
  setActiveRoom: (roomId: number | null) => void;

  setMessages: (roomId: number, messages: Message[]) => void;
  addMessage: (roomId: number, message: Message) => void;
  updateMessage: (roomId: number, message: Message) => void;
  removeMessage: (roomId: number, messageId: number) => void;

  incrementUnread: (roomId: number) => void;
  clearUnread: (roomId: number) => void;

  setTyping: (payload: WsTypingPayload) => void;
  setUserOnline: (userId: number) => void;
  setUserOffline: (userId: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  unreadCounts: {},
  typing: {},
  onlineUsers: new Set(),

  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) =>
    set((s) => ({
      rooms: [room, ...s.rooms.filter((r) => r.id !== room.id)],
    })),

  updateRoom: (room) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === room.id ? { ...r, ...room } : r)),
    })),

  removeRoom: (roomId) =>
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== roomId) })),

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  setMessages: (roomId, messages) =>
    set((s) => ({ messages: { ...s.messages, [roomId]: messages } })),

  addMessage: (roomId, message) =>
    set((s) => {
      const existing = s.messages[roomId] || [];
      // avoid duplicate (WS may fire alongside HTTP response)
      const alreadyExists = existing.some((m) => m.id === message.id);
      return {
        messages: {
          ...s.messages,
          [roomId]: alreadyExists ? existing : [...existing, message],
        },
        rooms: s.rooms.map((r) =>
          r.id === roomId ? { ...r, lastMessage: message } : r
        ),
      };
    }),

  updateMessage: (roomId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] || []).map((m) =>
          m.id === message.id ? message : m
        ),
      },
    })),

  removeMessage: (roomId, messageId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] || []).filter((m) => m.id !== messageId),
      },
    })),

  incrementUnread: (roomId) =>
    set((s) => ({
      unreadCounts: {
        ...s.unreadCounts,
        [roomId]: (s.unreadCounts[roomId] || 0) + 1,
      },
    })),

  clearUnread: (roomId) =>
    set((s) => {
      const next = { ...s.unreadCounts };
      delete next[roomId];
      return { unreadCounts: next };
    }),

  setTyping: ({ room_id, user_id, is_typing }) =>
    set((s) => ({
      typing: {
        ...s.typing,
        [room_id]: {
          ...(s.typing[room_id] || {}),
          [user_id]: is_typing,
        },
      },
    })),

  setUserOnline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),

  setUserOffline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
}));
