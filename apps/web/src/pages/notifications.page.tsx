import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Badge, Button, Center, CloseButton, Stack, Text } from '@mantine/core';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  resolveNotificationRouteTarget,
} from '@nusa/shared';
import type { Notification } from '@nusa/shared';
import styles from '../styles/Notifications.module.css';

const PAGE_SIZE = 20;

function notifIcon(type: Notification['type']): string {
  switch (type) {
    case 'message': return '💬';
    case 'post_response': return '💬';
    case 'emergency_alert': return '🛡️';
    default: return '📩';
  }
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Group notifications: emergency first, then by day */
function groupNotifications(notifications: Notification[]): Array<{ label: string; items: Notification[] }> {
  const emergency = notifications.filter((n) => n.type === 'emergency_alert');
  const rest = notifications.filter((n) => n.type !== 'emergency_alert');

  const groups: Array<{ label: string; items: Notification[] }> = [];

  if (emergency.length > 0) {
    groups.push({ label: '🛡️ Emergency Alerts', items: emergency });
  }

  const byDay = new Map<string, Notification[]>();
  for (const n of rest) {
    const label = dayLabel(n.sent_at);
    if (!byDay.has(label)) byDay.set(label, []);
    byDay.get(label)!.push(n);
  }
  for (const [label, items] of Array.from(byDay.entries())) {
    groups.push({ label, items });
  }

  return groups;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (!user.metro_area_id) {
      router.replace('/onboarding/zip');
    }
  }, [authLoading, user, router]);

  const loadInitial = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [listResult, countResult] = await Promise.all([
        getNotifications(supabase, user.id, PAGE_SIZE, 0),
        getUnreadNotificationCount(supabase, user.id),
      ]);
      if (listResult.error) throw listResult.error;
      setNotifications(listResult.data ?? []);
      setUnreadCount(countResult.count);
      setHasMore((listResult.data?.length ?? 0) === PAGE_SIZE);
      setPage(0);
    } catch {
      setLoadError('Could not load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadInitial();
  }, [user, loadInitial]);

  // Resilience fallback: refresh list and badge on tab focus + interval so
  // notifications stay up to date when realtime events are delayed/missed.
  useEffect(() => {
    if (!user) return;

    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadInitial();
      }
    };

    const intervalId = window.setInterval(() => {
      loadInitial();
    }, 30000);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, loadInitial]);

  // Realtime: new notifications while on this page
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-page:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleLoadMore = async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const result = await getNotifications(supabase, user.id, PAGE_SIZE, nextPage * PAGE_SIZE);
    if (result.data) {
      setNotifications((prev) => [...prev, ...result.data!]);
      setHasMore(result.data.length === PAGE_SIZE);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.read) {
      await markNotificationRead(supabase, notif.id);
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    const target = resolveNotificationRouteTarget(notif);

    if (target.kind === 'post') {
      router.push(`/posts/${target.postId}`);
      return;
    }

    if (target.kind === 'event') {
      router.push(`/events/${target.eventId}`);
      return;
    }

    if (target.kind === 'message') {
      router.push(`/messages/${target.conversationId}`);
      return;
    }

    router.push('/notifications');
  };

  const handleDismiss = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    const result = await deleteNotification(supabase, notifId);
    if (result.error) {
      console.error('Failed to delete notification:', result.error);
      return;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(supabase, user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (!user) return null;

  const groups = groupNotifications(notifications);

  return (
    <>
      <Head>
        <title>Notifications — NUSA</title>
      </Head>

      <div className={styles.shell}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            🔔 Notifications
            {unreadCount > 0 && <Badge circle color="red" size="lg">{unreadCount}</Badge>}
          </h1>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <Button variant="outline" size="compact-sm" onClick={handleMarkAllRead}>
                Mark all as read
              </Button>
            )}
            <Link href="/profile/notifications" className={styles.prefsLink} aria-label="Notification preferences">
              ⚙️ Preferences
            </Link>
          </div>
        </div>

        {loading && (
          <Center p="xl">
            <Text c="dimmed">Loading notifications…</Text>
          </Center>
        )}

        {!loading && loadError && (
          <Center p="xl">
            <Stack align="center">
              <Text c="red">{loadError}</Text>
              <Button onClick={loadInitial}>Try again</Button>
            </Stack>
          </Center>
        )}

        {!loading && !loadError && notifications.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔔</span>
            <h2>All caught up!</h2>
            <p>Comments, likes, and emergency alerts will appear here.</p>
            <Link href="/profile/notifications" className={styles.prefsLink}>Manage Preferences</Link>
          </div>
        )}

        {!loading && !loadError && groups.map(({ label, items }) => (
          <section key={label} className={styles.group}>
            <h2 className={styles.groupLabel}>{label}</h2>
            <ul className={styles.notifList}>
              {items.map((notif) => (
                <li
                  key={notif.id}
                  className={[
                    styles.notifItem,
                    !notif.read ? styles.notifItemUnread : '',
                    notif.type === 'emergency_alert' ? styles.notifItemEmergency : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleNotifClick(notif)}
                >
                  <span className={styles.notifIcon}>{notifIcon(notif.type)}</span>
                  <div className={styles.notifContent}>
                    <span className={styles.notifTitle}>{notif.title}</span>
                    <span className={styles.notifBody}>{notif.body}</span>
                    <span className={styles.notifTime}>{timeAgo(notif.sent_at)}</span>
                  </div>
                  <CloseButton
                    className={styles.dismissBtn}
                    onClick={(e: React.MouseEvent) => handleDismiss(e, notif.id)}
                    aria-label="Dismiss notification"
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {hasMore && !loading && (
          <Button
            variant="default"
            fullWidth
            onClick={handleLoadMore}
            loading={loadingMore}
          >
            Load more notifications
          </Button>
        )}
      </div>
    </>
  );
}
