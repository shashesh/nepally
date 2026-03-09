import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getEventsByMetro,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  TrustLevel,
  type Event,
  type EventType,
} from '@nusa/shared';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { EventCard } from '../components/events/EventCard';
import { colors } from '../styles/colors';
import { spacing, borderRadius } from '../styles/spacing';
import { typography } from '../styles/typography';
import type { EventsStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<EventsStackParamList>;

type FilterChip = 'all' | EventType;

const FILTER_CHIPS: { key: FilterChip; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🗓️' },
  ...EVENT_TYPES.map((t) => ({ key: t as FilterChip, label: EVENT_TYPE_LABELS[t], icon: EVENT_TYPE_ICONS[t] })),
];

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [level0DismissedBanner, setLevel0DismissedBanner] = useState(false);

  const metroId = user?.metro_area_id ?? '';
  const isLevel0 = (user?.trust_level ?? 0) < TrustLevel.VERIFIED;
  const canCreate = !isLevel0;

  const fetchEvents = useCallback(async () => {
    if (!metroId) {
      setLoading(false);
      return;
    }
    setError(null);
    const result = await getEventsByMetro(supabase, metroId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setEvents(result.data ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [metroId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  const now = new Date();

  const { upcoming, past } = useMemo(() => {
    const filtered =
      activeFilter === 'all'
        ? events
        : events.filter((e) => e.event_type === activeFilter);

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
  }, [events, activeFilter]);

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
      return <EventCard event={item.event} past={item.past} />;
    },
    []
  );

  const renderHeader = () => (
    <>
      {/* Level 0 banner */}
      {isLevel0 && !level0DismissedBanner && (
        <View style={styles.level0Banner}>
          <Text style={styles.level0BannerText}>
            Verify your phone to RSVP and create events.
          </Text>
          <TouchableOpacity onPress={() => setLevel0DismissedBanner(true)}>
            <Text style={styles.level0BannerDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTER_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.key}
            style={[styles.chip, activeFilter === chip.key && styles.chipActive]}
            onPress={() => setActiveFilter(chip.key)}
          >
            <Text style={[styles.chipText, activeFilter === chip.key && styles.chipTextActive]}>
              {chip.icon} {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyTitle}>
          {activeFilter === 'all'
            ? 'No upcoming events'
            : `No ${EVENT_TYPE_LABELS[activeFilter as EventType]} events`}
        </Text>
        <Text style={styles.emptySubtitle}>Check back soon!</Text>
      </View>
    );
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

      {loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.skeletonCard} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchEvents(); }}>
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
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={listData.length === 0 ? styles.flatListEmpty : undefined}
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
  filterScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  chipText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
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
    height: 90,
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
});
