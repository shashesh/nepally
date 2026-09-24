import React, { useEffect, useId, useMemo, useRef } from 'react';
import { formatDayLabel, groupNotifications } from '@nepally/shared';
import type { Notification } from '@nepally/shared';
import { isFocusStranded } from '../../lib/focus';
import { NotificationItem } from './NotificationItem';
import styles from './NotificationList.module.css';

export interface NotificationListProps {
  notifications: Notification[];
  now: Date;
  onOpen: (notification: Notification) => void;
  /** Resolves true when the row was deleted, so focus can move. */
  onDelete: (notification: Notification) => Promise<boolean>;
  /** Where focus goes when the last row is deleted. */
  getFallbackFocus: () => HTMLElement | null;
}

/**
 * The /notifications list: emergency alerts first, then one section per day.
 *
 * Deleting a row removes the button that had focus. Once the list has
 * re-rendered without it, and only if focus was lost, focus moves to the row
 * that took its place, then the row before it, then the fallback.
 */
export function NotificationList({ notifications, now, onOpen, onDelete, getFallbackFocus }: NotificationListProps) {
  const groups = useMemo(() => groupNotifications(notifications), [notifications]);
  const rootRef = useRef<HTMLDivElement>(null);
  // Day keys are toDateString()s, which hold spaces; aria-labelledby would
  // read those as several ids, so headings are named by position instead.
  const idPrefix = useId();
  // The rendered index of a row deleted since the last commit.
  const pendingFocusRef = useRef<number | null>(null);

  useEffect(() => {
    const index = pendingFocusRef.current;
    if (index === null) return;
    pendingFocusRef.current = null;
    if (!isFocusStranded()) return;
    const rows = rootRef.current?.querySelectorAll('li') ?? [];
    const row = rows[Math.min(index, rows.length - 1)];
    const target = row?.querySelector<HTMLElement>('button') ?? getFallbackFocus();
    target?.focus();
  }, [notifications, getFallbackFocus]);

  const handleDelete = async (notification: Notification) => {
    const index = groups.flatMap((group) => group.notifications).findIndex((n) => n.id === notification.id);
    if (await onDelete(notification)) pendingFocusRef.current = index;
  };

  return (
    <div ref={rootRef} className={styles.root}>
      {groups.map((group, index) => (
        <section key={group.key} className={styles.group} aria-labelledby={`${idPrefix}-${index}`}>
          <h2 id={`${idPrefix}-${index}`} className={styles.label}>
            {group.kind === 'emergency' ? 'Emergency alerts' : formatDayLabel(new Date(group.timestamp), now)}
          </h2>
          <ul className={styles.list}>
            {group.notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationItem notification={notification} onOpen={onOpen} onDelete={handleDelete} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
