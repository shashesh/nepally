/**
 * A same-page signal from /notifications to the top bar's bell. That page
 * turns the bell's polling and realtime off while it is open, so without this
 * the bell keeps its old count after a mark-read, mark-all or delete there.
 * Web-only: it rides on `window`, as lib/unreadMessages.ts does for chat.
 */
export const NOTIFICATIONS_CHANGED_EVENT = 'nepally:notifications-changed';

export function announceNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}
