import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatPublicName, type Event, type RsvpStatus } from '@nepally/shared';
import { EventTypeBadge } from './EventTypeBadge';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { EventsStackParamList } from '../../types/navigation';

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
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
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

export const EventCard: React.FC<Props> = React.memo(({
  event,
  past = false,
  userResponse = null,
  canInteract = false,
  onResponseChange,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const organizerName = event.organizer
    ? formatPublicName(event.organizer.full_name)
    : 'Unknown';

  const interestedCount = formatCount(event.interested_count ?? 0, 'interested', 'interested');
  const goingCount = formatCount(event.rsvp_count, 'going', 'going');

  const buttonLabel = userResponse === 'going' ? '✓ Going' : '★ Interested';
  const buttonActive = userResponse !== null;

  const handleResponseSelect = async (status: RsvpStatus | null) => {
    setSheetVisible(false);
    if (!onResponseChange) return;
    setLoading(true);
    onResponseChange(event.id, status);
    setLoading(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.card, past && styles.cardPast]}
        onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
        activeOpacity={0.9}
      >
        {/* Cover image */}
        <View style={styles.cover}>
          {event.photo_url ? (
            <Image source={event.photo_url} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverEmoji}>📅</Text>
            </View>
          )}

          {/* Badges overlaid on cover */}
          <View style={styles.badges}>
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
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={[styles.title, past && styles.titlePast]} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={[styles.meta, past && styles.metaPast]}>
            📅 {formatEventDate(event.start_date, event.end_date)}
          </Text>
          <Text style={[styles.meta, past && styles.metaPast]} numberOfLines={1}>
            📍 {event.location_name}
          </Text>
          <Text style={[styles.meta, past && styles.metaPast]}>
            {interestedCount} · {goingCount}
          </Text>
        </View>

        {/* Action row */}
        <View style={styles.actions}>
          {canInteract && event.status === 'active' && !past ? (
            <TouchableOpacity
              style={[styles.responseBtn, buttonActive && styles.responseBtnActive]}
              onPress={(e) => {
                e?.stopPropagation?.();
                setSheetVisible(true);
              }}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={buttonActive ? colors.white : colors.primary.main} />
              ) : (
                <>
                  <Text style={[styles.responseBtnText, buttonActive && styles.responseBtnTextActive]}>
                    {buttonLabel}
                  </Text>
                  <Text style={[styles.responseBtnChevron, buttonActive && styles.responseBtnTextActive]}>
                    {' ▾'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.organizerRow}>
              <Text style={styles.organizerName}>{organizerName}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Response bottom sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setSheetVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Your response</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => handleResponseSelect('interested')}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconWrap, userResponse === 'interested' && styles.sheetIconActive]}>
                <Text style={styles.sheetOptionIcon}>★</Text>
              </View>
              <Text style={[styles.sheetOptionLabel, userResponse === 'interested' && styles.sheetOptionLabelActive]}>
                Interested
              </Text>
              <View style={[styles.radio, userResponse === 'interested' && styles.radioSelected]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => handleResponseSelect('going')}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconWrap, userResponse === 'going' && styles.sheetIconActive]}>
                <Text style={styles.sheetOptionIcon}>✓</Text>
              </View>
              <Text style={[styles.sheetOptionLabel, userResponse === 'going' && styles.sheetOptionLabelActive]}>
                Going
              </Text>
              <View style={[styles.radio, userResponse === 'going' && styles.radioSelected]} />
            </TouchableOpacity>

            {userResponse !== null && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => handleResponseSelect(null)}
                activeOpacity={0.7}
              >
                <View style={styles.sheetIconWrap}>
                  <Text style={styles.sheetOptionIcon}>✕</Text>
                </View>
                <Text style={styles.sheetOptionLabel}>Not Interested</Text>
                <View style={styles.radio} />
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

EventCard.displayName = 'EventCard';

const COVER_HEIGHT = 180;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardPast: {
    opacity: 0.65,
  },

  // ── Cover ──
  cover: {
    width: '100%',
    height: COVER_HEIGHT,
    backgroundColor: '#E8EAF6',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: COVER_HEIGHT,
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 48,
  },
  badges: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  globalBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  globalBadgeText: {
    fontSize: 10,
    color: '#1565C0',
    fontWeight: '600',
  },
  cancelledBadge: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cancelledBadgeText: {
    fontSize: 10,
    color: '#C62828',
    fontWeight: '600',
  },

  // ── Body ──
  body: {
    paddingHorizontal: spacing.s,
    paddingTop: spacing.xs,
    paddingBottom: 4,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 20,
  },
  titlePast: {
    color: colors.text.secondary,
  },
  meta: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  metaPast: {
    color: colors.text.tertiary,
  },

  // ── Action row ──
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  organizerRow: {
    flex: 1,
  },
  organizerName: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  responseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    borderRadius: borderRadius.button,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 2,
  },
  responseBtnActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  responseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  responseBtnTextActive: {
    color: colors.white,
  },
  responseBtnChevron: {
    fontSize: 12,
    color: colors.primary.main,
  },

  // ── Response sheet ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.m,
    paddingBottom: 36,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconActive: {
    backgroundColor: colors.primary.main,
  },
  sheetOptionIcon: {
    fontSize: 18,
    color: colors.text.primary,
  },
  sheetOptionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  sheetOptionLabelActive: {
    color: colors.primary.main,
    fontWeight: '700',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
  },
});
