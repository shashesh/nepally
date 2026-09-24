/**
 * A same-page signal from a thread to the top bar's unread badge. Realtime
 * already tells the badge when `conversation_participants` changes, but it
 * can lag or drop an event, and the thread knows the moment it has marked
 * itself read. Web-only: it rides on `window`.
 */
export const MESSAGES_READ_EVENT = 'nepally:messages-read';

export function announceMessagesRead(): void {
  window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
}
