import { describe, expect, it } from 'vitest';
import type { Notification } from '../types/notification';
import { groupNotifications } from './notifications';

function notification(id: string, sentAt: Date, type: Notification['type'] = 'post_response'): Notification {
  return {
    id,
    user_id: 'u1',
    type,
    title: id,
    body: '',
    data: {},
    read: false,
    read_at: null,
    sent_at: sentAt.toISOString(),
  };
}

const TODAY_NOON = new Date(2026, 8, 24, 12);
const TODAY_MORNING = new Date(2026, 8, 24, 8);
const YESTERDAY = new Date(2026, 8, 23, 18);

describe('groupNotifications', () => {
  it('returns no groups for no notifications', () => {
    expect(groupNotifications([])).toEqual([]);
  });

  it('puts every emergency alert in one group, first', () => {
    const groups = groupNotifications([
      notification('a', TODAY_NOON),
      notification('e1', TODAY_MORNING, 'emergency_alert'),
      notification('e2', YESTERDAY, 'emergency_alert'),
    ]);

    expect(groups.map((g) => g.kind)).toEqual(['emergency', 'day']);
    expect(groups[0].key).toBe('emergency');
    expect(groups[0].notifications.map((n) => n.id)).toEqual(['e1', 'e2']);
    expect(groups[0].timestamp).toBe(TODAY_MORNING.toISOString());
  });

  it('groups the rest by local day, keeping their order', () => {
    const groups = groupNotifications([
      notification('a', TODAY_NOON),
      notification('b', TODAY_MORNING),
      notification('c', YESTERDAY),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ kind: 'day', key: TODAY_NOON.toDateString(), timestamp: TODAY_NOON.toISOString() });
    expect(groups[0].notifications.map((n) => n.id)).toEqual(['a', 'b']);
    expect(groups[1]).toMatchObject({ kind: 'day', key: YESTERDAY.toDateString(), timestamp: YESTERDAY.toISOString() });
    expect(groups[1].notifications.map((n) => n.id)).toEqual(['c']);
  });

  it('never puts an emergency alert in a day group', () => {
    const groups = groupNotifications([
      notification('a', TODAY_NOON),
      notification('e', TODAY_MORNING, 'emergency_alert'),
      notification('b', TODAY_MORNING),
    ]);

    const dayIds = groups.filter((g) => g.kind === 'day').flatMap((g) => g.notifications.map((n) => n.id));
    expect(dayIds).toEqual(['a', 'b']);
  });
});
