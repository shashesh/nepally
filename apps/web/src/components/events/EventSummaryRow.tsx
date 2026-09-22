import React from 'react';
import { formatDate, type Event } from '@nepally/shared';
import { ScopeBadge, SummaryRow, SummaryRowMeta } from '../ui';

export interface EventSummaryRowProps {
  event: Pick<
    Event,
    'id' | 'title' | 'start_date' | 'end_date' | 'location_name' | 'rsvp_count' | 'is_global' | 'status'
  >;
  /** From useNow(), so every row agrees on what is past — and tests can fix it. */
  now: Date;
}

/**
 * One event in a list of summaries — a user's organized events, a public
 * profile. Built on SummaryRow, matching PostSummaryRow: the title is the
 * only link, and its `::after` stretches over the row.
 */
export function EventSummaryRow({ event, now }: EventSummaryRowProps) {
  const going = event.rsvp_count ?? 0;
  const isCancelled = event.status === 'cancelled';
  const isPast = !isCancelled && new Date(event.end_date ?? event.start_date) < now;
  const statusLabel = isCancelled ? 'Cancelled' : isPast ? 'Past' : null;
  const date = formatDate(new Date(event.start_date));

  return (
    <SummaryRow
      href={`/events/${event.id}`}
      title={event.title}
      badge={<ScopeBadge isGlobal={event.is_global} />}
    >
      <SummaryRowMeta variant="detail">
        <time dateTime={event.start_date}>{date}</time>
        {event.location_name && <span>{event.location_name}</span>}
      </SummaryRowMeta>

      <SummaryRowMeta>
        <span>{going} going</span>
        {statusLabel && <span>{statusLabel}</span>}
      </SummaryRowMeta>
    </SummaryRow>
  );
}
