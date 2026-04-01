import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  getCategories,
  getListingsByMetro,
  TrustLevel,
  type MarketplaceCategory,
  type MarketplaceListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { ListingCard } from '../../components/marketplace/ListingCard';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList>;

export default function MarketplaceHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [recentListings, setRecentListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const metroId = user?.metro_area_id ?? '';
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  const fetchData = useCallback(async () => {
    if (!metroId) {
      setLoading(false);
      return;
    }

    const [catResult, listingsResult] = await Promise.all([
      getCategories(supabase),
      getListingsByMetro(supabase, metroId, { limit: 10 }),
    ]);

    if (catResult.data) setCategories(catResult.data);
    if (listingsResult.data) setRecentListings(listingsResult.data);
    setLoading(false);
    setRefreshing(false);
  }, [metroId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim().length > 0) {
      navigation.navigate('MarketplaceCategory', {
        categorySlug: '__search__',
        categoryName: `Search: ${searchQuery.trim()}`,
      });
    }
  }, [navigation, searchQuery]);

  const renderCategoryChip = useCallback(
    (item: MarketplaceCategory) => (
      <TouchableOpacity
        key={item.id}
        style={[styles.categoryChip, { borderColor: item.color ?? '#9E9E9E' }]}
        onPress={() =>
          navigation.navigate('MarketplaceCategory', {
            categorySlug: item.slug,
            categoryName: item.name,
          })
        }
        activeOpacity={0.7}
      >
        <View style={[styles.categoryChipIcon, { backgroundColor: (item.color ?? '#9E9E9E') + '20' }]}>
          <Text style={styles.categoryChipEmoji}>{item.emoji ?? '📦'}</Text>
        </View>
        <Text style={styles.categoryChipText}>{item.name}</Text>
      </TouchableOpacity>
    ),
    [navigation]
  );

  const renderListingItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => (
      <ListingCard
        listing={item}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
      />
    ),
    [navigation]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

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
            >
              <Ionicons name="list-outline" size={22} color={colors.primary.main} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={recentListings}
        keyExtractor={(item) => item.id}
        renderItem={renderListingItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={colors.text.secondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search marketplace..."
                  placeholderTextColor={colors.text.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
              </View>
            </View>

            {/* Category Chips */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map(renderCategoryChip)}
            </ScrollView>

            {/* Recent Listings Header */}
            {recentListings.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Added</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No listings in your area yet</Text>
            {canCreate && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateListing')}
              >
                <Text style={styles.createButtonText}>Create the first listing</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* FAB */}
      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateListing')}
          activeOpacity={0.8}
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
    paddingBottom: 80,
  },
  searchContainer: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.s,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    padding: 0,
  },
  sectionHeader: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  categoryScroll: {
    paddingHorizontal: spacing.s,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.s,
    gap: spacing.xxs,
  },
  categoryChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    ...typography.caption,
    fontWeight: '500',
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
