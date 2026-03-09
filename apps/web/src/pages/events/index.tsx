import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getEventsByMetro,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  TrustLevel,
  type Event,
  type EventType,
} from '@nusa/shared';
import EventCard from '../../components/events/EventCard';
import styles from './events.module.css';

type FilterKey = 'all' | EventType;

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🗓️' },
  ...EVENT_TYPES.map((t) => ({ key: t as FilterKey, label: EVENT_TYPE_LABELS[t], icon: EVENT_TYPE_ICONS[t] })),
];

export default function EventsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [level0BannerVisible, setLevel0BannerVisible] = useState(true);

  const metroId = (user as any)?.metro_area_id ?? '';
  const trustLevel = (user as any)?.trust_level ?? 0;
  const isLevel0 = trustLevel < TrustLevel.VERIFIED;
  const canCreate = !isLevel0;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const fetchEvents = useCallback(async () => {
    if (!metroId) { setLoading(false); return; }
    setError(null);
    const result = await getEventsByMetro(supabase, metroId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setEvents(result.data ?? []);
    }
    setLoading(false);
  }, [metroId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const filtered = activeFilter === 'all'
      ? events
      : events.filter((e) => e.event_type === activeFilter);
    const upcoming: Event[] = [];
    const past: Event[] = [];
    for (const e of filtered) {
      const endOrStart = e.end_date ? new Date(e.end_date) : new Date(e.start_date);
      if (endOrStart >= now) upcoming.push(e);
      else past.push(e);
    }
    return { upcoming, past };
  }, [events, activeFilter]);

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Events - NUSA</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>📅 Events</h1>
            {canCreate && (
              <Link href="/events/create" className={styles.createButton}>
                + Create Event
              </Link>
            )}
          </div>

          {/* Level 0 banner */}
          {isLevel0 && level0BannerVisible && (
            <div className={styles.level0Banner}>
              <span>Verify your account to RSVP and create events.</span>
              <button className={styles.level0BannerClose} onClick={() => setLevel0BannerVisible(false)}>✕</button>
            </div>
          )}

          {/* Mobile filter chips */}
          <div className={styles.mobileFilters}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`${styles.mobileChip} ${activeFilter === f.key ? styles.mobileChipActive : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          <div className={styles.layout}>
            {/* Sidebar (desktop) */}
            <aside className={styles.sidebar}>
              <p className={styles.sidebarTitle}>Filter by Type</p>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`${styles.filterOption} ${activeFilter === f.key ? styles.filterOptionActive : ''}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.icon} {f.label}
                </button>
              ))}
            </aside>

            {/* Feed */}
            <div className={styles.feed}>
              {loading ? (
                <>
                  <div className={styles.skeleton} />
                  <div className={styles.skeleton} />
                  <div className={styles.skeleton} />
                </>
              ) : error ? (
                <div className={styles.errorContainer}>
                  <p className={styles.errorText}>{error}</p>
                  <button className={styles.retryButton} onClick={() => { setLoading(true); fetchEvents(); }}>
                    Retry
                  </button>
                </div>
              ) : upcoming.length === 0 && past.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>📅</span>
                  <h2 className={styles.emptyTitle}>
                    {activeFilter === 'all' ? 'No upcoming events' : `No ${EVENT_TYPE_LABELS[activeFilter as EventType]} events`}
                  </h2>
                  <p className={styles.emptySubtitle}>Check back soon!</p>
                </div>
              ) : (
                <>
                  {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
                  {past.length > 0 && (
                    <>
                      <div className={styles.divider}>Past Events</div>
                      {past.map((e) => <EventCard key={e.id} event={e} past />)}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
