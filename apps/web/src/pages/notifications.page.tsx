import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Loader, VisuallyHidden } from '@mantine/core';
import { IconBell, IconSettings } from '@tabler/icons-react';
import type { Notification } from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { useNotificationsPage } from '../hooks/useNotificationsPage';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useNow } from '../hooks/useNow';
import { isFocusStranded } from '../lib/focus';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { notify } from '../components/ui/notify';
import { NotificationList } from '../components/notifications/NotificationList';
import { getNotificationHref } from '../components/notifications/notificationHref';
import styles from './notifications.module.css';

const DELETE_FAILED = "Couldn't delete that notification. Please try again.";
const MARK_ALL_FAILED = "Couldn't mark your notifications as read. Please try again.";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (!user.metro_area_id) {
      router.replace('/onboarding/zip');
    }
  }, [authLoading, user, router]);

  if (!user) return null;
  return <NotificationsView userId={user.id} />;
}

function NotificationsView({ userId }: { userId: string }) {
  const router = useRouter();
  const page = useNotificationsPage(userId);
  const now = useNow();
  const preferencesRef = useRef<HTMLAnchorElement>(null);
  const [markingAll, setMarkingAll] = useState(false);
  // Mark all as read removes itself on success; focus then goes to Preferences.
  const focusPreferencesRef = useRef(false);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: page.hasMore,
    loading: page.loading || page.loadingMore,
    onLoadMore: page.loadMore,
  });

  const showMarkAll = !page.loading && !page.error && page.unreadCount > 0;

  // Runs once markingAll has cleared, by which time a successful mark-all has
  // brought the count to zero and removed the button.
  useEffect(() => {
    if (!focusPreferencesRef.current || markingAll || showMarkAll) return;
    focusPreferencesRef.current = false;
    if (isFocusStranded()) preferencesRef.current?.focus();
  }, [markingAll, showMarkAll]);

  const getFallbackFocus = useCallback(() => preferencesRef.current, []);

  const handleOpen = (notification: Notification) => {
    // Navigate at once; a failed mark-read leaves the row unread, which is true.
    void page.markRead(notification);
    void router.push(getNotificationHref(notification));
  };

  const handleDelete = async (notification: Notification) => {
    const ok = await page.remove(notification);
    if (!ok) notify.error(DELETE_FAILED);
    return ok;
  };

  const handleMarkAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    const ok = await page.markAllRead();
    focusPreferencesRef.current = ok;
    setMarkingAll(false);
    if (!ok) notify.error(MARK_ALL_FAILED);
  };

  return (
    <>
      <Head>
        <title>Notifications - Nepally</title>
      </Head>
      <div className={styles.page}>
        <PageHeader
          title="Notifications"
          description={page.unreadCount > 0 ? `${page.unreadCount} unread` : undefined}
          actions={
            <>
              {showMarkAll ? (
                <Button
                  variant="default"
                  aria-disabled={markingAll || undefined}
                  data-disabled={markingAll || undefined}
                  leftSection={markingAll ? <Loader size={14} color="currentColor" aria-hidden="true" /> : undefined}
                  onClick={handleMarkAll}
                >
                  Mark all as read
                </Button>
              ) : null}
              <Button
                component={Link}
                href="/profile/notifications"
                variant="default"
                ref={preferencesRef}
                leftSection={<IconSettings size={16} aria-hidden="true" />}
              >
                Preferences
              </Button>
            </>
          }
        />

        {page.loading ? (
          <LoadingState label="Loading notifications…" />
        ) : page.error ? (
          <ErrorState message={page.error} onRetry={page.reload} />
        ) : page.notifications.length === 0 ? (
          <EmptyState
            icon={<IconBell size={40} />}
            title="You're all caught up"
            description="Comments, likes and emergency alerts will appear here."
          />
        ) : (
          <>
            <NotificationList
              notifications={page.notifications}
              now={now}
              onOpen={handleOpen}
              onDelete={handleDelete}
              getFallbackFocus={getFallbackFocus}
            />
            {page.hasMore && <div ref={sentinelRef} className={styles.loadSentinel} aria-hidden="true" />}
            {page.loadingMore && (
              <div className={styles.loadingMore} role="status">
                <Loader size="sm" aria-hidden="true" />
                <VisuallyHidden>Loading more notifications…</VisuallyHidden>
              </div>
            )}
            {page.loadMoreError && (
              <ErrorState message={page.loadMoreError} onRetry={page.retryLoadMore} />
            )}
          </>
        )}
      </div>
    </>
  );
}
