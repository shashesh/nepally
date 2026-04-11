import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Skeleton, Text } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getEventsByMetro,
  getUserEventResponses,
  setEventResponse,
  removeEventResponse,
  EVENT_TYPE_LABELS,
  TrustLevel,
  type Event,
  type EventType,
  type RsvpStatus,
  type UserEventResponses,
} from '@nepally/shared';
import EventCard from '../../components/events/EventCard';
import { EventFilterBar, type EventFilterBarValue } from '../../components/events/EventFilterBar';
import styles from './events.module.css';

const DEFAULT_FILTERS: EventFilterBarValue = { type: 'all', query: '' };
const EVENTS_PAGE_SIZE = 20;

export default function EventsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilterBarValue>(DEFAULT_FILTERS);
  const [level0BannerVisible, setLevel0BannerVisible] = useState(true);
  const [userResponses, setUserResponses] = useState<UserEventResponses>({});
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const loadSentinelRef = useRef<HTMLDivElement | null>(null);

  const metroId = user?.metro_area_id ?? '';
  const trustLevel = user?.trust_level ?? 0;
  const isLevel0 = trustLevel < TrustLevel.VERIFIED;
  const canCreate = !isLevel0;
  const canInteract = !isLevel0;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const fetchAll = useCallback(async () => {
    if (!metroId) { setLoading(false); return; }
    setError(null);
    const [eventsRes, responsesRes] = await Promise.all([
      getEventsByMetro(supabase, metroId, EVENTS_PAGE_SIZE, 0),
      user?.id ? getUserEventResponses(supabase, user.id) : Promise.resolve({ data: {} as UserEventResponses, error: undefined }),
    ]);
    if (eventsRes.error) {
      setError(eventsRes.error.message);
      setHasMore(false);
    } else {
      setEvents(eventsRes.data ?? []);
      setHasMore(Boolean(eventsRes.hasMore));
    }
    if (!responsesRes.error && responsesRes.data) {
      setUserResponses(responsesRes.data);
    }
    setLoading(false);
  }, [metroId, user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const loadMoreEvents = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!metroId || !hasMore || loading) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getEventsByMetro(
        supabase,
        metroId,
        EVENTS_PAGE_SIZE,
        events.length
      );
      if (result.data) {
        setEvents((prev) => {
          const seen = new Set(prev.map((e) => e.id));
          const next = [...prev];
          for (const e of result.data!) {
            if (!seen.has(e.id)) next.push(e);
          }
          return next;
        });
        setHasMore(Boolean(result.hasMore));
      } else {
        setHasMore(false);
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [metroId, hasMore, loading, events.length]);

  useEffect(() => {
    const node = loadSentinelRef.current;
    if (!node) return;
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreEvents();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMoreEvents]);

  const handleResponseChange = useCallback(
    async (eventId: string, status: RsvpStatus | null) => {
      if (!user?.id) return;

      // Capture previous atomically inside the updater — removes userResponses from deps
      // so this callback is stable and doesn't cause all EventCards to re-render on each RSVP.
      let previous: RsvpStatus | null = null;
      setUserResponses((prev) => {
        previous = prev[eventId] ?? null;
        const next = { ...prev };
        if (status === null) {
          delete next[eventId];
        } else {
          next[eventId] = status;
        }
        return next;
      });

      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          let { rsvp_count, interested_count } = e;
          if (previous === 'going') rsvp_count = Math.max(0, rsvp_count - 1);
          if (previous === 'interested') interested_count = Math.max(0, interested_count - 1);
          if (status === 'going') rsvp_count += 1;
          if (status === 'interested') interested_count += 1;
          return { ...e, rsvp_count, interested_count };
        })
      );

      // Persist to DB
      const result = status === null
        ? await removeEventResponse(supabase, eventId, user.id)
        : await setEventResponse(supabase, eventId, user.id, status);

      if (result.error) {
        // Roll back on failure
        setUserResponses((prev) => {
          const next = { ...prev };
          if (previous === null) {
            delete next[eventId];
          } else {
            next[eventId] = previous;
          }
          return next;
        });
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id !== eventId) return e;
            let { rsvp_count, interested_count } = e;
            if (status === 'going') rsvp_count = Math.max(0, rsvp_count - 1);
            if (status === 'interested') interested_count = Math.max(0, interested_count - 1);
            if (previous === 'going') rsvp_count += 1;
            if (previous === 'interested') interested_count += 1;
            return { ...e, rsvp_count, interested_count };
          })
        );
      }
    },
    [user?.id]
  );

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const q = filters.query.toLowerCase().trim();

    const filtered = events.filter((e) => {
      const matchesType = filters.type === 'all' || e.event_type === filters.type;
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.location_name.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });

    const upcoming: Event[] = [];
    const past: Event[] = [];
    for (const e of filtered) {
      const endOrStart = e.end_date ? new Date(e.end_date) : new Date(e.start_date);
      if (endOrStart >= now) upcoming.push(e);
      else past.push(e);
    }
    return { upcoming, past };
  }, [events, filters]);

  const getEmptyTitle = () => {
    if (filters.query) return `No events matching "${filters.query}"`;
    if (filters.type !== 'all') return `No ${EVENT_TYPE_LABELS[filters.type as EventType]} events`;
    return 'No upcoming events';
  };

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Events - Nepally</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>📅 Events</h1>
            {canCreate && (
              <Button component={Link} href="/events/create">
                + Create Event
              </Button>
            )}
          </div>

          {/* Level 0 banner */}
          {isLevel0 && level0BannerVisible && (
            <div className={styles.level0Banner}>
              <span>Verify your account to RSVP and create events.</span>
              <button
                type="button"
                className={styles.level0BannerClose}
                onClick={() => setLevel0BannerVisible(false)}
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          )}

          <EventFilterBar value={filters} onChange={setFilters} />

          {/* Feed */}
          <div className={styles.feed}>
            {loading ? (
              <>
                <Skeleton height={280} radius="md" />
                <Skeleton height={280} radius="md" />
                <Skeleton height={280} radius="md" />
                <Skeleton height={280} radius="md" />
                <Skeleton height={280} radius="md" />
                <Skeleton height={280} radius="md" />
              </>
            ) : error ? (
              <div className={`${styles.emptyStateWrapper} ${styles.errorContainer}`}>
                <Text c="red" size="sm">{error}</Text>
                <Button mt="sm" onClick={() => { setLoading(true); fetchAll(); }}>
                  Retry
                </Button>
              </div>
            ) : upcoming.length === 0 && past.length === 0 ? (
              <div className={`${styles.emptyStateWrapper} ${styles.emptyState}`}>
                <span className={styles.emptyIcon}>📅</span>
                <h2 className={styles.emptyTitle}>{getEmptyTitle()}</h2>
                <p className={styles.emptySubtitle}>Check back soon!</p>
              </div>
            ) : (
              <>
                {upcoming.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    userResponse={userResponses[e.id] ?? null}
                    canInteract={canInteract}
                    onResponseChange={handleResponseChange}
                  />
                ))}
                {past.length > 0 && (
                  <>
                    <div className={styles.divider}>Past Events</div>
                    {past.map((e) => (
                      <EventCard
                        key={e.id}
                        event={e}
                        past
                        userResponse={userResponses[e.id] ?? null}
                        canInteract={canInteract}
                        onResponseChange={handleResponseChange}
                      />
                    ))}
                  </>
                )}
                {hasMore && (
                  <div ref={loadSentinelRef} className={styles.loadSentinel} aria-hidden="true" />
                )}
                {loadingMore && (
                  <div className={styles.footerLoader} data-testid="events-loading-more">
                    <Skeleton height={120} radius="md" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
