import React from 'react';
import Link from 'next/link';
import type { Event } from '@nepally/shared';
import { ScopeBadge } from '../ui';
import styles from './EventSummaryRow.module.css';

export interface EventSummaryRowProps {
  event: Pick<
    Event,
    'id' | 'title' | 'start_date' | 'end_date' | 'location_name' | 'rsvp_count' | 'is_global' | 'status'
  >;
  /** From useNow(), so every row agrees on what is past — and tests can fix it. */
  now: Date;
}

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

/**
 * One event in a list of summaries — a user's organized events, a public
 * profile. The title is the only link, and its `::after` stretches over the
 * row, matching PostSummaryRow.
 */
export function EventSummaryRow({ event, now }: EventSummaryRowProps) {
  const going = event.rsvp_count ?? 0;
  const isCancelled = event.status === 'cancelled';
  const isPast = !isCancelled && new Date(event.end_date ?? event.start_date) < now;
  const statusLabel = isCancelled ? 'Cancelled' : isPast ? 'Past' : null;
  const date = new Date(event.start_date).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);

  return (
    <article className={styles.root}>
      <div className={styles.top}>
        <Link href={`/events/${event.id}`} className={styles.stretchedLink}>
          {event.title}
        </Link>
        <span className={styles.scope}>
          <ScopeBadge isGlobal={event.is_global} />
        </span>
      </div>

      <div className={styles.detail}>
        <time dateTime={event.start_date}>{date}</time>
        {event.location_name && <span>{event.location_name}</span>}
      </div>

      <div className={styles.meta}>
        <span>{going} going</span>
        {statusLabel && <span>{statusLabel}</span>}
      </div>
    </article>
  );
}
