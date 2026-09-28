import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  TrustLevel,
  getCategories,
  type MarketplaceCategory,
  type MarketplaceListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed';
import { useSavedListingIds } from '../../hooks/useSavedListingIds';
import { useActiveMetro } from '../../hooks/useActiveMetro';
import { useGridCardWidth } from '../../hooks/useGridCardWidth';
import { useRefocusEffect } from '../../hooks/useRefocusEffect';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmAccent, warmBorder, warmSurface } from '../../styles/warmTokens';
import { ListingGridCard } from '../../components/marketplace/ListingGridCard';
import { ListingGridCardSkeleton } from '../../components/marketplace/ListingGridCardSkeleton';
import { ListingStrip } from '../../components/marketplace/ListingStrip';
import { MarketplaceSearchBar } from '../../components/marketplace/MarketplaceSearchBar';
import { CategoryTileRow } from '../../components/marketplace/CategoryTileRow';
import { MarketplaceMenuSheet, type MarketplaceMenuKey } from '../../components/marketplace/MarketplaceMenuSheet';
import { MarketplaceEmptyState } from '../../components/marketplace/MarketplaceEmptyState';
import { MarketplaceErrorState } from '../../components/marketplace/MarketplaceErrorState';
import { ActiveLocationSwitcher } from '../../components/location/ActiveLocationSwitcher';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'MarketplaceHome'>;

const GUTTER = 12;
const SEARCH_DEBOUNCE_MS = 300;
const SPONSORED_STRIP_MAX = 5;

export default function MarketplaceHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  // The active location's metro, as on Home, so switching location switches the marketplace too.
  const { metroAreaId, metroName } = useActiveMetro();
  const metroId = metroAreaId ?? '';
  const [locationSwitcherVisible, setLocationSwitcherVisible] = useState(false);
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const feed = useMarketplaceFeed(metroId, { categorySlug: selectedCategory, searchQuery });
  const { savedIds, toggle: handleToggleSave, reload: reloadSavedIds } = useSavedListingIds(user?.id);
  const filtered = Boolean(selectedCategory || searchQuery);
  const cardWidth = useGridCardWidth(GUTTER);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    void getCategories(supabase).then((result) => {
      if (!cancelled && result.data) setCategories(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Read through a ref so the focus effect doesn't re-run each time the feed's
  // busy state changes the callback's identity.
  const revalidateRef = useRef(feed.revalidate);
  useEffect(() => {
    revalidateRef.current = feed.revalidate;
  });

  // Coming back (from a listing, the create form, another tab) refreshes quietly:
  // no skeleton, same scroll position. Saved hearts may have changed elsewhere.
  // The first focus is the first load, which the hooks already do.
  useRefocusEffect(
    useCallback(() => {
      void reloadSavedIds();
      revalidateRef.current();
    }, [reloadSavedIds])
  );

  const handleCardPress = useCallback(
    (listing: MarketplaceListing) => {
      navigation.navigate('ListingDetail', { listingId: listing.id });
    },
    [navigation]
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
        case 'browse-categories':
          navigation.navigate('BrowseCategories');
          break;
        case 'change-location':
          // In place, rather than jumping to the Home tab's location screen.
          setLocationSwitcherVisible(true);
          break;
        case 'rules':
          navigation.navigate('MarketplaceRules');
          break;
      }
    },
    [navigation]
  );

  const renderGridItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => (
      <ListingGridCard
        listing={item}
        width={cardWidth}
        onPress={() => handleCardPress(item)}
        isSaved={savedIds.has(item.id)}
        onToggleSave={handleToggleSave}
      />
    ),
    [handleCardPress, handleToggleSave, savedIds, cardWidth]
  );

  const gridTitle = searchQuery
    ? `Results for “${searchQuery}”`
    : selectedCategory
      ? (categories.find((c) => c.slug === selectedCategory)?.name ?? 'Listings')
      : 'All listings';
  const showGridTitle = !feed.loading && !feed.error && feed.grid.length > 0;

  // An element, not a component function: FlatList renders a function as
  // <ListHeaderComponent />, so a new function per keystroke would remount the
  // header and drop the search input's focus.
  const listHeader = useMemo(
    () => (
      <View>
        {feed.refreshError && (
          <MarketplaceErrorState message={feed.refreshError} onRetry={feed.refresh} compact />
        )}
        <MarketplaceSearchBar value={searchInput} onChangeText={setSearchInput} />
        <CategoryTileRow
          categories={categories}
          selectedSlug={selectedCategory}
          onSelect={setSelectedCategory}
        />
        {/* The discovery strips are the unnarrowed view's content, as on web;
            a category keeps only its own featured strip. */}
        <View style={styles.strips}>
          {!filtered && (
            <ListingStrip
              title="Sponsored"
              titleIcon="📢"
              listings={feed.sponsored}
              onItemPress={handleCardPress}
              maxItems={SPONSORED_STRIP_MAX}
              sponsored
            />
          )}
          <ListingStrip
            title="Featured"
            titleIcon="⭐"
            listings={feed.featured}
            onItemPress={handleCardPress}
          />
          {!filtered && (
            <>
              <ListingStrip
                title="Recently Added"
                titleIcon="🆕"
                listings={feed.recent}
                onItemPress={handleCardPress}
              />
              <ListingStrip
                title="Trending"
                titleIcon="🔥"
                listings={feed.trending}
                onItemPress={handleCardPress}
              />
            </>
          )}
        </View>
        {showGridTitle && (
          <Text style={styles.gridTitle} accessibilityRole="header">
            {gridTitle}
          </Text>
        )}
      </View>
    ),
    [
      feed.refreshError,
      feed.refresh,
      searchInput,
      categories,
      selectedCategory,
      filtered,
      feed.sponsored,
      feed.featured,
      feed.recent,
      feed.trending,
      handleCardPress,
      showGridTitle,
      gridTitle,
    ]
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
    setLocationSwitcherVisible(true);
  }, []);

  const stripsShowing =
    feed.sponsored.length + feed.featured.length + feed.recent.length + feed.trending.length > 0;

  const renderEmpty = useCallback(() => {
    if (feed.loading) {
      return (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingGridCardSkeleton key={i} width={cardWidth} />
          ))}
        </View>
      );
    }
    if (feed.error) {
      return <MarketplaceErrorState message={feed.error} onRetry={feed.reload} />;
    }
    // "Nothing in your metro yet" only when the metro has no listings at all.
    if (!filtered && stripsShowing) return null;
    return (
      <MarketplaceEmptyState
        variant={emptyVariant}
        hidePrimary={!canCreate && emptyVariant === 'empty-metro'}
        onPrimary={handleEmptyPrimary}
        onSecondary={emptyVariant === 'empty-metro' ? handleEmptySecondary : undefined}
      />
    );
  }, [
    feed.loading,
    cardWidth,
    feed.error,
    feed.reload,
    filtered,
    stripsShowing,
    emptyVariant,
    canCreate,
    handleEmptyPrimary,
    handleEmptySecondary,
  ]);

  const renderFooter = useCallback(() => {
    if (feed.loadMoreError) {
      return <MarketplaceErrorState message={feed.loadMoreError} onRetry={feed.retryLoadMore} compact />;
    }
    if (feed.loadingMore) {
      return <ActivityIndicator style={styles.loadingMore} color={warmAccent.warm} />;
    }
    return null;
  }, [feed.loadMoreError, feed.retryLoadMore, feed.loadingMore]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Marketplace</Text>
          {metroName && (
            <TouchableOpacity
              style={styles.metroButton}
              onPress={() => setLocationSwitcherVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`Change location: ${metroName}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.metroName} numberOfLines={1}>
                {metroName}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
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
        data={feed.loading || feed.error ? [] : feed.grid}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderGridItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} colors={[warmAccent.warm]} />
        }
        onEndReached={feed.loadMore}
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

      <ActiveLocationSwitcher
        visible={locationSwitcherVisible}
        onClose={() => setLocationSwitcherVisible(false)}
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
  headerTitleBlock: {
    flex: 1,
    marginRight: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  metroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  metroName: {
    ...typography.caption,
    color: colors.text.secondary,
    flexShrink: 1,
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
  strips: {
    // Strips scroll sideways, so let them run to the screen edges.
    marginHorizontal: -GUTTER,
  },
  gridTitle: {
    ...typography.h3,
    color: colors.text.primary,
    paddingTop: spacing.xs,
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
  loadingMore: {
    paddingVertical: spacing.s,
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
