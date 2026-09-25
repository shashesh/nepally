import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  applyEventResponseChange,
  getEventById,
  getEventAttendees,
  getUserEventResponse,
  setEventResponse,
  removeEventResponse,
  cancelEvent,
  deleteEvent,
  formatCount,
  formatEventDateLong,
  formatPublicName,
  isEventPast,
  userMessage,
  TrustLevel,
  type Event,
  type EventRsvp,
  type RsvpStatus,
} from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { EventTypeBadge } from '../components/events/EventTypeBadge';
import {
  EventResponseButtons,
  type EventResponseBlock,
} from '../components/events/EventResponseButtons';
import { AttendeeAvatarStack } from '../components/events/AttendeeAvatarStack';
import { Avatar } from '../components/Avatar';
import { colors } from '../styles/colors';
import { spacing, borderRadius } from '../styles/spacing';
import { typography } from '../styles/typography';
import type { EventsStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<EventsStackParamList>;
type Route = RouteProp<EventsStackParamList, 'EventDetail'>;

const LOAD_FAILED = "Couldn't load this event.";
const RESPONSE_ERROR = "Couldn't update your response. Try again.";
const CANCEL_FAILED = "Couldn't cancel the event. Please try again.";
const DELETE_FAILED = "Couldn't delete the event. Please try again.";

/** The event and the member's response to it, read together. */
async function fetchDetail(eventId: string, userId: string | undefined) {
  const [eventResult, responseResult] = await Promise.all([
    getEventById(supabase, eventId),
    userId
      ? getUserEventResponse(supabase, eventId, userId)
      : Promise.resolve({ data: null as RsvpStatus | null }),
  ]);
  return { eventResult, responseResult };
}

export default function EventDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { eventId } = route.params;
  const { user } = useAuth();
  const userId = user?.id;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<RsvpStatus | null>(null);
  const [responding, setResponding] = useState(false);
  const [attendees, setAttendees] = useState<EventRsvp[]>([]);
  const [attendeesModalVisible, setAttendeesModalVisible] = useState(false);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const respondingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isOrganizer = event?.organizer_id === userId;
  const isPast = event ? isEventPast(event, new Date()) : false;
  const isCancelled = event?.status === 'cancelled';
  const isLevel0 = (user?.trust_level ?? 0) < TrustLevel.VERIFIED;

  // Why the member can't respond, checked in this order; null when they can.
  const responseBlock: EventResponseBlock | null = (() => {
    if (isCancelled) return 'cancelled';
    if (isPast) return 'past';
    if (isOrganizer) return 'organizer';
    if (isLevel0) return 'unverified';
    return null;
  })();

  const isEdited =
    event
      ? new Date(event.updated_at).getTime() - new Date(event.created_at).getTime() > 60_000
      : false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { eventResult, responseResult } = await fetchDetail(eventId, userId);
        if (cancelled) return;
        if (eventResult.error && !eventResult.notFound) {
          setError(
            userMessage(eventResult.error, LOAD_FAILED, 'event_load_failed', { platform: 'mobile', eventId })
          );
        } else if (eventResult.data) {
          setEvent(eventResult.data);
          // A failed response request leaves the member with no response shown.
          setResponse(responseResult.data ?? null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(userMessage(err, LOAD_FAILED, 'event_load_failed', { platform: 'mobile', eventId }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, userId]);

  // Interested or Going, or null to clear: the counts move at once and roll back if the write fails.
  const respond = useCallback(
    (next: RsvpStatus | null) => {
      if (!userId || !event || respondingRef.current) return;
      const previous = response;
      if (previous === next) return;

      respondingRef.current = true;
      setResponding(true);
      setResponse(next);
      setEvent((current) => (current ? applyEventResponseChange(current, previous, next) : current));

      const write =
        next === null
          ? removeEventResponse(supabase, eventId, userId)
          : setEventResponse(supabase, eventId, userId, next);

      void write
        .then(async (result) => {
          if (!mountedRef.current) return;
          if (result.error) {
            setResponse(previous);
            setEvent((current) =>
              current ? applyEventResponseChange(current, next, previous) : current
            );
            Alert.alert('Error', RESPONSE_ERROR);
          }
          // Either way, take the counts and the response the server now has.
          const { eventResult, responseResult } = await fetchDetail(eventId, userId);
          if (!mountedRef.current) return;
          if (eventResult.data) setEvent(eventResult.data);
          if (responseResult.data !== undefined) setResponse(responseResult.data);
        })
        .finally(() => {
          respondingRef.current = false;
          if (mountedRef.current) setResponding(false);
        });
    },
    [userId, event, response, eventId]
  );

  const handleShowAttendees = useCallback(async () => {
    setAttendeesModalVisible(true);
    if (attendees.length === 0) {
      setAttendeesLoading(true);
      const result = await getEventAttendees(supabase, eventId);
      if (result.data) setAttendees(result.data);
      setAttendeesLoading(false);
    }
  }, [attendees.length, eventId]);

  const handleCancelEvent = () => {
    Alert.alert(
      'Cancel Event',
      'Cancel this event? Your attendees will see it as cancelled.',
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelEvent(supabase, eventId);
            if (result.error) {
              Alert.alert(
                'Error',
                userMessage(result.error, CANCEL_FAILED, 'event_cancel_failed', { platform: 'mobile', eventId })
              );
              return;
            }
            setEvent((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
          },
        },
      ]
    );
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Delete Event',
      'Delete this event? This cannot be undone.',
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Delete Event',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEvent(supabase, eventId);
            if (result.error) {
              Alert.alert(
                'Error',
                userMessage(result.error, DELETE_FAILED, 'event_delete_failed', { platform: 'mobile', eventId })
              );
              return;
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleMessageOrganizer = useCallback(async () => {
    if (!event?.organizer || !userId) return;
    navigation.getParent()?.navigate?.('MessageThread', {
      conversationId: '',
      otherUserId: event.organizer.id,
      otherUserName: event.organizer.full_name,
      otherUserTrustLevel: event.organizer.trust_level,
      otherUserPhotoUrl: event.organizer.profile_photo,
    });
  }, [event, userId, navigation]);

  const handleViewOrganizerProfile = useCallback(() => {
    if (!event?.organizer) return;
    navigation.getParent()?.navigate?.('PublicProfileView', { userId: event.organizer.id });
  }, [event, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Event not found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Attendees Modal */}
      <Modal
        visible={attendeesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAttendeesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendees</Text>
              <TouchableOpacity onPress={() => setAttendeesModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {attendeesLoading ? (
              <ActivityIndicator style={{ padding: 24 }} color={colors.primary.main} />
            ) : (
              <FlatList
                data={attendees}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.attendeeRow}>
                    <Avatar
                      name={item.user?.full_name ?? '?'}
                      photoUrl={item.user?.profile_photo}
                      trustLevel={item.user?.trust_level}
                      size="small"
                    />
                    <Text style={styles.attendeeName}>
                      {item.user ? formatPublicName(item.user.full_name) : 'User'}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.attendeesEmpty}>No attendees yet.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back + organizer actions */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
            <Text style={styles.navButtonText}>← Back</Text>
          </TouchableOpacity>
          {isOrganizer && (
            <View style={styles.navActions}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigation.navigate('CreateEvent', { editEventId: event.id })}
              >
                <Text style={styles.navButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={handleCancelEvent}>
                <Text style={[styles.navButtonText, { color: colors.warning }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={handleDeleteEvent}>
                <Text style={[styles.navButtonText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Hero Image */}
        {event.photo_url ? (
          <Image source={event.photo_url} style={styles.hero} contentFit="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Text style={styles.heroEmoji}>📅</Text>
          </View>
        )}

        <View style={styles.body}>
          {/* Cancelled banner */}
          {isCancelled && (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledBannerText}>This event has been cancelled.</Text>
            </View>
          )}

          {/* Past banner */}
          {isPast && !isCancelled && (
            <View style={styles.pastBanner}>
              <Text style={styles.pastBannerText}>This event has passed.</Text>
            </View>
          )}

          {/* Type badge + global badge */}
          <View style={styles.badgeRow}>
            <EventTypeBadge type={event.event_type} />
            {event.is_global && (
              <View style={styles.globalBadge}>
                <Text style={styles.globalBadgeText}>🌐 Global</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {event.title}
            {isEdited && <Text style={styles.editedLabel}> (edited)</Text>}
          </Text>

          {/* Date */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{formatEventDateLong(event.start_date, event.end_date)}</Text>
          </View>

          {/* Location */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View>
              <Text style={styles.infoText}>{event.location_name}</Text>
              {event.location_address && (
                <Text style={styles.infoSubtext}>{event.location_address}</Text>
              )}
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>{event.description}</Text>

          {/* Organizer section */}
          {event.organizer && (
            <View style={styles.organizerSection}>
              <Text style={styles.sectionLabel}>Organizer</Text>
              <View style={styles.organizerRow}>
                <TouchableOpacity onPress={handleViewOrganizerProfile}>
                  <Avatar
                    name={event.organizer.full_name}
                    photoUrl={event.organizer.profile_photo}
                    trustLevel={event.organizer.trust_level}
                    size="medium"
                  />
                </TouchableOpacity>
                <View style={styles.organizerInfo}>
                  <TouchableOpacity onPress={handleViewOrganizerProfile}>
                    <Text style={styles.organizerName}>
                      {formatPublicName(event.organizer.full_name)}
                    </Text>
                  </TouchableOpacity>
                </View>
                {!isOrganizer && !isLevel0 && (
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={handleMessageOrganizer}
                  >
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* RSVP section */}
          <View style={styles.rsvpSection}>
            <Text style={styles.sectionLabel}>Attendance</Text>

            {/* Private hides who is going, not how many: the stack of names shows only
                when rsvp_visibility is public or the viewer organizes; the counts always show. */}
            {(event.rsvp_visibility === 'public' || isOrganizer) && (
              <AttendeeAvatarStack
                attendees={attendees}
                totalCount={event.rsvp_count}
                onPress={handleShowAttendees}
              />
            )}

            <Text style={styles.responseCounts}>
              {formatCount(event.interested_count ?? 0)} interested · {formatCount(event.rsvp_count)} going
            </Text>

            <EventResponseButtons
              value={response}
              busy={responding}
              blockedBy={responseBlock}
              onChange={respond}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  backButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: borderRadius.button,
  },
  backButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navButtonText: {
    color: colors.primary.main,
    fontSize: 15,
    fontWeight: '600',
  },
  navActions: {
    flexDirection: 'row',
    gap: 4,
  },
  hero: {
    width: '100%',
    height: 220,
  },
  heroPlaceholder: {
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 64,
  },
  body: {
    backgroundColor: colors.white,
    padding: spacing.s,
    gap: spacing.xs,
  },
  cancelledBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: borderRadius.card,
    padding: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  cancelledBannerText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  pastBanner: {
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.card,
    padding: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.text.secondary,
  },
  pastBannerText: {
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  globalBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  globalBadgeText: {
    fontSize: 11,
    color: '#1565C0',
    fontWeight: '600',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: 4,
  },
  editedLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  infoIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  infoText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  infoSubtext: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  description: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.xs,
    lineHeight: 24,
  },
  sectionLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  organizerSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  messageButton: {
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    borderRadius: borderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  messageButtonText: {
    color: colors.primary.main,
    fontSize: 13,
    fontWeight: '600',
  },
  rsvpSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  responseCounts: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  // Attendees modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
    paddingBottom: spacing.l,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  modalClose: {
    fontSize: 18,
    color: colors.text.secondary,
    padding: 4,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attendeeName: {
    ...typography.body,
    color: colors.text.primary,
  },
  attendeesEmpty: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: spacing.l,
  },
});
