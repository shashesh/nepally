import React, { useState } from 'react';
import Link from 'next/link';
import { ActionIcon, Anchor, Button, Indicator, Popover, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBell } from '@tabler/icons-react';
import type { Notification } from '@nepally/shared';
import { NotificationItem } from '../notifications/NotificationItem';
import styles from './NotificationBell.module.css';

export interface NotificationBellProps {
  unreadCount: number;
  items: Notification[];
  onOpen: (notification: Notification) => void;
  onMarkAllRead: () => void;
  onDelete: (notification: Notification) => void;
}

/** Phones (below 48em) navigate to /notifications instead of opening a popover. */
const PHONE_QUERY = '(max-width: 47.99em)';

export function NotificationBell({ unreadCount, items, onOpen, onMarkAllRead, onDelete }: NotificationBellProps) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [opened, setOpened] = useState(false);
  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';
  const badge = unreadCount > 9 ? '9+' : unreadCount;

  if (isPhone) {
    return (
      <Indicator label={badge} size={18} disabled={unreadCount === 0} color="red" offset={4}>
        <ActionIcon component={Link} href="/notifications" variant="subtle" color="gray" size="lg" aria-label={label}>
          <IconBell size={22} aria-hidden="true" />
        </ActionIcon>
      </Indicator>
    );
  }

  return (
    <Indicator label={badge} size={18} disabled={unreadCount === 0} color="red" offset={4}>
      <Popover opened={opened} onChange={setOpened} position="bottom-end" width={360} withinPortal>
        <Popover.Target>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={opened}
            onClick={() => setOpened((current) => !current)}
          >
            <IconBell size={22} aria-hidden="true" />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown p={0} aria-label="Notifications">
          <div className={styles.header}>
            <Text fw={600}>Notifications</Text>
            {unreadCount > 0 ? (
              <Button variant="subtle" size="compact-sm" onClick={onMarkAllRead}>
                Mark all as read
              </Button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <Text className={styles.empty}>No notifications yet</Text>
          ) : (
            <ul className={styles.list}>
              {items.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onOpen={(selected) => {
                      setOpened(false);
                      onOpen(selected);
                    }}
                    onDelete={onDelete}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className={styles.footer}>
            <Anchor component={Link} href="/notifications" onClick={() => setOpened(false)}>
              See all notifications →
            </Anchor>
          </div>
        </Popover.Dropdown>
      </Popover>
    </Indicator>
  );
}
