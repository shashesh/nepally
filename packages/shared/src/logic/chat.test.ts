import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../types/chat';
import { buildThreadDays } from './chat';

function message(id: string, senderId: string, timestamp: Date): ChatMessage {
  return {
    id,
    conversation_id: 'c1',
    sender_id: senderId,
    text: id,
    type: 'text',
    read: false,
    read_at: null,
    timestamp: timestamp.toISOString(),
  };
}

const VIEWER = 'viewer';
const PARTNER = 'partner';

describe('buildThreadDays', () => {
  it('returns no days for no messages', () => {
    expect(buildThreadDays([], VIEWER)).toEqual([]);
  });

  it('groups messages by local calendar day, in order', () => {
    const days = buildThreadDays(
      [
        message('m1', PARTNER, new Date(2026, 8, 22, 10)),
        message('m2', VIEWER, new Date(2026, 8, 22, 11)),
        message('m3', PARTNER, new Date(2026, 8, 23, 9)),
      ],
      VIEWER
    );

    expect(days.map((day) => day.messages.map((item) => item.message.id))).toEqual([['m1', 'm2'], ['m3']]);
    expect(days[0].key).toBe(new Date(2026, 8, 22, 10).toDateString());
    expect(days[0].timestamp).toBe(new Date(2026, 8, 22, 10).toISOString());
    expect(days[1].key).toBe(new Date(2026, 8, 23, 9).toDateString());
  });

  it("marks the viewer's own messages", () => {
    const [day] = buildThreadDays(
      [message('m1', PARTNER, new Date(2026, 8, 23, 9)), message('m2', VIEWER, new Date(2026, 8, 23, 10))],
      VIEWER
    );

    expect(day.messages.map((item) => item.isOwn)).toEqual([false, true]);
  });

  it('ends a run where the sender changes or the day ends', () => {
    const [day] = buildThreadDays(
      [
        message('a1', PARTNER, new Date(2026, 8, 23, 9)),
        message('a2', PARTNER, new Date(2026, 8, 23, 9, 1)),
        message('b1', VIEWER, new Date(2026, 8, 23, 9, 2)),
        message('a3', PARTNER, new Date(2026, 8, 23, 9, 3)),
      ],
      VIEWER
    );

    expect(day.messages.map((item) => item.endsRun)).toEqual([false, true, true, true]);
  });

  it('ends a run at midnight even when the sender carries on', () => {
    const days = buildThreadDays(
      [message('a1', PARTNER, new Date(2026, 8, 22, 23, 59)), message('a2', PARTNER, new Date(2026, 8, 23, 0, 1))],
      VIEWER
    );

    expect(days[0].messages[0].endsRun).toBe(true);
    expect(days[1].messages[0].endsRun).toBe(true);
  });
});
