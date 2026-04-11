import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  getCategories,
  getFeaturedListings,
  getListingsByMetro,
  getTrendingListings,
  getStickyBusinessListings,
  TrustLevel,
  type MarketplaceCategory,
  type MarketplaceListing,
  type SponsoredListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { FilterBar, type FilterBarValue } from '../../components/marketplace/FilterBar';
import { ListingStrip } from '../../components/marketplace/ListingStrip';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList>;

const STRIP_LIMIT = 10;
const GRID_LIMIT = 20;

const DEFAULT_FILTERS: FilterBarValue = {
  category: '',
  sort: 'newest',
  query: '',
};

export default function MarketplaceHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [filters, setFilters] = useState<FilterBarValue>(DEFAULT_FILTERS);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [featured, setFeatured] = useState<MarketplaceListing[]>([]);
  const [recent, setRecent] = useState<MarketplaceListing[]>([]);
  const [trending, setTrending] = useState<MarketplaceListing[]>([]);
  const [allListings, setAllListings] = useState<MarketplaceListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [sponsoredListings, setSponsoredListings] = useState<SponsoredListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMoreAll, setHasMoreAll] = useState(false);
  const [hasMoreFiltered, setHasMoreFiltered] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const metroId = user?.metro_area_id ?? '';
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;
  const mountedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      setFilters(DEFAULT_FILTERS);
    }, [])
  );

  const isFiltered = useMemo(
    () =>
      Boolean(filters.category) ||
      filters.sort !== 'newest' ||
      Boolean(filters.query),
    [filters]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchHomeData = useCallback(async () => {
    if (!metroId) {
      setLoading(false);
      return;
    }
    try {
      const [catResult, featuredResult, recentResult, trendingResult, allResult, sponsoredResult] =
        await Promise.all([
          getCategories(supabase),
          getFeaturedListings(supabase, metroId, { limit: STRIP_LIMIT }),
          getListingsByMetro(supabase, metroId, { limit: STRIP_LIMIT, sortBy: 'newest' }),
          getTrendingListings(supabase, metroId, { limit: STRIP_LIMIT }),
          getListingsByMetro(supabase, metroId, { limit: GRID_LIMIT }),
          getStickyBusinessListings(supabase, metroId, { limit: 5 }),
        ]);

      if (!mountedRef.current) return;

      if (catResult.data) setCategories(catResult.data);
      if (featuredResult.data) setFeatured(featuredResult.data);
      if (recentResult.data) setRecent(recentResult.data);
      if (trendingResult.data) setTrending(trendingResult.data);
      if (allResult.data) {
        setAllListings(allResult.data);
        setHasMoreAll(Boolean(allResult.hasMore));
      } else {
        setHasMoreAll(false);
      }
      if (sponsoredResult.data) setSponsoredListings(sponsoredResult.data);
    } catch {
      // Silently handle — empty state will surface in the UI.
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [metroId]);

  const fetchFiltered = useCallback(async () => {
    if (!metroId) return;
    try {
      const result = await getListingsByMetro(supabase, metroId, {
        categorySlug: filters.category || undefined,
        searchQuery: filters.query || undefined,
        sortBy: filters.sort,
        limit: GRID_LIMIT,
        offset: 0,
      });
      if (!mountedRef.current) return;
      if (result.data) {
        setFilteredListings(result.data);
        setHasMoreFiltered(Boolean(result.hasMore));
      } else {
        setHasMoreFiltered(false);
      }
    } catch {
      // Silently handle.
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [metroId, filters]);

  const loadMoreListings = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!metroId || loading || refreshing) return;

    const currentList = isFiltered ? filteredListings : allListings;
    const hasMore = isFiltered ? hasMoreFiltered : hasMoreAll;
    if (!hasMore) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getListingsByMetro(supabase, metroId, {
        categorySlug: isFiltered ? (filters.category || undefined) : undefined,
        searchQuery: isFiltered ? (filters.query || undefined) : undefined,
        sortBy: isFiltered ? filters.sort : 'newest',
        limit: GRID_LIMIT,
        offset: currentList.length,
      });
      if (!mountedRef.current) return;
      if (result.data) {
        const appender = (prev: MarketplaceListing[]) => {
          const seen = new Set(prev.map((l) => l.id));
          const next = [...prev];
          for (const l of result.data!) {
            if (!seen.has(l.id)) next.push(l);
          }
          return next;
        };
        if (isFiltered) {
          setFilteredListings(appender);
          setHasMoreFiltered(Boolean(result.hasMore));
        } else {
          setAllListings(appender);
          setHasMoreAll(Boolean(result.hasMore));
        }
      } else {
        if (isFiltered) setHasMoreFiltered(false);
        else setHasMoreAll(false);
      }
    } finally {
      loadingMoreRef.current = false;
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [
    metroId,
    loading,
    refreshing,
    isFiltered,
    filteredListings,
    allListings,
    hasMoreFiltered,
    hasMoreAll,
    filters,
  ]);

  useEffect(() => {
    setLoading(true);
    if (isFiltered) {
      fetchFiltered();
    } else {
      fetchHomeData();
    }
  }, [isFiltered, fetchFiltered, fetchHomeData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (isFiltered) {
      fetchFiltered();
    } else {
      fetchHomeData();
    }
  }, [isFiltered, fetchFiltered, fetchHomeData]);

  const handleItemPress = useCallback(
    (listing: MarketplaceListing) => {
      navigation.navigate('ListingDetail', { listingId: listing.id });
    },
    [navigation]
  );

  const handleShowAll = useCallback(
    (sortBy: FilterBarValue['sort']) => {
      setFilters({ category: '', sort: sortBy, query: '' });
    },
    []
  );

  const onShowAllFeatured = useCallback(() => handleShowAll('featured'), [handleShowAll]);
  const onShowAllNewest = useCallback(() => handleShowAll('newest'), [handleShowAll]);
  // Trending uses newest sort; the server already orders by trending_score for the strip
  const onShowAllTrending = useCallback(() => handleShowAll('newest'), [handleShowAll]);

  const renderListingItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => (
      <ListingCard listing={item} onPress={() => handleItemPress(item)} />
    ),
    [handleItemPress]
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Marketplace</Text>
        </View>
        <FilterBar categories={categories} value={filters} onChange={setFilters} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  const gridData = isFiltered ? filteredListings : allListings;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <View style={styles.headerActions}>
          {canCreate && (
            <TouchableOpacity
              style={styles.myListingsButton}
              onPress={() => navigation.navigate('MyListings')}
              accessibilityLabel="My Listings"
            >
              <Ionicons name="list-outline" size={22} color={colors.primary.main} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FilterBar categories={categories} value={filters} onChange={setFilters} />

      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id}
        renderItem={renderListingItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          isFiltered ? (
            <TouchableOpacity
              style={styles.backToHome}
              onPress={() => setFilters(DEFAULT_FILTERS)}
              accessibilityLabel="Back to Marketplace"
            >
              <Ionicons name="chevron-back" size={16} color={colors.primary.main} />
              <Text style={styles.backToHomeText}>Back to Marketplace</Text>
            </TouchableOpacity>
          ) : (
            <>
              {sponsoredListings.length > 0 && (
                <ListingStrip
                  title="Sponsored"
                  titleIcon="📢"
                  listings={sponsoredListings.map((s) => s.listing)}
                  onItemPress={handleItemPress}
                  onShowAll={() => {}}
                  maxItems={5}
                />
              )}
              <ListingStrip
                title="Featured"
                titleIcon="⭐"
                listings={featured}
                onItemPress={handleItemPress}
                onShowAll={onShowAllFeatured}
                maxItems={STRIP_LIMIT}
              />
              <ListingStrip
                title="Recently Added"
                titleIcon="🆕"
                listings={recent}
                onItemPress={handleItemPress}
                onShowAll={onShowAllNewest}
                maxItems={STRIP_LIMIT}
              />
              <ListingStrip
                title="Trending"
                titleIcon="🔥"
                listings={trending}
                onItemPress={handleItemPress}
                onShowAll={onShowAllTrending}
                maxItems={STRIP_LIMIT}
              />
              {allListings.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>All Listings</Text>
                </View>
              )}
            </>
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>
              {isFiltered ? 'No listings match your filters' : 'No listings in your area yet'}
            </Text>
            {!isFiltered && canCreate && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateListing')}
              >
                <Text style={styles.createButtonText}>Create the first listing</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        onEndReached={loadMoreListings}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : null
        }
      />

      {/* FAB */}
      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateListing')}
          activeOpacity={0.8}
          accessibilityLabel="Create listing"
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backToHome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },
  backToHomeText: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '500',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  myListingsButton: {
    padding: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.m,
    paddingBottom: 80,
  },
  footerLoader: {
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  sectionHeader: {
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
    marginHorizontal: -spacing.m,
    paddingHorizontal: spacing.m,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.m,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  createButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.input,
  },
  createButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.m,
    bottom: spacing.m,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});
