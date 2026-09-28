import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCategories,
  getListingsByMetro,
  getFeaturedListings,
  userMessage,
  type MarketplaceCategory,
  type MarketplaceListing,
} from '@nepally/shared';
import { useActiveMetro } from '../../hooks/useActiveMetro';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { ListingStrip } from '../../components/marketplace/ListingStrip';
import { FilterBar, type FilterBarValue } from '../../components/marketplace/FilterBar';
import { MarketplaceErrorState } from '../../components/marketplace/MarketplaceErrorState';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList>;
type Route = RouteProp<MarketplaceStackParamList, 'MarketplaceCategory'>;

const PAGE_SIZE = 20;
const LOAD_FAILED = "Couldn't load listings.";
const LOAD_MORE_FAILED = "Couldn't load more listings.";
const REFRESH_FAILED = "Couldn't refresh listings.";

interface ListingsPage {
  listings: MarketplaceListing[];
  featured: MarketplaceListing[];
  hasMore: boolean;
}

/** A fetched page, the failure to show in its place, or nothing (no metro yet). */
type PageResult = { page: ListingsPage } | { error: string } | null;

/** Adds a page, skipping ids already on screen. */
function appendPage(current: MarketplaceListing[], rows: MarketplaceListing[]) {
  const seen = new Set(current.map((listing) => listing.id));
  const fresh = rows.filter((listing) => !seen.has(listing.id));
  return fresh.length ? [...current, ...fresh] : current;
}

export default function MarketplaceCategoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const { categorySlug, categoryName } = route.params;
  const isSearchMode = categorySlug === '__search__';

  const initialQuery = isSearchMode ? categoryName.replace('Search: ', '') : '';
  const [filters, setFilters] = useState<FilterBarValue>({
    category: isSearchMode ? '' : categorySlug,
    sort: 'newest',
    query: initialQuery,
  });
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [featuredListings, setFeaturedListings] = useState<MarketplaceListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // A pull-to-refresh failed while listings were on screen; they stay, and this says so.
  const [refreshError, setRefreshError] = useState<string | null>(null);
  /**
   * Where the next page starts, counted in rows the API consumed: the category
   * filter drops rows after the query, so rows on screen can undercount.
   */
  const [nextOffset, setNextOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // The active location's metro, as on Home and the marketplace home.
  const metroId = useActiveMetro().metroAreaId ?? '';
  const mountedRef = useRef(true);
  // One page request at a time, checked before state catches up with a fast second call.
  const loadingMoreRef = useRef(false);
  // Bumped by each first-page load; a next page requested under an older one is dropped.
  const generationRef = useRef(0);
  // Read when a pull-to-refresh fails: listings on screen stay rather than give way to the error.
  const listingCountRef = useRef(0);

  useEffect(() => {
    listingCountRef.current = listings.length;
  }, [listings]);

  // A new metro / filter set / search mode means a fresh first page: show the
  // full-screen spinner until it lands (adjusted during render, not in an effect).
  const [pageQuery, setPageQuery] = useState({ metroId, filters, isSearchMode });
  if (
    pageQuery.metroId !== metroId ||
    pageQuery.filters !== filters ||
    pageQuery.isSearchMode !== isSearchMode
  ) {
    setPageQuery({ metroId, filters, isSearchMode });
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    setRefreshError(null);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load categories for FilterBar display
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getCategories(supabase);
      if (!cancelled && result.data) setCategories(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleItemPress = useCallback(
    (listing: MarketplaceListing) =>
      navigation.navigate('ListingDetail', { listingId: listing.id }),
    [navigation]
  );

  const fetchPage = useCallback(
    async (offset: number): Promise<PageResult> => {
      if (!metroId) return null;

      const [result, featuredResult] = await Promise.all([
        getListingsByMetro(supabase, metroId, {
          categorySlug: filters.category || undefined,
          searchQuery: filters.query || undefined,
          sortBy: filters.sort,
          limit: PAGE_SIZE,
          offset,
        }),
        offset === 0 && !isSearchMode
          ? getFeaturedListings(supabase, metroId, {
              categorySlug: filters.category || undefined,
              limit: 10,
            })
          : Promise.resolve({ data: [] as MarketplaceListing[] }),
      ]);

      if (result.error) {
        const firstPage = offset === 0;
        return {
          error: userMessage(
            result.error,
            firstPage ? LOAD_FAILED : LOAD_MORE_FAILED,
            firstPage ? 'listings_load_failed' : 'listings_load_more_failed',
            { platform: 'mobile', metroId, category: filters.category, offset }
          ),
        };
      }

      const rows = result.data ?? [];
      return {
        page: {
          listings: rows,
          featured: featuredResult.data ?? [],
          hasMore: result.hasMore ?? rows.length === PAGE_SIZE,
        },
      };
    },
    [metroId, filters, isSearchMode]
  );

  // Applies a first page (or its failure) and clears every first-page indicator.
  const applyFirstPage = useCallback((result: PageResult) => {
    if (result && 'error' in result) {
      setListings([]);
      setFeaturedListings([]);
      setHasMore(false);
      setError(result.error);
    } else if (result) {
      setListings(result.page.listings);
      // Always reset featured state on a fresh fetch. In search mode the parallel
      // fetch short-circuits to an empty array, which clears any stale strip.
      setFeaturedListings(result.page.featured);
      setHasMore(result.page.hasMore);
      setNextOffset(PAGE_SIZE);
      setError(null);
      setRefreshError(null);
    }
    loadingMoreRef.current = false;
    setLoadMoreError(null);
    setLoadingMore(false);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const generation = ++generationRef.current;
    let cancelled = false;
    fetchPage(0).then((result) => {
      if (!cancelled && generation === generationRef.current) applyFirstPage(result);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, applyFirstPage, reloadKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // A page still loading belongs to the old generation and will be dropped
    // without clearing the guard, so clear it here or paging stays stuck.
    loadingMoreRef.current = false;
    setLoadingMore(false);
    const generation = ++generationRef.current;
    const result = await fetchPage(0);
    if (!mountedRef.current || generation !== generationRef.current) return;
    // A failed refresh keeps the listings on screen and says so; with nothing
    // on screen it is the page failing.
    if (result && 'error' in result && listingCountRef.current > 0) {
      setRefreshError(REFRESH_FAILED);
      setRefreshing(false);
      return;
    }
    applyFirstPage(result);
  }, [fetchPage, applyFirstPage]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const requestNextPage = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    const offset = nextOffset;
    const result = await fetchPage(offset);
    if (!mountedRef.current || generation !== generationRef.current) return;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (!result) return;
    if ('error' in result) {
      // Paging stops rather than retrying in a loop while the list end is on screen.
      setLoadMoreError(result.error);
      return;
    }
    setListings((prev) => appendPage(prev, result.page.listings));
    setHasMore(result.page.hasMore);
    setNextOffset((current) => current + PAGE_SIZE);
  }, [fetchPage, nextOffset]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loading || refreshing || loadMoreError) return;
    void requestNextPage();
  }, [hasMore, loading, refreshing, loadMoreError, requestNextPage]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    void requestNextPage();
  }, [requestNextPage]);

  const handleFilterChange = useCallback(
    (next: FilterBarValue) => {
      // In non-search mode, if user chooses a different category, navigate to that category.
      if (!isSearchMode && next.category && next.category !== filters.category) {
        const cat = categories.find((c) => c.slug === next.category);
        if (cat) {
          navigation.navigate('MarketplaceCategory', {
            categorySlug: cat.slug,
            categoryName: cat.name,
          });
          return;
        }
      }
      setFilters(next);
    },
    [isSearchMode, filters.category, categories, navigation]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isSearchMode ? 'Search Results' : categoryName}
        </Text>
      </View>

      <FilterBar
        categories={categories}
        value={filters}
        onChange={handleFilterChange}
        lockedCategory={isSearchMode ? undefined : categorySlug}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            />
          )}
          ListHeaderComponent={
            <>
              {refreshError && (
                <MarketplaceErrorState message={refreshError} onRetry={onRefresh} compact />
              )}
              {!isSearchMode && featuredListings.length > 0 ? (
                <ListingStrip
                  title="Featured"
                  titleIcon="⭐"
                  listings={featuredListings}
                  onItemPress={handleItemPress}
                  maxItems={10}
                />
              ) : null}
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            loadMoreError ? (
              <MarketplaceErrorState message={loadMoreError} onRetry={retryLoadMore} compact />
            ) : loadingMore ? (
              <ActivityIndicator style={styles.loadingMore} color={colors.primary.main} />
            ) : null
          }
          ListEmptyComponent={
            error ? (
              <MarketplaceErrorState message={error} onRetry={reload} />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>
                  {filters.query ? 'No listings match your search' : 'No listings in this category yet'}
                </Text>
              </View>
            )
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.xl,
  },
  loadingMore: {
    paddingVertical: spacing.m,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.m,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
