import type { Notification } from '../types/notification';

export type NotificationRouteTarget =
  | { kind: 'post'; postId: string }
  | { kind: 'message'; conversationId: string; senderId?: string; senderName?: string }
  | { kind: 'event'; eventId: string }
  | { kind: 'notifications' };

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function targetFromPath(path: string): NotificationRouteTarget | null {
  const normalized = path.trim();

  const postMatch = normalized.match(/^\/posts\/([^/?#]+)/);
  if (postMatch) {
    return { kind: 'post', postId: postMatch[1] };
  }

  const messageMatch = normalized.match(/^\/messages\/([^/?#]+)/);
  if (messageMatch) {
    return { kind: 'message', conversationId: messageMatch[1] };
  }

  const eventMatch = normalized.match(/^\/events\/([^/?#]+)/);
  if (eventMatch) {
    return { kind: 'event', eventId: eventMatch[1] };
  }

  if (normalized.startsWith('/notifications')) {
    return { kind: 'notifications' };
  }

  return null;
}

export function resolveNotificationRouteTarget(notification: Notification): NotificationRouteTarget {
  const data = (notification.data ?? {}) as Record<string, unknown>;

  const postId = asNonEmptyString(data.post_id);
  if (postId) {
    return { kind: 'post', postId };
  }

  const eventId = asNonEmptyString(data.event_id);
  if (eventId) {
    return { kind: 'event', eventId };
  }

  const conversationId = asNonEmptyString(data.conversation_id);
  if (conversationId) {
    return {
      kind: 'message',
      conversationId,
      senderId: asNonEmptyString(data.sender_id) ?? undefined,
      senderName: asNonEmptyString(data.sender_name) ?? undefined,
    };
  }

  const path = asNonEmptyString(data.url) ?? asNonEmptyString(data.path) ?? asNonEmptyString(data.deep_link);
  if (path) {
    const fromPath = targetFromPath(path);
    if (fromPath) {
      return fromPath;
    }
  }

  return { kind: 'notifications' };
}