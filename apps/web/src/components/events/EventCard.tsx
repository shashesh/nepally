import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, Badge, Text, Group } from '@mantine/core';
import { formatPublicName, type Event } from '@nepally/shared';
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
    <Card
      component={Link}
      href={`/events/${event.id}`}
      radius="md"
      shadow="xs"
      padding={0}
      className={`${styles.card} ${past ? styles.cardPast : ''}`}
    >
      <div className={styles.row}>
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
          <Group gap={6} wrap="wrap">
            <EventTypeBadge type={event.event_type} />
            {event.is_global && (
              <Badge variant="light" color="blue" size="xs" radius="xl">🌐 Global</Badge>
            )}
            {event.status === 'cancelled' && (
              <Badge variant="light" color="red" size="xs" radius="xl">Cancelled</Badge>
            )}
          </Group>

          <Text fw={700} size="sm" lineClamp={2} className={past ? styles.titlePast : undefined}>
            {event.title}
          </Text>

          <Text size="xs" c="dimmed" truncate>
            {formatEventDate(event.start_date, event.end_date)}
          </Text>

          <Text size="xs" c="dimmed" truncate>📍 {event.location_name}</Text>

          <Group justify="space-between" mt="auto" pt={4}>
            <Group gap={5}>
              <Avatar
                name={event.organizer?.full_name ?? '?'}
                photoUrl={event.organizer?.profile_photo}
                trustLevel={event.organizer?.trust_level}
                size="small"
              />
              <Text size="xs" c="dimmed" fw={500}>{organizerName}</Text>
            </Group>
            <Text size="xs" c="dimmed" fw={600}>{rsvpLabel}</Text>
          </Group>
        </div>
      </div>
    </Card>
  );
}
