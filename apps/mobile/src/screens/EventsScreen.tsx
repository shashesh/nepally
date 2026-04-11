import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { EventCard } from '../components/events/EventCard';
import { EventFilterBar, type EventFilterBarValue } from '../components/events/EventFilterBar';
import { colors } from '../styles/colors';
import { spacing, borderRadius } from '../styles/spacing';
import { typography } from '../styles/typography';
import type { EventsStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<EventsStackParamList>;

const DEFAULT_FILTERS: EventFilterBarValue = { type: 'all', query: '' };
const EVENTS_PAGE_SIZE = 20;

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilterBarValue>(DEFAULT_FILTERS);
  const [level0DismissedBanner, setLevel0DismissedBanner] = useState(false);
  const [userResponses, setUserResponses] = useState<UserEventResponses>({});
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const metroId = user?.metro_area_id ?? '';
  const isLevel0 = (user?.trust_level ?? 0) < TrustLevel.VERIFIED;
  const canCreate = !isLevel0;
  const canInteract = !isLevel0;
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!metroId) {
      setLoading(false);
      return;
    }
    setError(null);
    const result = await getEventsByMetro(supabase, metroId, EVENTS_PAGE_SIZE, 0);
    if (!mountedRef.current) return;
    if (result.error) {
      setError(result.error.message);
      setHasMore(false);
    } else {
      setEvents(result.data ?? []);
      setHasMore(Boolean(result.hasMore));
    }
    setLoading(false);
    setRefreshing(false);
  }, [metroId]);

  const loadMoreEvents = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!metroId || !hasMore || loading || refreshing) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getEventsByMetro(
        supabase,
        metroId,
        EVENTS_PAGE_SIZE,
        events.length
      );
      if (!mountedRef.current) return;
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
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [metroId, hasMore, loading, refreshing, events.length]);

  const fetchUserResponses = useCallback(async () => {
    if (!user?.id) return;
    const result = await getUserEventResponses(supabase, user.id);
    if (!mountedRef.current) return;
    if (!result.error && result.data) {
      setUserResponses(result.data);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchUserResponses();
  }, [fetchUserResponses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  const handleResponseChange = useCallback(
    async (eventId: string, status: RsvpStatus | null) => {
      if (!user?.id) return;

      const previous = userResponses[eventId] ?? null;

      // Optimistic update: update counts and response map immediately
      setUserResponses((prev) => {
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

          // Remove old response counter
          if (previous === 'going') rsvp_count = Math.max(0, rsvp_count - 1);
          if (previous === 'interested') interested_count = Math.max(0, interested_count - 1);

          // Add new response counter
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
        if (!mountedRef.current) return;
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
    [user?.id, userResponses]
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
      if (endOrStart >= now) {
        upcoming.push(e);
      } else {
        past.push(e);
      }
    }
    return { upcoming, past };
  }, [events, filters]);

  const listData = useMemo(() => {
    const items: Array<{ type: 'event'; event: Event; past: boolean } | { type: 'divider' }> = [];
    for (const e of upcoming) {
      items.push({ type: 'event', event: e, past: false });
    }
    if (past.length > 0) {
      items.push({ type: 'divider' });
      for (const e of past) {
        items.push({ type: 'event', event: e, past: true });
      }
    }
    return items;
  }, [upcoming, past]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[0] }) => {
      if (item.type === 'divider') {
        return (
          <View style={styles.divider}>
            <Text style={styles.dividerText}>Past Events</Text>
          </View>
        );
      }
      return (
        <EventCard
          event={item.event}
          past={item.past}
          userResponse={userResponses[item.event.id] ?? null}
          canInteract={canInteract}
          onResponseChange={handleResponseChange}
        />
      );
    },
    [userResponses, canInteract, handleResponseChange]
  );

  const renderHeader = useCallback(() =>
    isLevel0 && !level0DismissedBanner ? (
      <View style={styles.level0Banner}>
        <Text style={styles.level0BannerText}>
          Verify your account to RSVP and create events.
        </Text>
        <TouchableOpacity onPress={() => setLevel0DismissedBanner(true)}>
          <Text style={styles.level0BannerDismiss}>✕</Text>
        </TouchableOpacity>
      </View>
    ) : null,
    [isLevel0, level0DismissedBanner]
  );

  const getEmptyTitle = () => {
    if (filters.query) return `No events matching "${filters.query}"`;
    if (filters.type !== 'all') return `No ${EVENT_TYPE_LABELS[filters.type as EventType]} events`;
    return 'No upcoming events';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        {canCreate ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateEvent', undefined)}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <EventFilterBar value={filters} onChange={setFilters} />

      {loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.skeletonCard} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchEvents();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) =>
            item.type === 'divider' ? `divider-${index}` : item.event.id
          }
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>{getEmptyTitle()}</Text>
              <Text style={styles.emptySubtitle}>Check back soon!</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={listData.length === 0 ? styles.flatListEmpty : undefined}
          onEndReached={loadMoreEvents}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary.main} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  createButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  level0Banner: {
    backgroundColor: colors.banner.level0.background,
    paddingHorizontal: spacing.s,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  level0BannerText: {
    color: colors.banner.level0.text,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  level0BannerDismiss: {
    color: colors.banner.level0.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  divider: {
    paddingHorizontal: spacing.s,
    paddingTop: spacing.m,
    paddingBottom: spacing.xs / 2,
  },
  dividerText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loadingContainer: {
    paddingHorizontal: spacing.s,
    paddingTop: spacing.s,
    gap: 8,
  },
  skeletonCard: {
    height: 240,
    backgroundColor: colors.border,
    borderRadius: 12,
    opacity: 0.5,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  retryButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: borderRadius.button,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.l,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.s,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  flatListEmpty: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
});
