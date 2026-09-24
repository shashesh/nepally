import type { Notification } from '../types/notification';

export interface NotificationGroup {
  /** 'emergency', or the day's toDateString(); stable as a React key. */
  key: string;
  kind: 'emergency' | 'day';
  /** sent_at of the group's first notification, for formatDayLabel. */
  timestamp: string;
  notifications: Notification[];
}

/**
 * Emergency alerts first as one group, then the rest by local day. Order
 * within each group is the input's (newest first from getNotifications).
 */
export function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  const emergency: Notification[] = [];
  const days: NotificationGroup[] = [];

  for (const notification of notifications) {
    if (notification.type === 'emergency_alert') {
      emergency.push(notification);
      continue;
    }
    const key = new Date(notification.sent_at).toDateString();
    const current = days[days.length - 1];
    if (current && current.key === key) {
      current.notifications.push(notification);
    } else {
      days.push({ key, kind: 'day', timestamp: notification.sent_at, notifications: [notification] });
    }
  }

  if (emergency.length === 0) return days;
  return [{ key: 'emergency', kind: 'emergency', timestamp: emergency[0].sent_at, notifications: emergency }, ...days];
}
