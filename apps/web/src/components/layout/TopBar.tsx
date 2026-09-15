import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { ActionIcon, Indicator } from '@mantine/core';
import { IconMessageCircle } from '@tabler/icons-react';
import type { Notification, User } from '@nepally/shared';
import type { NotificationsFeed } from '../../hooks/useNotificationsFeed';
import LocationSwitcher from '../LocationSwitcher';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';
import styles from './TopBar.module.css';

export interface TopBarProps {
  user: User;
  unreadMessages: number;
  notifications: NotificationsFeed;
  onOpenNotification: (notification: Notification) => void;
  onSignOut: () => void;
  /** Search entry point (SearchCombobox on wide screens, a search link on phones). */
  search?: ReactNode;
}

export function TopBar({ user, unreadMessages, notifications, onOpenNotification, onSignOut, search }: TopBarProps) {
  const messagesLabel = unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages';

  return (
    <div className={styles.root}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandDot} aria-hidden="true" />
        Nepally
      </Link>

      <div className={styles.location}>
        <LocationSwitcher />
      </div>

      <div className={styles.search}>{search}</div>

      <div className={styles.actions}>
        <NotificationBell
          unreadCount={notifications.unreadCount}
          items={notifications.items}
          onOpen={onOpenNotification}
          onMarkAllRead={() => {
            void notifications.markAllRead();
          }}
          onDelete={(notification) => {
            void notifications.remove(notification);
          }}
        />
        <Indicator label={unreadMessages > 99 ? '99+' : unreadMessages} size={18} disabled={unreadMessages === 0} color="red" offset={4}>
          <ActionIcon component={Link} href="/messages" variant="subtle" color="gray" size="lg" aria-label={messagesLabel}>
            <IconMessageCircle size={22} aria-hidden="true" />
          </ActionIcon>
        </Indicator>
        <div className={styles.account}>
          <AccountMenu user={user} onSignOut={onSignOut} />
        </div>
      </div>
    </div>
  );
}
