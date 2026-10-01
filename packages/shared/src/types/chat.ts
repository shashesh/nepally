/**
 * Chat and messaging types — snake_case matching Supabase database columns
 * See: supabase/migrations/001_schema.sql
 */

/** Raw conversation row from conversations table */
export interface Conversation {
  id: string;
  last_message: string | null;
  last_message_time: string | null;
  created_at: string;
  updated_at: string;
}

/** Denormalized conversation for list display (joined from multiple tables) */
export interface ConversationWithParticipant {
  id: string;
  last_message: string | null;
  last_message_time: string | null;
  created_at: string;
  /** Null when the partner's account was purged: their participant row is gone. */
  other_user_id: string | null;
  /** UNAVAILABLE_ACCOUNT_NAME when the partner is pending deletion or purged. */
  other_user_name: string;
  other_user_photo?: string | null;
  other_user_trust_level?: number;
  /** False when the partner is pending deletion (hidden by RLS) or purged. */
  other_user_available: boolean;
  unread_count: number;
}

/** Message row from messages table */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  type: 'text' | 'image' | 'system';
  image_url?: string;
  system_message_type?: string;
  read: boolean;
  read_at: string | null;
  timestamp: string;
}

/** Blocked user relationship */
export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}
