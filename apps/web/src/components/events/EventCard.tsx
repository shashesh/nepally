import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@mantine/core';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import {
  formatCount,
  formatEventDateShort,
  formatPublicName,
  type Event,
  type RsvpStatus,
} from '@nepally/shared';
import Avatar from '../Avatar';
import { ScopeBadge, SummaryRowMeta } from '../ui';
import EventTypeBadge from './EventTypeBadge';
import { EventResponseControl } from './EventResponseControl';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: Event;
  /** From the section the card sits in; hides the control and adds the "Past" label. */
  past?: boolean;
  response?: RsvpStatus | null;
  /** Shows the response control. False for Level 0 members. */
  canRespond?: boolean;
  /** This card's response is saving. */
  busy?: boolean;
  onRespond?: (eventId: string, next: RsvpStatus | null) => void;
}

/**
 * One event in the events grid. The title is the only link, and its `::after`
 * covers the card; the response control is the one thing above that overlay,
 * so no interactive element sits inside the link.
 */
export default function EventCard({
  event,
  past = false,
  response = null,
  canRespond = false,
  busy = false,
  onRespond,
}: EventCardProps) {
  const organizerName = event.organizer ? formatPublicName(event.organizer.full_name) : 'Unknown';
  const showControl = canRespond && event.status === 'active' && !past;

  return (
    <article className={styles.card} data-past={past || undefined}>
      <div className={styles.cover}>
        {event.photo_url ? (
          <Image
            src={event.photo_url}
            alt=""
            fill
            className={styles.coverImage}
            sizes="(max-width: 520px) 100vw, (max-width: 860px) 50vw, 370px"
          />
        ) : (
          <div className={styles.coverPlaceholder} aria-hidden="true">
            📅
          </div>
        )}
        <div className={styles.badges}>
          <EventTypeBadge type={event.event_type} />
          {event.is_global && <ScopeBadge isGlobal />}
          {event.status === 'cancelled' && (
            <Badge variant="default" size="sm" radius="xl" className={styles.cancelled}>
              Cancelled
            </Badge>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={`/events/${event.id}`} className={styles.stretchedLink}>
            {event.title}
          </Link>
        </h3>
        <p className={styles.detail}>
          <IconCalendar size={14} aria-hidden="true" className={styles.detailIcon} />
          <time dateTime={event.start_date}>
            {formatEventDateShort(event.start_date, event.end_date)}
          </time>
        </p>
        <p className={styles.detail}>
          <IconMapPin size={14} aria-hidden="true" className={styles.detailIcon} />
          <span className={styles.place}>{event.location_name}</span>
        </p>
        <SummaryRowMeta>
          <span>{formatCount(event.interested_count ?? 0)} interested</span>
          <span>{formatCount(event.rsvp_count ?? 0)} going</span>
          {past && <span>Past</span>}
        </SummaryRowMeta>
      </div>

      <div className={styles.footer}>
        <div className={styles.organizer}>
          <Avatar
            name={organizerName}
            toneKey={event.organizer?.full_name}
            photoUrl={event.organizer?.profile_photo}
            trustLevel={event.organizer?.trust_level}
            size="small"
            decorative
          />
          <span className={styles.organizerName}>{organizerName}</span>
        </div>

        {showControl && (
          <div className={styles.response}>
            <EventResponseControl
              value={response}
              busy={busy}
              size="sm"
              label={`Your response to ${event.title}`}
              onChange={(next) => onRespond?.(event.id, next)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
