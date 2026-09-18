import { describe, expect, it } from 'vitest';
import type { Notification } from '@nepally/shared';
import { getNotificationHref } from './notificationHref';

const base = {
  id: 'n',
  user_id: 'u',
  type: 'system',
  title: 't',
  body: 'b',
  read: false,
  sent_at: '2026-09-14T00:00:00Z',
  created_at: '2026-09-14T00:00:00Z',
  read_at: null,
} as const;

const make = (overrides: Partial<Notification>) => ({ ...base, data: {}, ...overrides }) as Notification;

describe('getNotificationHref', () => {
  it('routes message notifications to the thread', () => {
    expect(getNotificationHref(make({ type: 'message', data: { conversation_id: 'conv-1' } }))).toBe('/messages/conv-1');
  });

  it('routes event notifications to the event', () => {
    expect(getNotificationHref(make({ data: { event_id: 'event-1' } }))).toBe('/events/event-1');
  });

  it('falls back to the notifications page for malformed payloads', () => {
    expect(getNotificationHref(make({ type: 'message', data: { conversation_id: 123 } as never }))).toBe('/notifications');
  });
});
