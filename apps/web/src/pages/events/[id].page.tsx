import React, { useCallback, useEffect, useId, useState } from 'react';
import { Alert, Anchor, Breadcrumbs, Button } from '@mantine/core';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  formatEventDateLong,
  getEventAttendees,
  isEventPast,
  TrustLevel,
  type Event,
  type EventRsvp,
  type User,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { useEventDetail } from '../../hooks/useEventDetail';
import { useNow } from '../../hooks/useNow';
import { useStartConversation } from '../../hooks/useStartConversation';
import { supabase } from '../../lib/supabase';
import AttendeeList from '../../components/events/AttendeeList';
import { EventAttendanceCard, type EventResponseBlock } from '../../components/events/EventAttendanceCard';
import { EventOrganizerCard } from '../../components/events/EventOrganizerCard';
import EventTypeBadge from '../../components/events/EventTypeBadge';
import { EmptyState, ErrorState, LoadingState, ScopeBadge, notify, useConfirm } from '../../components/ui';
import styles from './eventDetail.module.css';

const EDITED_AFTER_MS = 60_000;

/** Why the viewer can't respond, checked in this order; null when they can. */
function getResponseBlock(event: Event, viewer: Pick<User, 'id' | 'trust_level'>, now: Date): EventResponseBlock | null {
  if (event.status === 'cancelled') return 'cancelled';
  if (isEventPast(event, now)) return 'past';
  if (event.organizer_id === viewer.id) return 'organizer';
  if ((viewer.trust_level ?? 0) < TrustLevel.VERIFIED) return 'unverified';
  return null;
}

export default function EventDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const id = typeof router.query.id === 'string' ? router.query.id : undefined;

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;
  // The Pages Router keeps this page mounted from one event to the next, so
  // key the view by id: the attendee list and busy flags start fresh too.
  return <EventDetailView key={id ?? ''} id={id} viewer={user} />;
}

interface EventDetailViewProps {
  id: string | undefined;
  viewer: Pick<User, 'id' | 'full_name' | 'trust_level'>;
}

function EventDetailView({ id, viewer }: EventDetailViewProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const now = useNow();
  const manageTitleId = useId();
  const detail = useEventDetail(id, viewer.id);
  const { event } = detail;

  const [attendees, setAttendees] = useState<EventRsvp[] | null>(null);
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);
  const { start: startConversation, starting: messaging } = useStartConversation();

  const loadAttendees = useCallback(async () => {
    if (!event) return;
    setAttendeesLoading(true);
    setAttendeesError(null);
    const result = await getEventAttendees(supabase, event.id);
    if (result.error) setAttendeesError(result.error.message);
    else setAttendees(result.data ?? []);
    setAttendeesLoading(false);
  }, [event]);

  const handleShowAttendees = () => {
    setAttendeesOpen(true);
    if (attendees === null && !attendeesLoading) void loadAttendees();
  };

  const handleMessage = () => {
    const organizer = event?.organizer;
    if (organizer) void startConversation({ id: organizer.id, name: organizer.full_name });
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel this event?',
      message: 'Your attendees will see it as cancelled.',
      confirmLabel: 'Cancel event',
      cancelLabel: 'Keep event',
      danger: true,
    });
    if (!confirmed) return;
    const error = await detail.cancel();
    if (error) notify.error(error);
    else notify.success('Event cancelled.');
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete this event?',
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    const error = await detail.remove();
    if (error) {
      notify.error(error);
      return;
    }
    router.push('/events');
    notify.success('Event deleted.');
  };

  if (detail.loading || !id) {
    return (
      <div className={styles.container}>
        <LoadingState variant="detail" label="Loading event…" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.container}>
        {detail.notFound ? (
          <EmptyState
            title="Event not found"
            description="It may have been deleted."
            action={
              <Button component={Link} href="/events">
                Back to events
              </Button>
            }
          />
        ) : (
          <ErrorState title="Couldn't load this event" message={detail.error ?? 'Something went wrong.'} onRetry={detail.reload} />
        )}
      </div>
    );
  }

  const isOrganizer = event.organizer_id === viewer.id;
  const isCancelled = event.status === 'cancelled';
  const isPast = isEventPast(event, now);
  const isEdited = new Date(event.updated_at).getTime() - new Date(event.created_at).getTime() > EDITED_AFTER_MS;

  return (
    <>
      <Head>
        <title>{`${event.title} - Nepally Events`}</title>
      </Head>
      <div className={styles.container}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Breadcrumbs separator={<span aria-hidden="true">/</span>}>
            <Anchor component={Link} href="/events" inherit>
              Events
            </Anchor>
            <span aria-current="page" className={styles.breadcrumbCurrent}>
              {event.title}
            </span>
          </Breadcrumbs>
        </nav>

        <div className={styles.layout}>
          <div className={styles.main}>
            {event.photo_url ? (
              <Image src={event.photo_url} alt="" width={1200} height={280} className={styles.hero} />
            ) : (
              <div className={styles.heroPlaceholder} aria-hidden="true">
                📅
              </div>
            )}

            <div className={styles.mainBody}>
              {isCancelled && (
                <Alert classNames={{ root: styles.cancelledAlert, message: styles.alertMessage }}>
                  This event has been cancelled.
                </Alert>
              )}
              {isPast && !isCancelled && (
                <Alert classNames={{ root: styles.pastAlert, message: styles.alertMessage }}>This event has passed.</Alert>
              )}

              <div className={styles.badgeRow}>
                <EventTypeBadge type={event.event_type} />
                {event.is_global && <ScopeBadge isGlobal />}
              </div>

              <h1 className={styles.title}>
                {event.title}
                {isEdited && <span className={styles.editedLabel}> (edited)</span>}
              </h1>

              <div className={styles.infoRow}>
                <IconCalendar size={18} aria-hidden="true" className={styles.infoIcon} />
                <time dateTime={event.start_date}>{formatEventDateLong(event.start_date, event.end_date)}</time>
              </div>

              <div className={styles.infoRow}>
                <IconMapPin size={18} aria-hidden="true" className={styles.infoIcon} />
                <div>
                  <div>{event.location_name}</div>
                  {event.location_address && <div className={styles.infoSubtext}>{event.location_address}</div>}
                </div>
              </div>

              <p className={styles.description}>{event.description}</p>
            </div>
          </div>

          <aside className={styles.sidebar}>
            <EventAttendanceCard
              event={event}
              isOrganizer={isOrganizer}
              blockedBy={getResponseBlock(event, viewer, now)}
              response={detail.response}
              responding={detail.responding}
              onRespond={detail.respond}
              onShowAttendees={handleShowAttendees}
            />

            {event.organizer && (
              <EventOrganizerCard
                organizer={event.organizer}
                canMessage={!isOrganizer && (viewer.trust_level ?? 0) >= TrustLevel.VERIFIED}
                messaging={messaging}
                onMessage={handleMessage}
              />
            )}

            {isOrganizer && (
              <section aria-labelledby={manageTitleId} className={styles.sidebarCard}>
                <h2 id={manageTitleId} className={styles.manageTitle}>
                  Manage event
                </h2>
                <div className={styles.manageActions}>
                  <Button component={Link} href={`/events/create?edit=${event.id}`} variant="light" fullWidth>
                    Edit Event
                  </Button>
                  <Button variant="light" color="orange" fullWidth type="button" onClick={handleCancel}>
                    Cancel Event
                  </Button>
                  <Button variant="light" color="red" fullWidth type="button" onClick={handleDelete}>
                    Delete Event
                  </Button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      <AttendeeList
        opened={attendeesOpen}
        attendees={attendees ?? []}
        loading={attendeesLoading}
        error={attendeesError}
        onRetry={() => void loadAttendees()}
        onClose={() => setAttendeesOpen(false)}
      />
    </>
  );
}
