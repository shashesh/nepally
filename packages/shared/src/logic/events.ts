/**
 * Pure event logic shared by web and mobile. No IO.
 */
import type { Event, RsvpStatus } from '../types/events';

type EventDates = Pick<Event, 'start_date'> & { end_date?: string | null };

/** Past once its end has gone by, or its start when it has no end. */
export function isEventPast(event: EventDates, now: Date): boolean {
  return new Date(event.end_date ?? event.start_date) < now;
}

export type EventResponseCounts = Pick<Event, 'rsvp_count' | 'interested_count'>;

const COUNT_FIELD: Record<RsvpStatus, keyof EventResponseCounts> = {
  going: 'rsvp_count',
  interested: 'interested_count',
};

/**
 * The counts after a member's response moves from `previous` to `next`;
 * either may be null. Never below zero. A rollback is the same call with the
 * two swapped. Returns a new object.
 */
export function applyEventResponseChange<T extends EventResponseCounts>(
  event: T,
  previous: RsvpStatus | null,
  next: RsvpStatus | null
): T {
  const counts: EventResponseCounts = {
    rsvp_count: event.rsvp_count,
    interested_count: event.interested_count,
  };
  if (previous) {
    const field = COUNT_FIELD[previous];
    counts[field] = Math.max(0, counts[field] - 1);
  }
  if (next) {
    counts[COUNT_FIELD[next]] += 1;
  }
  return { ...event, ...counts };
}
