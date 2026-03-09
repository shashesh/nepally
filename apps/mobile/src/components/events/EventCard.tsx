import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatPublicName, type Event } from '@nusa/shared';
import { Avatar } from '../Avatar';
import { EventTypeBadge } from './EventTypeBadge';
import { colors } from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { EventsStackParamList } from '../../types/navigation';

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
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${start.toLocaleDateString('en-US', opts)} · ${time}`;
  }

  const startShort = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endShort = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startShort} – ${endShort}`;
}

export const EventCard: React.FC<Props> = ({ event, past = false }) => {
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();

  const organizerName = event.organizer
    ? formatPublicName(event.organizer.full_name)
    : 'Unknown';

  const rsvpLabel =
    event.rsvp_count === 1 ? '1 going' : `${event.rsvp_count} going`;

  return (
    <TouchableOpacity
      style={[styles.card, past && styles.cardPast]}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
      activeOpacity={0.8}
    >
      {/* Thumbnail */}
      {event.photo_url ? (
        <Image source={{ uri: event.photo_url }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnailPlaceholder, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.thumbnailEmoji}>📅</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Badge row */}
        <View style={styles.badgeRow}>
          <EventTypeBadge type={event.event_type} />
          {event.is_global && (
            <View style={styles.globalBadge}>
              <Text style={styles.globalBadgeText}>🌐 Global</Text>
            </View>
          )}
          {event.status === 'cancelled' && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledBadgeText}>Cancelled</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, past && styles.titlePast]} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Date */}
        <Text style={[styles.meta, past && styles.metaPast]}>
          {formatEventDate(event.start_date, event.end_date)}
        </Text>

        {/* Location */}
        <Text style={[styles.meta, past && styles.metaPast]} numberOfLines={1}>
          📍 {event.location_name}
        </Text>

        {/* Organizer + RSVP count */}
        <View style={styles.footer}>
          <View style={styles.organizerRow}>
            <Avatar
              name={event.organizer?.full_name ?? '?'}
              photoUrl={event.organizer?.profile_photo}
              trustLevel={event.organizer?.trust_level}
              size="small"
            />
            <Text style={styles.organizerName}>{organizerName}</Text>
          </View>
          <Text style={styles.rsvpCount}>{rsvpLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    marginHorizontal: spacing.s,
    marginVertical: spacing.xs / 2,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardPast: {
    opacity: 0.65,
  },
  thumbnail: {
    width: 90,
    height: 90,
  },
  thumbnailPlaceholder: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailEmoji: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    padding: spacing.xs,
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  globalBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  globalBadgeText: {
    fontSize: 10,
    color: '#1565C0',
    fontWeight: '600',
  },
  cancelledBadge: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cancelledBadgeText: {
    fontSize: 10,
    color: '#C62828',
    fontWeight: '600',
  },
  title: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 2,
  },
  titlePast: {
    color: colors.text.secondary,
  },
  meta: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  metaPast: {
    color: colors.text.tertiary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  organizerName: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  rsvpCount: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
