import React from 'react';
import { CloseButton, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconAlertTriangle, IconMail, IconMessageCircle, IconMessageDots } from '@tabler/icons-react';
import { formatRelativeTime } from '@nepally/shared';
import type { Notification } from '@nepally/shared';
import styles from './NotificationItem.module.css';

function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'message':
      return <IconMessageCircle size={18} />;
    case 'post_response':
      return <IconMessageDots size={18} />;
    case 'emergency_alert':
      return <IconAlertTriangle size={18} />;
    default:
      return <IconMail size={18} />;
  }
}

export interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  onDelete: (notification: Notification) => void;
}

export function NotificationItem({ notification, onOpen, onDelete }: NotificationItemProps) {
  const classNames = [
    styles.root,
    notification.read ? '' : styles.unread,
    notification.type === 'emergency_alert' ? styles.emergency : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <UnstyledButton className={styles.open} onClick={() => onOpen(notification)}>
        <span className={styles.icon} aria-hidden="true">
          <NotificationIcon type={notification.type} />
        </span>
        <span className={styles.content}>
          <span className={styles.title}>{notification.title}</span>
          <span className={styles.body}>{notification.body}</span>
          <span className={styles.time}>{formatRelativeTime(new Date(notification.sent_at))}</span>
        </span>
        {notification.read ? null : (
          <span className={styles.unreadDot}>
            <VisuallyHidden>Unread</VisuallyHidden>
          </span>
        )}
      </UnstyledButton>
      <CloseButton
        size="sm"
        className={styles.delete}
        aria-label="Delete notification"
        onClick={() => onDelete(notification)}
      />
    </div>
  );
}
