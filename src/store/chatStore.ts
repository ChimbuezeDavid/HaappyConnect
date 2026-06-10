import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { api, API_URL } from '../lib/api';

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  media?: {
    url: string;
    type: 'image' | 'audio' | 'video';
  };
  readBy: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  relatedTo?: {
    modelType: 'Booking' | 'Question';
    id: string;
  };
  blockedBy: string[];
  isBlocked: boolean;
  otherProfile: {
    userId: string;
    fullName: string;
    avatarUrl: string;
    headline: string;
  };
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeChatId: string | null;
  messages: ChatMessage[];
  socket: Socket | null;
  isTyping: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string, before?: string) => Promise<void>;
  initiateConversation: (participantId: string, relatedToModel?: 'Booking' | 'Question', relatedToId?: string) => Promise<Conversation>;
  sendMessage: (conversationId: string, content?: string, media?: { url: string; type: 'image' | 'audio' | 'video' }) => void;
  sendMediaMessage: (conversationId: string, base64: string, fileName: string, fileType: 'image' | 'audio' | 'video') => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  markAsRead: (conversationId: string) => void;
  deleteMessage: (messageId: string) => void;
  blockConversation: (conversationId: string) => Promise<void>;
  reportConversation: (conversationId: string, reason: string) => Promise<void>;
  clearActiveChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeChatId: null,
  messages: [],
  socket: null,
  isTyping: false,
  isLoadingConversations: false,
  isLoadingMessages: false,
  error: null,

  connectSocket: (token) => {
    const { socket: currentSocket } = get();
    if (currentSocket) {
      currentSocket.disconnect();
    }

    const socketUrl = API_URL.replace(/\/api$/, '');
    console.log('[Socket] Connecting to:', socketUrl);
    
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server');
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socket.on('messageReceived', (message: ChatMessage) => {
      const { activeChatId, messages } = get();
      if (activeChatId === message.conversationId) {
        if (!messages.some((m) => m._id === message._id)) {
          set({ messages: [message, ...messages] });
        }
        socket.emit('markAsRead', { conversationId: message.conversationId });
      }
    });

    socket.on('typingStatus', ({ conversationId, isTyping }) => {
      const { activeChatId } = get();
      if (activeChatId === conversationId) {
        set({ isTyping });
      }
    });

    socket.on('messagesRead', ({ conversationId, userId }) => {
      const { activeChatId, messages } = get();
      if (activeChatId === conversationId) {
        const updated = messages.map((m) => {
          if (m.senderId !== userId && !m.readBy.includes(userId)) {
            return { ...m, readBy: [...m.readBy, userId] };
          }
          return m;
        });
        set({ messages: updated });
      }
    });

    socket.on('messageDeleted', ({ conversationId, messageId }) => {
      const { activeChatId, messages } = get();
      if (activeChatId === conversationId) {
        const updated = messages.map((m) => {
          if (m._id === messageId) {
            return { ...m, isDeleted: true };
          }
          return m;
        });
        set({ messages: updated });
      }
    });

    socket.on('conversationUpdated', () => {
      get().fetchConversations();
    });

    set({ socket, error: null });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const data = await api.get('/chat/conversations');
      set({ conversations: data, isLoadingConversations: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch conversations', isLoadingConversations: false });
    }
  },

  fetchMessages: async (conversationId, before) => {
    const isLoadMore = !!before;
    if (!isLoadMore) {
      set({ isLoadingMessages: true, activeChatId: conversationId, messages: [], isTyping: false });
    }

    try {
      const url = `/chat/conversations/${conversationId}/messages` + (before ? `?before=${before}` : '');
      const newMessages: ChatMessage[] = await api.get(url);

      set((state) => ({
        messages: isLoadMore ? [...state.messages, ...newMessages] : newMessages,
        isLoadingMessages: false
      }));

      // Acknowledge read status
      const { socket } = get();
      if (socket) {
        socket.emit('markAsRead', { conversationId });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch messages', isLoadingMessages: false });
    }
  },

  initiateConversation: async (participantId, relatedToModel, relatedToId) => {
    try {
      const conversation = await api.post('/chat/conversations', {
        participantId,
        relatedToModel,
        relatedToId
      });
      get().fetchConversations();
      return conversation;
    } catch (err: any) {
      set({ error: err.message || 'Failed to start conversation' });
      throw err;
    }
  },

  sendMessage: (conversationId, content, media) => {
    const { socket } = get();
    if (socket) {
      socket.emit('sendMessage', { conversationId, content, media });
    }
  },

  sendMediaMessage: async (conversationId, base64, fileName, fileType) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/media`, {
        base64,
        fileName,
        fileType
      });
      get().sendMessage(conversationId, undefined, { url: response.url, type: fileType });
    } catch (err: any) {
      set({ error: err.message || 'Failed to send media attachment' });
      throw err;
    }
  },

  setTyping: (conversationId, isTyping) => {
    const { socket } = get();
    if (socket) {
      socket.emit('typing', { conversationId, isTyping });
    }
  },

  markAsRead: (conversationId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('markAsRead', { conversationId });
    }
  },

  deleteMessage: (messageId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('deleteMessage', { messageId });
    }
  },

  blockConversation: async (conversationId) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/block`, {});
      get().fetchConversations();
    } catch (err: any) {
      set({ error: err.message || 'Failed to block conversation' });
      throw err;
    }
  },

  reportConversation: async (conversationId, reason) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/report`, { reason });
    } catch (err: any) {
      set({ error: err.message || 'Failed to report user' });
      throw err;
    }
  },

  clearActiveChat: () => {
    set({ activeChatId: null, messages: [], isTyping: false });
  }
}));
