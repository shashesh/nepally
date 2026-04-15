import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  TrustLevel,
  getCategories,
  getFeaturedListings,
  getListingsByMetro,
  getStickyBusinessListings,
  getTrendingListings,
  getUserSavedListingIds,
  saveListing,
  unsaveListing,
  type MarketplaceCategory,
  type MarketplaceListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmAccent, warmBorder, warmSurface } from '../../styles/warmTokens';
import { ListingGridCard } from '../../components/marketplace/ListingGridCard';
import { ListingGridCardSkeleton } from '../../components/marketplace/ListingGridCardSkeleton';
import { MarketplaceSearchBar } from '../../components/marketplace/MarketplaceSearchBar';
import { CategoryTileRow } from '../../components/marketplace/CategoryTileRow';
import { MarketplaceTabs, type MarketplaceTabKey } from '../../components/marketplace/MarketplaceTabs';
import { MarketplaceMenuSheet, type MarketplaceMenuKey } from '../../components/marketplace/MarketplaceMenuSheet';
import { MarketplaceEmptyState } from '../../components/marketplace/MarketplaceEmptyState';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'MarketplaceHome'>;

const GRID_LIMIT = 20;
const GUTTER = 12;
const CARD_WIDTH = Math.floor((Dimensions.get('window').width - GUTTER * 3) / 2);
const SEARCH_DEBOUNCE_MS = 300;

export default function MarketplaceHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const metroId = user?.metro_area_id ?? '';
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [activeTab, setActiveTab] = useState<MarketplaceTabKey>('sponsored');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const mountedRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load categories and saved-ids once per user/metro
  useEffect(() => {
    if (!metroId) return;
    (async () => {
      const [cats, ids] = await Promise.all([
        getCategories(supabase),
        user ? getUserSavedListingIds(supabase, user.id) : Promise.resolve({ data: [] as string[] }),
      ]);
      if (!mountedRef.current) return;
      if (cats.data) setCategories(cats.data);
      if (ids.data) setSavedIds(new Set(ids.data));
    })();
  }, [metroId, user]);

  // Load grid whenever tab / category / searchQuery / metro changes
  const fetchGrid = useCallback(async () => {
    if (!metroId) {
      setLoading(false);
      return;
    }
    try {
      // Filter fallback: any active search or category filter always uses
      // getListingsByMetro, because the curated endpoints (sponsored / featured /
      // trending) don't accept filters. The sort key tracks the active tab so
      // the tab's semantic stays intact even when filtered.
      if (selectedCategory || searchQuery) {
        const filterSort = activeTab === 'featured' ? 'featured' : 'newest';
        const result = await getListingsByMetro(supabase, metroId, {
          categorySlug: selectedCategory || undefined,
          searchQuery: searchQuery || undefined,
          sortBy: filterSort,
          limit: GRID_LIMIT,
          offset: 0,
        });
        if (!mountedRef.current) return;
        setListings(result.data ?? []);
        setHasMore(Boolean(result.hasMore));
        return;
      }

      // Tab routing — each tab has its own source of truth.
      switch (activeTab) {
        case 'sponsored': {
          const result = await getStickyBusinessListings(supabase, metroId, { limit: GRID_LIMIT });
          if (!mountedRef.current) return;
          const flattened = (result.data ?? []).map((s) => s.listing);
          setListings(flattened);
          setHasMore(false);
          return;
        }
        case 'featured': {
          const result = await getFeaturedListings(supabase, metroId, { limit: GRID_LIMIT });
          if (!mountedRef.current) return;
          setListings(result.data ?? []);
          setHasMore(false);
          return;
        }
        case 'trending': {
          const result = await getTrendingListings(supabase, metroId, { limit: GRID_LIMIT });
          if (!mountedRef.current) return;
          setListings(result.data ?? []);
          setHasMore(false);
          return;
        }
        case 'all': {
          const result = await getListingsByMetro(supabase, metroId, {
            sortBy: 'newest',
            limit: GRID_LIMIT,
            offset: 0,
          });
          if (!mountedRef.current) return;
          setListings(result.data ?? []);
          setHasMore(Boolean(result.hasMore));
          return;
        }
      }
    } catch {
      if (mountedRef.current) {
        setListings([]);
        setHasMore(false);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [metroId, activeTab, selectedCategory, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchGrid();
    }, [fetchGrid])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGrid();
  }, [fetchGrid]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || !metroId) return;
    // Pagination only applies to the 'all' tab and the filtered fallback path.
    // Curated tabs (sponsored / featured / trending) are fixed top-N lists.
    const isPaginatedPath = selectedCategory || searchQuery || activeTab === 'all';
    if (!isPaginatedPath) return;
    loadingMoreRef.current = true;
    try {
      const filterSort = activeTab === 'featured' ? 'featured' : 'newest';
      const result = await getListingsByMetro(supabase, metroId, {
        categorySlug: selectedCategory || undefined,
        searchQuery: searchQuery || undefined,
        sortBy: filterSort,
        limit: GRID_LIMIT,
        offset: listings.length,
      });
      if (!mountedRef.current) return;
      if (result.data) {
        setListings((prev) => {
          const seen = new Set(prev.map((l) => l.id));
          return [...prev, ...result.data!.filter((l) => !seen.has(l.id))];
        });
        setHasMore(Boolean(result.hasMore));
      }
    } finally {
      loadingMoreRef.current = false;
    }
  }, [listings.length, metroId, selectedCategory, searchQuery, hasMore, activeTab]);

  const handleCardPress = useCallback(
    (listing: MarketplaceListing) => {
      navigation.navigate('ListingDetail', { listingId: listing.id });
    },
    [navigation]
  );

  const handleToggleSave = useCallback(
    async (listingId: string) => {
      const wasSaved = savedIds.has(listingId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      if (wasSaved) {
        await unsaveListing(supabase, listingId);
      } else {
        await saveListing(supabase, listingId);
      }
    },
    [savedIds]
  );

  const handleMenuSelect = useCallback(
    (key: MarketplaceMenuKey) => {
      switch (key) {
        case 'my-listings':
          navigation.navigate('MyListings');
          break;
        case 'saved':
          navigation.navigate('SavedListings');
          break;
        case 'promote':
          navigation.navigate('MyListings');
          break;
        case 'browse-categories':
          navigation.navigate('BrowseCategories');
          break;
        case 'change-location': {
          // Cross-stack navigation: location is managed in the Home stack.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parent = navigation.getParent() as any;
          parent?.navigate('Home', { screen: 'ManageLocations' });
          break;
        }
        case 'rules':
          navigation.navigate('MarketplaceRules');
          break;
      }
    },
    [navigation]
  );

  const gridData = listings;

  const renderGridItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => (
      <ListingGridCard
        listing={item}
        width={CARD_WIDTH}
        onPress={() => handleCardPress(item)}
        isSaved={savedIds.has(item.id)}
        onToggleSave={handleToggleSave}
      />
    ),
    [handleCardPress, handleToggleSave, savedIds]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        <MarketplaceSearchBar value={searchInput} onChangeText={setSearchInput} />
        <CategoryTileRow
          categories={categories}
          selectedSlug={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <MarketplaceTabs active={activeTab} onChange={setActiveTab} />
      </View>
    ),
    [categories, selectedCategory, activeTab, searchInput]
  );

  const emptyVariant = searchQuery
    ? 'empty-search'
    : selectedCategory
    ? 'empty-category'
    : 'empty-metro';

  const handleEmptyPrimary = useCallback(() => {
    if (emptyVariant === 'empty-search') {
      setSearchInput('');
      setSelectedCategory('');
      return;
    }
    if (emptyVariant === 'empty-category') {
      setSelectedCategory('');
      return;
    }
    if (canCreate) navigation.navigate('CreateListing');
  }, [emptyVariant, canCreate, navigation]);

  const handleEmptySecondary = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingGridCardSkeleton key={i} width={CARD_WIDTH} />
          ))}
        </View>
      );
    }
    return (
      <MarketplaceEmptyState
        variant={emptyVariant}
        hidePrimary={!canCreate && emptyVariant === 'empty-metro'}
        onPrimary={handleEmptyPrimary}
        onSecondary={emptyVariant === 'empty-metro' ? handleEmptySecondary : undefined}
      />
    );
  }, [loading, emptyVariant, canCreate, handleEmptyPrimary, handleEmptySecondary]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('SavedListings')}
            accessibilityLabel="Open saved listings"
          >
            <Ionicons name="heart-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="Open marketplace menu"
          >
            <Ionicons name="menu-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={loading ? [] : gridData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderGridItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[warmAccent.warm]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateListing')}
          accessibilityLabel="Create listing"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <MarketplaceMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSelect={handleMenuSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: warmSurface.canvas,
  },
  header: {
    backgroundColor: warmSurface.canvas,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: warmBorder.hairline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: 96,
    gap: GUTTER,
  },
  row: {
    gap: GUTTER,
    marginBottom: GUTTER,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GUTTER,
    paddingTop: GUTTER,
  },
  fab: {
    position: 'absolute',
    right: spacing.s,
    bottom: spacing.s,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: warmAccent.warm,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});
