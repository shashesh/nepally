import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge, Text } from '@mantine/core';
import { formatPublicName, type Event, type RsvpStatus } from '@nepally/shared';
import Avatar from '../Avatar';
import EventTypeBadge from './EventTypeBadge';
import styles from './EventCard.module.css';

interface Props {
  event: Event;
  past?: boolean;
  userResponse?: RsvpStatus | null;
  canInteract?: boolean;
  onResponseChange?: (eventId: string, status: RsvpStatus | null) => void;
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

function formatCount(n: number, singular: string, plural: string): string {
  if (n === 0) return `0 ${plural}`;
  if (n === 1) return `1 ${singular}`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K ${plural}`;
  return `${n} ${plural}`;
}

export default function EventCard({
  event,
  past = false,
  userResponse = null,
  canInteract = false,
  onResponseChange,
}: Props) {
  const organizerName = event.organizer
    ? formatPublicName(event.organizer.full_name)
    : 'Unknown';

  const interestedLabel = formatCount(event.interested_count ?? 0, 'interested', 'interested');
  const goingLabel = formatCount(event.rsvp_count, 'going', 'going');

  const showActionBtn = canInteract && event.status === 'active' && !past;
  const btnLabel = userResponse === 'going' ? '✓ Going' : '★ Interested';
  const btnActive = userResponse !== null;

  const handleResponse = (e: React.MouseEvent, status: RsvpStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onResponseChange) return;
    // Toggle off if same status selected
    onResponseChange(event.id, userResponse === status ? null : status);
  };

  return (
    <Link href={`/events/${event.id}`} className={`${styles.card} ${past ? styles.cardPast : ''}`}>
      {/* Cover image */}
      <div className={styles.cover}>
        {event.photo_url ? (
          <Image
            src={event.photo_url}
            alt={event.title}
            fill
            className={styles.coverImage}
            sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 370px"
          />
        ) : (
          <div className={styles.coverPlaceholder}>📅</div>
        )}
        <div className={styles.badges}>
          <EventTypeBadge type={event.event_type} />
          {event.is_global && (
            <Badge variant="filled" color="blue" size="xs" radius="xl">🌐 Global</Badge>
          )}
          {event.status === 'cancelled' && (
            <Badge variant="filled" color="red" size="xs" radius="xl">Cancelled</Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <Text fw={700} size="sm" lineClamp={2} className={`${styles.title} ${past ? styles.titlePast : ''}`}>
          {event.title}
        </Text>
        <Text size="xs" c="dimmed" className={styles.meta}>
          📅 {formatEventDate(event.start_date, event.end_date)}
        </Text>
        <Text size="xs" c="dimmed" className={styles.meta} truncate>
          📍 {event.location_name}
        </Text>
        <Text size="xs" c="dimmed" className={styles.counts}>
          {interestedLabel} · {goingLabel}
        </Text>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.organizer}>
          <Avatar
            name={event.organizer?.full_name ?? '?'}
            photoUrl={event.organizer?.profile_photo}
            trustLevel={event.organizer?.trust_level}
            size="small"
          />
          <Text size="xs" c="dimmed" fw={500} truncate className={styles.organizerName}>
            {organizerName}
          </Text>
        </div>

        {showActionBtn && (
          <div className={styles.responseGroup}>
            <button
              type="button"
              className={`${styles.responseBtn} ${btnActive ? styles.responseBtnActive : ''}`}
              onClick={(e) => handleResponse(e, userResponse === 'going' ? 'going' : 'interested')}
              aria-label={btnLabel}
            >
              {btnLabel} <span className={styles.chevron}>▾</span>
            </button>

            {/* Inline switcher: show Going button when currently Interested */}
            {userResponse === 'interested' && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={(e) => handleResponse(e, 'going')}
                aria-label="Switch to Going"
              >
                Going
              </button>
            )}
            {userResponse === 'going' && (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={(e) => handleResponse(e, 'interested')}
                aria-label="Switch to Interested"
              >
                Interested
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
