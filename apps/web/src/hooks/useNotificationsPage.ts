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
import { announceNotificationsChanged } from '../lib/notificationsChanged';

export const NOTIFICATIONS_PAGE_SIZE = 20;

const LOAD_ERROR = "Couldn't load your notifications.";
const LOAD_MORE_ERROR = "Couldn't load more notifications.";

export interface NotificationsPageState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  /** The first page or the count failed. The list is empty, never stale. */
  error: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retryLoadMore: () => void;
  reload: () => void;
  /** Resolves false on failure, with the row unchanged. Already read resolves true with no call. */
  markRead: (notification: Notification) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  remove: (notification: Notification) => Promise<boolean>;
}

/** Adds rows, skipping ids already present, newest first. */
function mergeRows(current: Notification[], rows: Notification[]): Notification[] {
  const seen = new Set(current.map((n) => n.id));
  const fresh = rows.filter((n) => !seen.has(n.id));
  if (fresh.length === 0) return current;
  return [...current, ...fresh].sort((a, b) => b.sent_at.localeCompare(a.sent_at));
}

/** Adds one page after the rows on screen, skipping ids already present. */
function appendPage(current: Notification[], rows: Notification[]): Notification[] {
  const seen = new Set(current.map((n) => n.id));
  const fresh = rows.filter((n) => !seen.has(n.id));
  return fresh.length ? [...current, ...fresh] : current;
}

/**
 * The /notifications page's list, unread count and live updates.
 *
 * The channel is joined before the first request, so a notification that
 * arrives while the page loads is not lost. It is merged into the first page
 * by id but not counted: the count query ran at the same time and may already
 * include it, so the count can read one low in that race, never one high.
 *
 * The next page starts at `notifications.length`. A realtime row adds one to
 * the screen and one to the server's list alike, and a delete takes one from
 * both, so counting rows on screen keeps the offset in step. That only holds
 * when a delete and a page never overlap, so they are serialized as in
 * useMyListings: a delete waits for a page in flight, and no page is
 * requested (`hasMore` reads false) while a delete is pending.
 */
export function useNotificationsPage(userId: string | null): NotificationsPageState {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Bumped by each load; anything started under an older one is dropped.
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const deletesInFlightRef = useRef(0);
  // The page request in flight, so a delete can wait for it to land.
  const pageRequestRef = useRef<Promise<void> | null>(null);
  // The rows on screen, for the realtime handler: a row it already has is
  // neither added nor counted again.
  const rowsRef = useRef<Notification[]>([]);
  useEffect(() => {
    rowsRef.current = notifications;
  }, [notifications]);

  // A different member starts from nothing (react.dev: adjusting state when a prop changes).
  const [loadedUserId, setLoadedUserId] = useState(userId);
  if (userId !== loadedUserId) {
    setLoadedUserId(userId);
    setNotifications([]);
    setUnreadCount(0);
    setLoading(Boolean(userId));
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setHasMore(false);
  }

  useEffect(() => {
    // Bump first, even with no member, so anything already in flight is dropped.
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    if (!userId) return;

    let active = true;
    // Rows delivered while the first page loads; null once it has landed.
    let early: Notification[] | null = [];

    const channel = supabase
      .channel(uniqueChannelTopic(`notifications-page:${userId}`))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (!active) return;
          const row = payload.new as Notification;
          // getNotifications and the count exclude chat notifications, so one
          // accepted here would vanish on reload (recon 19).
          if (row.type === 'message') return;
          if (early) {
            if (!early.some((n) => n.id === row.id)) early.push(row);
            return;
          }
          if (rowsRef.current.some((n) => n.id === row.id)) return;
          setNotifications((rows) => (rows.some((n) => n.id === row.id) ? rows : [row, ...rows]));
          if (!row.read) setUnreadCount((count) => count + 1);
        }
      )
      .subscribe();

    void Promise.all([
      getNotifications(supabase, userId, NOTIFICATIONS_PAGE_SIZE, 0),
      getUnreadNotificationCount(supabase, userId),
    ]).then(([list, count]) => {
      const buffered = early ?? [];
      early = null;
      if (!active || generation !== generationRef.current) return;
      if (list.error || count.error) {
        setNotifications([]);
        setUnreadCount(0);
        setHasMore(false);
        setError(LOAD_ERROR);
      } else {
        setNotifications(mergeRows(list.data ?? [], buffered));
        setUnreadCount(count.count);
        setHasMore(Boolean(list.hasMore));
        setError(null);
      }
      setLoadMoreError(null);
      setLoading(false);
    });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, reloadKey]);

  const reload = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    setLoading(true);
    setError(null);
    setLoadingMore(false);
    setLoadMoreError(null);
    setHasMore(false);
    setReloadKey((key) => key + 1);
  }, []);

  const offset = notifications.length;
  const requestNextPage = useCallback(() => {
    if (!userId || loadingMoreRef.current || deletesInFlightRef.current > 0) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    const request: Promise<void> = getNotifications(supabase, userId, NOTIFICATIONS_PAGE_SIZE, offset).then(
      (result) => {
        // Only this request's own slot: a page from before a reload can land
        // after a newer one started.
        if (pageRequestRef.current === request) pageRequestRef.current = null;
        if (generation !== generationRef.current) return;
        loadingMoreRef.current = false;
        setLoadingMore(false);
        if (result.error) {
          setLoadMoreError(LOAD_MORE_ERROR);
          return;
        }
        setNotifications((rows) => appendPage(rows, result.data ?? []));
        setHasMore(Boolean(result.hasMore));
      }
    );
    pageRequestRef.current = request;
  }, [userId, offset]);

  const loadMore = useCallback(() => {
    if (loadMoreError || loading || !hasMore) return;
    requestNextPage();
  }, [loadMoreError, loading, hasMore, requestNextPage]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    requestNextPage();
  }, [requestNextPage]);

  const markRead = useCallback(async (notification: Notification): Promise<boolean> => {
    if (notification.read) return true;
    const generation = generationRef.current;
    const result = await markNotificationRead(supabase, notification.id);
    if (result.error) return false;
    announceNotificationsChanged();
    if (generation !== generationRef.current) return true;
    setNotifications((rows) => rows.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    setUnreadCount((count) => Math.max(0, count - 1));
    return true;
  }, []);

  const markAllRead = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const generation = generationRef.current;
    const result = await markAllNotificationsRead(supabase, userId);
    if (result.error) return false;
    announceNotificationsChanged();
    if (generation !== generationRef.current) return true;
    setNotifications((rows) => rows.map((n) => (n.read ? n : { ...n, read: true })));
    setUnreadCount(0);
    return true;
  }, [userId]);

  const remove = useCallback(async (notification: Notification): Promise<boolean> => {
    deletesInFlightRef.current += 1;
    setDeleting(true);
    try {
      const generation = generationRef.current;
      // A page requested before this delete counted the row at its old offset.
      if (pageRequestRef.current) {
        await pageRequestRef.current;
        // The list was reloaded or the member changed while this waited.
        if (generation !== generationRef.current) return false;
      }
      const result = await deleteNotification(supabase, notification.id);
      if (result.error) return false;
      announceNotificationsChanged();
      if (generation !== generationRef.current) return true;
      setNotifications((rows) => rows.filter((n) => n.id !== notification.id));
      if (!notification.read) setUnreadCount((count) => Math.max(0, count - 1));
      return true;
    } finally {
      deletesInFlightRef.current -= 1;
      setDeleting(deletesInFlightRef.current > 0);
    }
  }, []);

  const hasUser = Boolean(userId);
  return {
    notifications,
    unreadCount,
    loading: hasUser && loading,
    error,
    loadingMore,
    loadMoreError,
    hasMore: hasUser && !loading && !deleting && hasMore && loadMoreError === null,
    loadMore,
    retryLoadMore,
    reload,
    markRead,
    markAllRead,
    remove,
  };
}
