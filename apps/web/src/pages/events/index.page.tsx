import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button } from '@mantine/core';
import { IconCalendar, IconPlus } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { EVENT_TYPE_LABELS, TrustLevel, type Event, type EventType } from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { useEventFeed } from '../../hooks/useEventFeed';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import EventCard from '../../components/events/EventCard';
import { EventFilterBar, type EventFilterBarValue } from '../../components/events/EventFilterBar';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import styles from './events.module.css';

const DEFAULT_FILTERS: EventFilterBarValue = { type: 'all', query: '' };

function matchesFilters(event: Event, filters: EventFilterBarValue): boolean {
  const query = filters.query.toLowerCase().trim();
  const matchesType = filters.type === 'all' || event.event_type === filters.type;
  const matchesQuery =
    !query ||
    event.title.toLowerCase().includes(query) ||
    event.location_name.toLowerCase().includes(query);
  return matchesType && matchesQuery;
}

function getEmptyTitle(filters: EventFilterBarValue): string {
  if (filters.query) return `No events matching "${filters.query}"`;
  if (filters.type !== 'all') return `No ${EVENT_TYPE_LABELS[filters.type as EventType]} events`;
  return 'No upcoming events';
}

export default function EventsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [filters, setFilters] = useState<EventFilterBarValue>(DEFAULT_FILTERS);
  const [level0BannerVisible, setLevel0BannerVisible] = useState(true);

  const userId = user?.id ?? null;
  const metroId = user?.metro_area_id || null;
  const isLevel0 = (user?.trust_level ?? 0) < TrustLevel.VERIFIED;

  const feed = useEventFeed(metroId, userId);
  const { hasMore, loading, loadingMore, loadMore } = feed;
  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadMore,
  });

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  // The filters run over the pages loaded so far; the sentinel stays mounted
  // while they show nothing, so paging continues until a match loads (decision 3).
  const upcoming = useMemo(() => feed.upcoming.filter((e) => matchesFilters(e, filters)), [feed.upcoming, filters]);
  const past = useMemo(() => feed.past.filter((e) => matchesFilters(e, filters)), [feed.past, filters]);
  const isEmpty = upcoming.length === 0 && past.length === 0;

  if (!user) return null;

  const renderSection = (id: string, title: string, events: Event[], isPast: boolean) => (
    <section aria-labelledby={id} className={styles.section}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      <ul className={styles.grid}>
        {events.map((event) => (
          <li key={event.id}>
            <EventCard
              event={event}
              past={isPast}
              response={feed.responses[event.id] ?? null}
              canRespond={!isLevel0}
              busy={feed.pending.has(event.id)}
              onRespond={feed.respond}
            />
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      <Head>
        <title>Events - Nepally</title>
      </Head>
      <div className={styles.container}>
        <PageHeader
          title="Events"
          actions={
            isLevel0 ? undefined : (
              <Button component={Link} href="/events/create" leftSection={<IconPlus size={16} aria-hidden="true" />}>
                Create event
              </Button>
            )
          }
        />

        {isLevel0 && level0BannerVisible && (
          <Alert
            className={styles.level0Banner}
            withCloseButton
            closeButtonLabel="Dismiss banner"
            onClose={() => setLevel0BannerVisible(false)}
          >
            Verify your account to respond to events and create them.
          </Alert>
        )}

        <EventFilterBar value={filters} onChange={setFilters} />

        {loading ? (
          <LoadingState variant="card" count={6} label="Loading events…" />
        ) : feed.error ? (
          <ErrorState title="Couldn't load events" message={feed.error} onRetry={feed.reload} />
        ) : (
          <>
            {upcoming.length > 0 && renderSection('events-upcoming', 'Upcoming', upcoming, false)}
            {past.length > 0 && renderSection('events-past', 'Past events', past, true)}
            {isEmpty && !hasMore && !loadingMore && !feed.loadMoreError && (
              <EmptyState icon={<IconCalendar size={40} />} title={getEmptyTitle(filters)} description="Check back soon!" />
            )}
            {hasMore && <div ref={sentinelRef} className={styles.loadSentinel} aria-hidden="true" />}
            {loadingMore && <LoadingState variant="card" count={1} label="Loading more events…" />}
            {feed.loadMoreError && (
              <ErrorState
                title="Couldn't load more events"
                message={feed.loadMoreError}
                onRetry={feed.retryLoadMore}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
