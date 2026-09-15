import { resolveNotificationRouteTarget } from '@nepally/shared';
import type { Notification } from '@nepally/shared';

/** Where tapping a notification should take the user. */
export function getNotificationHref(notification: Notification): string {
  const target = resolveNotificationRouteTarget(notification);
  if (target.kind === 'post') return `/posts/${target.postId}`;
  if (target.kind === 'event') return `/events/${target.eventId}`;
  if (target.kind === 'message') return `/messages/${target.conversationId}`;
  return '/notifications';
}
