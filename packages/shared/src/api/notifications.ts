/**
 * Notification API functions — Supabase query logic (dependency injection pattern)
 * See: supabase/migrations/001_schema.sql (notifications table)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Notification } from '../types/notification';

export interface NotificationsResult {
  data?: Notification[];
  /** True when a full page came back, so another may follow. */
  hasMore?: boolean;
  error?: Error;
}

export interface NotificationCountResult {
  count: number;
  error?: Error;
}

export interface NotificationResult {
  error?: Error;
}

/**
 * Fetch notifications for a user, newest first, with pagination.
 */
export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
  offset = 0
): Promise<NotificationsResult> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .neq('type', 'message')
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: new Error(error.message) };
  const rows = (data ?? []) as Notification[];
  return { data: rows, hasMore: rows.length === limit };
}

/**
 * Count unread notifications for a user.
 */
export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationCountResult> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('type', 'message')
    .eq('read', false);

  if (error) return { count: 0, error: new Error(error.message) };
  return { count: count ?? 0 };
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<NotificationResult> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) return { error: new Error(error.message) };
  return {};
}

/**
 * Mark all of a user's notifications as read.
 */
export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationResult> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .neq('type', 'message')
    .eq('read', false);

  if (error) return { error: new Error(error.message) };
  return {};
}

/**
 * Delete (dismiss) a notification.
 */
export async function deleteNotification(
  supabase: SupabaseClient,
  notificationId: string
): Promise<NotificationResult> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) return { error: new Error(error.message) };
  return {};
}
