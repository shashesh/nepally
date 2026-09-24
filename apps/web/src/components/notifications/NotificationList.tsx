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
  // Day keys are toDateString()s, which hold spaces; aria-labelledby would
  // read those as several ids, so headings are named by position instead.
  const idPrefix = useId();
  // Each row's li, by notification id, so focus can find a row by identity.
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  // A delete in flight, with the rows either side of it in rendered order.
  // Ids, not an index: this list takes realtime inserts, so an index taken at
  // the click can be off by the time the row leaves.
  const pendingFocusRef = useRef<{ deletedId: string; nextId?: string; previousId?: string } | null>(null);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending || notifications.some((n) => n.id === pending.deletedId)) return;
    pendingFocusRef.current = null;
    if (!isFocusStranded()) return;
    const row =
      (pending.nextId && rowRefs.current.get(pending.nextId)) ||
      (pending.previousId && rowRefs.current.get(pending.previousId)) ||
      null;
    const target = row?.querySelector<HTMLElement>('button') ?? getFallbackFocus();
    target?.focus();
  }, [notifications, getFallbackFocus]);

  const handleDelete = async (notification: Notification) => {
    const ordered = groups.flatMap((group) => group.notifications);
    const index = ordered.findIndex((n) => n.id === notification.id);
    pendingFocusRef.current = {
      deletedId: notification.id,
      nextId: ordered[index + 1]?.id,
      previousId: ordered[index - 1]?.id,
    };
    const deleted = await onDelete(notification);
    if (!deleted && pendingFocusRef.current?.deletedId === notification.id) pendingFocusRef.current = null;
    return deleted;
  };

  return (
    <div className={styles.root}>
      {groups.map((group, index) => (
        <section key={group.key} className={styles.group} aria-labelledby={`${idPrefix}-${index}`}>
          <h2 id={`${idPrefix}-${index}`} className={styles.label}>
            {group.kind === 'emergency' ? 'Emergency alerts' : formatDayLabel(new Date(group.timestamp), now)}
          </h2>
          <ul className={styles.list}>
            {group.notifications.map((notification) => (
              <li
                key={notification.id}
                ref={(node) => {
                  if (node) rowRefs.current.set(notification.id, node);
                  else rowRefs.current.delete(notification.id);
                }}
              >
                <NotificationItem notification={notification} onOpen={onOpen} onDelete={handleDelete} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
