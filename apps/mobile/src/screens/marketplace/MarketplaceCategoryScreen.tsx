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
  type MarketplaceCategory,
  type MarketplaceListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { FilterBar, type FilterBarValue } from '../../components/marketplace/FilterBar';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList>;
type Route = RouteProp<MarketplaceStackParamList, 'MarketplaceCategory'>;

const PAGE_SIZE = 20;

export default function MarketplaceCategoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();

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

  const metroId = user?.metro_area_id ?? '';
  const mountedRef = useRef(true);

  useEffect(() => {
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

  const fetchListings = useCallback(
    async (offset = 0, isRefresh = false) => {
      if (!metroId) {
        setLoading(false);
        return;
      }

      try {
        const result = await getListingsByMetro(supabase, metroId, {
          categorySlug: filters.category || undefined,
          searchQuery: filters.query || undefined,
          sortBy: filters.sort,
          limit: PAGE_SIZE,
          offset,
        });

        if (!mountedRef.current) return;

        if (result.data) {
          if (isRefresh || offset === 0) {
            setListings(result.data);
          } else {
            setListings((prev) => [...prev, ...result.data!]);
          }
          setHasMore(result.data.length === PAGE_SIZE);
        }
      } catch {
        // Silently handle — empty listings will surface in the UI.
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [metroId, filters]
  );

  useEffect(() => {
    setLoading(true);
    fetchListings(0, true);
  }, [fetchListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings(0, true);
  }, [fetchListings]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchListings(listings.length);
    }
  }, [loadingMore, hasMore, listings.length, fetchListings]);

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.loadingMore} color={colors.primary.main} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>
                {filters.query ? 'No listings match your search' : 'No listings in this category yet'}
              </Text>
            </View>
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
