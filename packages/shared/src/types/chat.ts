/**
 * Chat and messaging types
 */

export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  participantDetails: {
    [userId: string]: {
      name: string;
      photo?: string;
    };
  };
  postId?: string; // If conversation is about a specific post
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: {
    [userId: string]: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: Date;
  read: boolean;
  readAt?: Date;
  type: 'text' | 'image' | 'system';
  imageUrl?: string;
  systemMessageType?: 'user-joined' | 'user-left' | 'post-expired';
}
