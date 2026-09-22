import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Center, Text, UnstyledButton } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getEventById,
  getEventAttendees,
  getUserEventResponse,
  getOrCreateConversation,
  rsvpToEvent,
  unrsvpFromEvent,
  cancelEvent,
  deleteEvent,
  formatPublicName,
  TrustLevel,
  type Event,
  type EventRsvp,
} from '@nepally/shared';
import EventTypeBadge from '../../components/events/EventTypeBadge';
import RsvpButton from '../../components/events/RsvpButton';
import AttendeeList from '../../components/events/AttendeeList';
import Avatar from '../../components/Avatar';
import styles from './eventDetail.module.css';

export default function EventDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoing, setIsGoing] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [attendees, setAttendees] = useState<EventRsvp[]>([]);
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);

  const userId = user?.id ?? '';
  const trustLevel = user?.trust_level ?? 0;
  const isOrganizer = event?.organizer_id === userId;
  const isPast = event
    ? new Date(event.end_date ?? event.start_date) < new Date()
    : false;
  const isCancelled = event?.status === 'cancelled';
  const isLevel0 = trustLevel < TrustLevel.VERIFIED;
  const isEdited = event
    ? new Date(event.updated_at).getTime() - new Date(event.created_at).getTime() > 60_000
    : false;

  const rsvpState = (() => {
    if (isCancelled) return 'cancelled' as const;
    if (isPast) return 'past' as const;
    if (isOrganizer) return 'organizer' as const;
    if (isLevel0) return 'level0' as const;
    if (isGoing) return 'going' as const;
    return 'default' as const;
  })();

  const refreshRsvpState = useCallback(
    async (eventId: string, currentUserId: string) => {
      const [eventResult, rsvpStateResult] = await Promise.all([
        getEventById(supabase, eventId),
        getUserEventResponse(supabase, eventId, currentUserId),
      ]);

      if (eventResult.data) {
        setEvent(eventResult.data);
      }

      if (rsvpStateResult.data !== undefined) {
        setIsGoing(rsvpStateResult.data === 'going');
      }
    },
    []
  );

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (!id || typeof id !== 'string') return;

    (async () => {
      const result = await getEventById(supabase, id);
      if (result.error) {
        setError(result.error.message);
      } else if (result.data) {
        setEvent(result.data);
        if (userId) {
          const rsvpStateResult = await getUserEventResponse(supabase, id, userId);
          if (rsvpStateResult.data !== undefined) setIsGoing(rsvpStateResult.data === 'going');
        }
      }
      setLoading(false);
    })();
  }, [id, user, userId, router]);

  const handleRsvpToggle = useCallback(async () => {
    if (!userId || rsvpLoading || !event) return;
    setRsvpLoading(true);
    const prevGoing = isGoing;
    const nextGoing = !prevGoing;

    setIsGoing(nextGoing);

    const result = prevGoing
      ? await unrsvpFromEvent(supabase, event.id, userId)
      : await rsvpToEvent(supabase, event.id, userId);

    if (result.error) {
      setIsGoing(prevGoing);
      alert("Couldn't update RSVP. Try again.");
    }

    await refreshRsvpState(event.id, userId);
    setRsvpLoading(false);
  }, [userId, event, isGoing, rsvpLoading, refreshRsvpState]);

  const handleShowAttendees = useCallback(async () => {
    setAttendeesOpen(true);
    if (attendees.length === 0 && event) {
      setAttendeesLoading(true);
      const result = await getEventAttendees(supabase, event.id);
      if (result.data) setAttendees(result.data);
      setAttendeesLoading(false);
    }
  }, [attendees.length, event]);

  const handleCancelEvent = async () => {
    if (!event) return;
    if (!confirm('Cancel this event? Your attendees will see it as cancelled.')) return;
    const result = await cancelEvent(supabase, event.id);
    if (result.error) {
      alert(result.error.message || 'Could not cancel this event.');
      return;
    }
    setEvent((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    if (!confirm('Delete this event? This cannot be undone.')) return;
    const result = await deleteEvent(supabase, event.id);
    if (result.error) {
      alert(result.error.message || 'Could not delete this event.');
      return;
    }
    router.push('/events');
  };

  const organizer = event?.organizer;
  const handleMessageOrganizer = useCallback(async () => {
    if (!user || !organizer || messagingLoading) return;
    setMessagingLoading(true);
    const result = await getOrCreateConversation(
      supabase,
      user.id,
      user.full_name,
      organizer.id,
      organizer.full_name
    );
    setMessagingLoading(false);

    if (result.data) {
      router.push(`/messages/${result.data.conversationId}`);
    } else {
      alert('Failed to start conversation. Please try again.');
    }
  }, [user, organizer, messagingLoading, router]);

  const formatFullDate = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
    };
    if (!endDate) return start.toLocaleString('en-US', opts);
    const end = new Date(endDate);
    if (start.toDateString() === end.toDateString()) {
      const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const st = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const et = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${dateStr} · ${st} – ${et}`;
    }
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Center p="xl"><Text c="dimmed">Loading...</Text></Center>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.centered}>
            <div>
              <Text c="red">{error ?? 'Event not found'}</Text>
              <Link href="/events" className={styles.backLink}>← Back to Events</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{event.title} - Nepally Events</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Breadcrumb */}
          <div className={styles.breadcrumb}>
            <Link href="/events" className={styles.breadcrumbLink}>Events</Link>
            <span>›</span>
            <span>{event.title}</span>
          </div>

          <div className={styles.layout}>
            {/* Main content */}
            <div className={styles.main}>
              {event.photo_url ? (
                <Image
                  src={event.photo_url}
                  alt={event.title}
                  width={1200}
                  height={280}
                  className={styles.hero}
                />
              ) : (
                <div className={styles.heroPlaceholder}>📅</div>
              )}

              <div className={styles.mainBody}>
                {isCancelled && (
                  <Alert color="red" variant="light" mb="sm">This event has been cancelled.</Alert>
                )}
                {isPast && !isCancelled && (
                  <Alert color="gray" variant="light" mb="sm">This event has passed.</Alert>
                )}

                <div className={styles.badgeRow}>
                  <EventTypeBadge type={event.event_type} />
                  {event.is_global && <Badge variant="light" color="orange">🌐 Global</Badge>}
                </div>

                <h1 className={styles.title}>
                  {event.title}
                  {isEdited && <span className={styles.editedLabel}> (edited)</span>}
                </h1>

                <div className={styles.infoRow}>
                  <span className={styles.infoIcon}>📅</span>
                  <span className={styles.infoText}>
                    {formatFullDate(event.start_date, event.end_date)}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoIcon}>📍</span>
                  <div>
                    <div className={styles.infoText}>{event.location_name}</div>
                    {event.location_address && (
                      <div className={styles.infoSubtext}>{event.location_address}</div>
                    )}
                  </div>
                </div>

                <p className={styles.description}>{event.description}</p>
              </div>
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              {/* RSVP Card */}
              <div className={styles.sidebarCard}>
                <p className={styles.sectionTitle}>Attendance</p>

                {event.rsvp_visibility === 'public' || isOrganizer ? (
                  event.rsvp_count > 0 ? (
                    <UnstyledButton
                      className={`${styles.rsvpCountButton} ${styles.rsvpCount} ${styles.rsvpCountClickable}`}
                      onClick={handleShowAttendees}
                    >
                      {event.rsvp_count === 1 ? '1 person going' : `${event.rsvp_count} people going`}
                    </UnstyledButton>
                  ) : (
                    <p className={styles.rsvpCount}>0 people going</p>
                  )
                ) : (
                  <p className={styles.rsvpPrivate}>{event.rsvp_count} going</p>
                )}

                <RsvpButton state={rsvpState} onPress={handleRsvpToggle} loading={rsvpLoading} />
                {(rsvpState === 'default' || rsvpState === 'going') && (
                  <p className={styles.rsvpHint}>
                    {rsvpState === 'going' ? 'You are currently going.' : 'Tap RSVP if you plan to attend.'}
                  </p>
                )}
              </div>

              {/* Organizer Card */}
              {event.organizer && (
                <div className={styles.sidebarCard}>
                  <p className={styles.sectionTitle}>Organizer</p>
                  <div className={styles.organizerRow}>
                    <Link href={`/users/${event.organizer.id}`}>
                      <Avatar
                        name={event.organizer.full_name}
                        photoUrl={event.organizer.profile_photo}
                        trustLevel={event.organizer.trust_level}
                        size="medium"
                      />
                    </Link>
                    <div className={styles.organizerInfo}>
                      <Link href={`/users/${event.organizer.id}`} className={styles.organizerName}>
                        {formatPublicName(event.organizer.full_name)}
                      </Link>
                    </div>
                  </div>
                  {!isOrganizer && !isLevel0 && (
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={handleMessageOrganizer}
                      loading={messagingLoading}
                    >
                      Message Organizer
                    </Button>
                  )}
                </div>
              )}

              {/* Organizer actions */}
              {isOrganizer && (
                <div className={styles.sidebarCard}>
                  <p className={styles.sectionTitle}>Manage Event</p>
                  <div className={styles.organizerActions}>
                    <Button component={Link} href={`/events/create?edit=${event.id}`} variant="light" fullWidth>
                      Edit Event
                    </Button>
                    <Button variant="light" color="orange" fullWidth onClick={handleCancelEvent} type="button">
                      Cancel Event
                    </Button>
                    <Button variant="light" color="red" fullWidth onClick={handleDeleteEvent} type="button">
                      Delete Event
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {/* Attendees modal */}
      <AttendeeList
        opened={attendeesOpen}
        attendees={attendees}
        loading={attendeesLoading}
        error={null}
        onRetry={handleShowAttendees}
        onClose={() => setAttendeesOpen(false)}
      />

    </>
  );
}
