import { useCallback, useEffect, useState } from 'react';
import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@nepally/shared';
import type { Notification } from '@nepally/shared';
import { supabase } from '../lib/supabase';

const BELL_LIMIT = 8;
const POLL_INTERVAL_MS = 30_000;

export interface NotificationsFeed {
  unreadCount: number;
  items: Notification[];
  markRead: (notification: Notification) => Promise<void>;
  markAllRead: () => Promise<void>;
  /** Resolves false (and keeps the item) when the delete fails. */
  remove: (notification: Notification) => Promise<boolean>;
}

export interface UseNotificationsFeedOptions {
  userId: string | null;
  /** False on /notifications, which loads and subscribes on its own. */
  pollingEnabled: boolean;
}

/** Unread count + recent notifications for the top-bar bell. */
export function useNotificationsFeed({ userId, pollingEnabled }: UseNotificationsFeedOptions): NotificationsFeed {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const [countResult, listResult] = await Promise.all([
      getUnreadNotificationCount(supabase, userId),
      getNotifications(supabase, userId, BELL_LIMIT, 0),
    ]);
    setUnreadCount(countResult.count);
    if (listResult.data) setItems(listResult.data);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId || !pollingEnabled) return;

    const onVisibilityChange = () => {
      if (!document.hidden) void load();
    };
    const intervalId = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [userId, pollingEnabled, load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const notification = payload.new as Notification;
          setUnreadCount((count) => count + 1);
          setItems((previous) => [notification, ...previous].slice(0, BELL_LIMIT));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(async (notification: Notification) => {
    if (notification.read) return;
    await markNotificationRead(supabase, notification.id);
    setUnreadCount((count) => Math.max(0, count - 1));
    setItems((previous) => previous.map((item) => (item.id === notification.id ? { ...item, read: true } : item)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(supabase, userId);
    setUnreadCount(0);
    setItems((previous) => previous.map((item) => ({ ...item, read: true })));
  }, [userId]);

  const remove = useCallback(async (notification: Notification) => {
    const result = await deleteNotification(supabase, notification.id);
    if (result.error) {
      console.error('Failed to delete notification:', result.error);
      return false;
    }
    setItems((previous) => previous.filter((item) => item.id !== notification.id));
    if (!notification.read) setUnreadCount((count) => Math.max(0, count - 1));
    return true;
  }, []);

  return {
    unreadCount: userId ? unreadCount : 0,
    items: userId ? items : [],
    markRead,
    markAllRead,
    remove,
  };
}
