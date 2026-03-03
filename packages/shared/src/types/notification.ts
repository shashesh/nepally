/**
 * Notification types — snake_case matching Supabase database columns
 * See: supabase/migrations/001_schema.sql
 */

export type NotificationType = 'message' | 'post_response' | 'emergency_alert' | 'system';

export type NotifyChatPref = 'all' | 'batched' | 'off';
export type NotifyLikesPref = 'all' | 'grouped' | 'off';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  sent_at: string;
}
