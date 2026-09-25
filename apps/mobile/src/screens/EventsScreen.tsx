import React, { useCallback, useMemo, useState } from 'react';
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
  EVENT_TYPE_LABELS,
  TrustLevel,
  type Event,
  type EventType,
} from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { useMetroEventPages } from '../hooks/useMetroEventPages';
import { EventCard } from '../components/events/EventCard';
import { EventFilterBar, type EventFilterBarValue } from '../components/events/EventFilterBar';
import { colors } from '../styles/colors';
import { spacing, borderRadius } from '../styles/spacing';
import { typography } from '../styles/typography';
import type { EventsStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<EventsStackParamList>;

const DEFAULT_FILTERS: EventFilterBarValue = { type: 'all', query: '' };

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [filters, setFilters] = useState<EventFilterBarValue>(DEFAULT_FILTERS);
  const [level0DismissedBanner, setLevel0DismissedBanner] = useState(false);

  const userId = user?.id ?? null;
  const metroId = user?.metro_area_id ?? '';
  const isLevel0 = (user?.trust_level ?? 0) < TrustLevel.VERIFIED;
  const canCreate = !isLevel0;
  const canInteract = !isLevel0;

  // Upcoming soonest first, then past newest first, paged like web (decision 9).
  const feed = useMetroEventPages(metroId, userId);
  const userResponses = feed.responses;
  const handleResponseChange = feed.respond;

  // The feed arrives split by period against one `now`; the filters stay client-side.
  const { upcoming, past } = useMemo(() => {
    const q = filters.query.toLowerCase().trim();
    const matches = (e: Event) => {
      const matchesType = filters.type === 'all' || e.event_type === filters.type;
      const matchesQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.location_name.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    };
    return { upcoming: feed.upcoming.filter(matches), past: feed.past.filter(matches) };
  }, [feed.upcoming, feed.past, filters]);

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

      {feed.loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.skeletonCard} />
          ))}
        </View>
      ) : feed.error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{feed.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={feed.reload}
            accessibilityRole="button"
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
            // While more pages may hold a match, the list isn't empty yet.
            feed.hasMore || feed.loadingMore || feed.loadMoreError ? null : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>{getEmptyTitle()}</Text>
                <Text style={styles.emptySubtitle}>Check back soon!</Text>
              </View>
            )
          }
          refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} />}
          contentContainerStyle={listData.length === 0 ? styles.flatListEmpty : undefined}
          onEndReached={feed.hasMore ? feed.loadMore : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            feed.loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary.main} />
              </View>
            ) : feed.loadMoreError ? (
              <View style={styles.footerError}>
                <Text style={styles.errorText}>{feed.loadMoreError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={feed.retryLoadMore}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
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
  footerError: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    alignItems: 'center',
  },
});
