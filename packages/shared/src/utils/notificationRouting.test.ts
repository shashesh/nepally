import { describe, expect, it } from 'vitest';
import type { Notification } from '../types/notification';
import { resolveNotificationRouteTarget } from './notificationRouting';

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: 'notif-1',
    user_id: 'user-1',
    type: 'system',
    title: 'System notification',
    body: 'Body',
    data: {},
    read: false,
    read_at: null,
    sent_at: new Date('2026-03-23T00:00:00.000Z').toISOString(),
    ...overrides,
  };
}

describe('resolveNotificationRouteTarget', () => {
  it('routes post notifications by post_id', () => {
    const notif = makeNotification({
      type: 'post_response',
      data: { post_id: 'post-123' },
    });

    expect(resolveNotificationRouteTarget(notif)).toEqual({
      kind: 'post',
      postId: 'post-123',
    });
  });

  it('routes message notifications by conversation_id and sender metadata', () => {
    const notif = makeNotification({
      type: 'message',
      data: {
        conversation_id: 'conv-55',
        sender_id: 'user-2',
        sender_name: 'Sender Name',
      },
    });

    expect(resolveNotificationRouteTarget(notif)).toEqual({
      kind: 'message',
      conversationId: 'conv-55',
      senderId: 'user-2',
      senderName: 'Sender Name',
    });
  });

  it('routes event notifications by event_id', () => {
    const notif = makeNotification({
      type: 'system',
      data: { event_id: 'event-99' },
    });

    expect(resolveNotificationRouteTarget(notif)).toEqual({
      kind: 'event',
      eventId: 'event-99',
    });
  });

  it('routes system notifications from supported url path payloads', () => {
    const notif = makeNotification({
      data: { url: '/messages/conv-200' },
    });

    expect(resolveNotificationRouteTarget(notif)).toEqual({
      kind: 'message',
      conversationId: 'conv-200',
    });
  });

  it('falls back safely for malformed payloads', () => {
    const notif = makeNotification({
      type: 'message',
      data: { conversation_id: 1234 },
    });

    expect(resolveNotificationRouteTarget(notif)).toEqual({
      kind: 'notifications',
    });
  });

  it('trims leading/trailing whitespace from IDs before routing', () => {
    const notif = makeNotification({
      type: 'post_response',
      data: { post_id: '  post-456  ' },
    });

    expect(resolveNotificationRouteTarget(notif)).toEqual({
      kind: 'post',
      postId: 'post-456',
    });
  });

  it('falls back for IDs that are whitespace-only', () => {
    const notif = makeNotification({
      type: 'post_response',
      data: { post_id: '   ' },
    });

    expect(resolveNotificationRouteTarget(notif)).toEqual({
      kind: 'notifications',
    });
  });
});