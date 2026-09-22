import React, { useId } from 'react';
import { Anchor } from '@mantine/core';
import type { Event, RsvpStatus } from '@nepally/shared';
import { EventResponseControl } from './EventResponseControl';
import styles from './EventAttendanceCard.module.css';

/** Why the member can't respond. `cancelled` renders no line, because the page's alert already says so. */
export type EventResponseBlock = 'cancelled' | 'past' | 'organizer' | 'unverified';

export interface EventAttendanceCardProps {
  event: Pick<Event, 'rsvp_count' | 'rsvp_visibility'>;
  isOrganizer: boolean;
  blockedBy: EventResponseBlock | null;
  response: RsvpStatus | null;
  responding: boolean;
  onRespond: (next: RsvpStatus | null) => void;
  onShowAttendees: () => void;
}

const BLOCK_LINES: Record<Exclude<EventResponseBlock, 'cancelled'>, string> = {
  past: 'This event has passed.',
  organizer: "You're the organizer.",
  unverified: 'Verify your account to respond.',
};

/**
 * Event detail's attendance card: the going count (which opens the attendee
 * list when the viewer may see it), then the response control, or a sentence
 * saying why the member can't respond — never a disabled button, which
 * couldn't take focus.
 */
export function EventAttendanceCard({
  event,
  isOrganizer,
  blockedBy,
  response,
  responding,
  onRespond,
  onShowAttendees,
}: EventAttendanceCardProps) {
  const titleId = useId();
  const count = event.rsvp_count;
  const canSeeList = event.rsvp_visibility === 'public' || isOrganizer;
  const goingLabel = count === 1 ? '1 person going' : `${count} people going`;

  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <h2 id={titleId} className={styles.title}>
        Attendance
      </h2>

      {!canSeeList ? (
        <p className={styles.count}>{count} going</p>
      ) : count > 0 ? (
        <Anchor
          component="button"
          type="button"
          aria-haspopup="dialog"
          underline="always"
          className={styles.countButton}
          onClick={onShowAttendees}
        >
          {goingLabel}
        </Anchor>
      ) : (
        <p className={styles.count}>{goingLabel}</p>
      )}

      {blockedBy === null ? (
        <EventResponseControl value={response} busy={responding} onChange={onRespond} />
      ) : blockedBy !== 'cancelled' ? (
        <p className={styles.blocked}>{BLOCK_LINES[blockedBy]}</p>
      ) : null}
    </section>
  );
}
