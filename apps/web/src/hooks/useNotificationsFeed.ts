import { useCallback, useEffect, useRef, useState } from 'react';
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
import { NOTIFICATIONS_CHANGED_EVENT } from '../lib/notificationsChanged';

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

  // A different member (or none) starts from an empty feed, so whoever signs
  // in next never sees the previous member's count or items while their own
  // first load is in flight (react.dev: adjusting state when a prop changes).
  const [feedUserId, setFeedUserId] = useState(userId);
  if (userId !== feedUserId) {
    setFeedUserId(userId);
    setUnreadCount(0);
    setItems([]);
  }

  // Loads overlap (a poll, then an announcement from /notifications), and
  // their answers can land in either order: only the latest one applies. A
  // previous user's answer is older than the new user's first load, so this
  // also drops it.
  const latestRequestRef = useRef(0);

  // The items on screen, for the realtime handler: a row a load already
  // brought in is neither prepended nor counted again. A load writes it as
  // its answer lands, not after the render, so an INSERT for the same row
  // arriving in between is not counted on top of the loaded count.
  const itemsRef = useRef<Notification[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Realtime rows the bell accepted, numbered in arrival order. A load's
  // snapshot can predate a row that arrived while it was in flight, so the
  // load merges back every row numbered after it started instead of dropping
  // it until the next poll.
  const acceptedRef = useRef<{ seq: number; row: Notification }[]>([]);
  const acceptedSeqRef = useRef(0);

  // Every load — first, polling back on, announcement, focus, poll — goes through this.
  const load = useCallback(() => {
    // Advance even with no member, so a request for the one who just signed
    // out is dropped when it lands.
    latestRequestRef.current += 1;
    const request = latestRequestRef.current;
    if (!userId) return;
    const startedAfter = acceptedSeqRef.current;
    void fetchBellFeed(userId).then((feed) => {
      if (request !== latestRequestRef.current) return;
      // Older rows are in any snapshot from now on; only newer ones need merging.
      acceptedRef.current = acceptedRef.current.filter((accepted) => accepted.seq > startedAfter);
      if (!feed.items) {
        // The list failed, so the items on screen stay, and so does whatever
        // they hold that the count can't be shown to include.
        setUnreadCount(feed.unreadCount);
        return;
      }
      const loaded = feed.items;
      const missed = acceptedRef.current
        .map((accepted) => accepted.row)
        .filter((row) => !loaded.some((item) => item.id === row.id))
        .reverse();
      const merged = [...missed, ...loaded].slice(0, BELL_LIMIT);
      setUnreadCount(feed.unreadCount + missed.filter((row) => !row.read).length);
      itemsRef.current = merged;
      setItems(merged);
    });
  }, [userId]);

  // Loads for each user, and again whenever polling turns on or off: while
  // /notifications is open the bell has no channel, so INSERTs that arrived
  // there only reach the bell through this reload.
  useEffect(() => {
    load();
  }, [load, pollingEnabled]);

  // /notifications announces its mark-read, mark-all and delete.
  useEffect(() => {
    if (!userId) return;
    const onChanged = () => {
      load();
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
  }, [userId, load]);

  useEffect(() => {
    if (!userId || !pollingEnabled) return;

    const onVisibilityChange = () => {
      if (!document.hidden) load();
    };
    const intervalId = window.setInterval(() => {
      load();
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
    // Ids this channel has delivered. Updated at once, unlike itemsRef, which
    // only catches up after a render: a redelivered event (a reconnect, two
    // events in one flush) must not be counted twice.
    const delivered = new Set<string>();
    acceptedRef.current = [];
    const channel = supabase
      .channel(uniqueChannelTopic(`notifications:${userId}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const notification = payload.new as Notification;
          // getNotifications and getUnreadNotificationCount both exclude chat
          // notifications, so one accepted here would disappear on reload.
          if (notification.type === 'message' || delivered.has(notification.id)) return;
          delivered.add(notification.id);
          if (itemsRef.current.some((item) => item.id === notification.id)) return;
          acceptedSeqRef.current += 1;
          acceptedRef.current = [...acceptedRef.current, { seq: acceptedSeqRef.current, row: notification }];
          if (!notification.read) setUnreadCount((count) => count + 1);
          setItems((previous) =>
            previous.some((item) => item.id === notification.id)
              ? previous
              : [notification, ...previous].slice(0, BELL_LIMIT)
          );
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
    const markOne = (item: Notification) => (item.id === notification.id ? { ...item, read: true } : item);
    // A row still waiting to be merged into a load comes back read, not unread.
    acceptedRef.current = acceptedRef.current.map((accepted) => ({ ...accepted, row: markOne(accepted.row) }));
    setItems((previous) => previous.map(markOne));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const result = await markAllNotificationsRead(supabase, userId);
    if (result.error) {
      console.error('Failed to mark all notifications read:', result.error);
      return;
    }
    setUnreadCount(0);
    acceptedRef.current = acceptedRef.current.map((accepted) => ({ ...accepted, row: { ...accepted.row, read: true } }));
    setItems((previous) => previous.map((item) => ({ ...item, read: true })));
  }, [userId]);

  const remove = useCallback(async (notification: Notification) => {
    const result = await deleteNotification(supabase, notification.id);
    if (result.error) {
      console.error('Failed to delete notification:', result.error);
      return false;
    }
    // A deleted row must not come back with a load that started before it arrived.
    acceptedRef.current = acceptedRef.current.filter((accepted) => accepted.row.id !== notification.id);
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
