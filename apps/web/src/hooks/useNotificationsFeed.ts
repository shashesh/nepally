import { useCallback, useEffect, useState } from 'react';
import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  uniqueChannelTopic,
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

interface BellFeed {
  unreadCount: number;
  /** Null when the list request failed, so the items on screen are kept. */
  items: Notification[] | null;
}

async function fetchBellFeed(userId: string): Promise<BellFeed> {
  const [countResult, listResult] = await Promise.all([
    getUnreadNotificationCount(supabase, userId),
    getNotifications(supabase, userId, BELL_LIMIT, 0),
  ]);
  return { unreadCount: countResult.count, items: listResult.data ?? null };
}

/** Unread count + recent notifications for the top-bar bell. */
export function useNotificationsFeed({ userId, pollingEnabled }: UseNotificationsFeedOptions): NotificationsFeed {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);

  const applyFeed = useCallback((feed: BellFeed) => {
    setUnreadCount(feed.unreadCount);
    if (feed.items) setItems(feed.items);
  }, []);

  // The poll and tab-focus refresh go through this.
  const load = useCallback(async () => {
    if (!userId) return;
    applyFeed(await fetchBellFeed(userId));
  }, [userId, applyFeed]);

  // Initial load for each user; a response for a previous user is dropped.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchBellFeed(userId).then((feed) => {
      if (!cancelled) applyFeed(feed);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, applyFeed]);

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
    // /notifications owns its own subscription, so staying out avoids a second
    // channel for the same INSERTs and a badge that page does not control.
    if (!userId || !pollingEnabled) return;
    const channel = supabase
      .channel(uniqueChannelTopic(`notifications:${userId}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const notification = payload.new as Notification;
          // getNotifications and getUnreadNotificationCount both exclude chat
          // notifications, so one accepted here would disappear on reload.
          if (notification.type === 'message') return;
          setUnreadCount((count) => count + 1);
          setItems((previous) => [notification, ...previous].slice(0, BELL_LIMIT));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, pollingEnabled]);

  const markRead = useCallback(async (notification: Notification) => {
    if (notification.read) return;
    const result = await markNotificationRead(supabase, notification.id);
    if (result.error) {
      console.error('Failed to mark notification read:', result.error);
      return;
    }
    setUnreadCount((count) => Math.max(0, count - 1));
    setItems((previous) => previous.map((item) => (item.id === notification.id ? { ...item, read: true } : item)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const result = await markAllNotificationsRead(supabase, userId);
    if (result.error) {
      console.error('Failed to mark all notifications read:', result.error);
      return;
    }
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
