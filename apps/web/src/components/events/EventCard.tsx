import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPublicName, type Event } from '@nusa/shared';
import Avatar from '../Avatar';
import EventTypeBadge from './EventTypeBadge';
import styles from './EventCard.module.css';

interface Props {
  event: Event;
  past?: boolean;
}

function formatEventDate(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

  if (!endDate) {
    const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${start.toLocaleDateString('en-US', opts)} · ${time}`;
  }

  const end = new Date(endDate);
  if (start.toDateString() === end.toDateString()) {
    const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${start.toLocaleDateString('en-US', opts)} · ${time}`;
  }

  const startShort = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endShort = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startShort} – ${endShort}`;
}

export default function EventCard({ event, past = false }: Props) {
  const organizerName = event.organizer
    ? formatPublicName(event.organizer.full_name)
    : 'Unknown';

  const rsvpLabel =
    event.rsvp_count === 1 ? '1 going' : `${event.rsvp_count} going`;

  return (
    <Link
      href={`/events/${event.id}`}
      className={`${styles.card} ${past ? styles.cardPast : ''}`}
    >
      {event.photo_url ? (
        <Image
          src={event.photo_url}
          alt={event.title}
          width={110}
          height={110}
          className={styles.thumbnail}
        />
      ) : (
        <div className={styles.thumbnailPlaceholder}>📅</div>
      )}

      <div className={styles.content}>
        <div className={styles.badgeRow}>
          <EventTypeBadge type={event.event_type} />
          {event.is_global && (
            <span className={styles.globalBadge}>🌐 Global</span>
          )}
          {event.status === 'cancelled' && (
            <span className={styles.cancelledBadge}>Cancelled</span>
          )}
        </div>

        <div className={`${styles.title} ${past ? styles.titlePast : ''}`}>
          {event.title}
        </div>

        <div className={styles.meta}>
          {formatEventDate(event.start_date, event.end_date)}
        </div>

        <div className={styles.meta}>📍 {event.location_name}</div>

        <div className={styles.footer}>
          <div className={styles.organizerRow}>
            <Avatar
              name={event.organizer?.full_name ?? '?'}
              photoUrl={event.organizer?.profile_photo}
              trustLevel={event.organizer?.trust_level}
              size="small"
            />
            <span className={styles.organizerName}>{organizerName}</span>
          </div>
          <span className={styles.rsvpCount}>{rsvpLabel}</span>
        </div>
      </div>
    </Link>
  );
}
