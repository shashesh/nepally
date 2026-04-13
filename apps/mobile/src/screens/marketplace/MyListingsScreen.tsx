import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  getListingsByOwner,
  deactivateListing,
  reactivateListing,
  deleteListing,
  refreshListing,
  LISTING_SOFT_EXPIRY_DAYS,
  type MarketplaceListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList>;

const STATUS_CONFIG = {
  active: { label: 'Active', color: colors.success, bgColor: '#E8F5E9' },
  inactive: { label: 'Inactive', color: colors.warning, bgColor: '#FFF3E0' },
  removed: { label: 'Removed', color: colors.error, bgColor: '#FFEBEE' },
};

export default function MyListingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const mountedRef = useRef(true);

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchListings = useCallback(async () => {
    if (!user) {
      if (mountedRef.current) setLoading(false);
      return;
    }
    try {
      const result = await getListingsByOwner(supabase, user.id);
      if (mountedRef.current && result.data) setListings(result.data);
    } catch {
      // Silently handle — empty state will surface in the UI.
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchListings();
    });
    return unsubscribe;
  }, [navigation, fetchListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings();
  }, [fetchListings]);

  const handleDeactivate = useCallback(async (listingId: string) => {
    Alert.alert('Deactivate Listing', 'This will hide your listing from the marketplace.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        onPress: async () => {
          await deactivateListing(supabase, listingId);
          fetchListings();
        },
      },
    ]);
  }, [fetchListings]);

  const handleReactivate = useCallback(async (listingId: string) => {
    await reactivateListing(supabase, listingId);
    fetchListings();
  }, [fetchListings]);

  const handleDelete = useCallback(async (listingId: string) => {
    Alert.alert('Delete Listing', 'This will permanently remove your listing. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteListing(supabase, listingId);
          fetchListings();
        },
      },
    ]);
  }, [fetchListings]);

  const handleRefresh = useCallback(async (listingId: string) => {
    await refreshListing(supabase, listingId);
    fetchListings();
  }, [fetchListings]);

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => {
      const statusConfig = STATUS_CONFIG[item.status];
      const daysUntilExpiry = Math.max(
        0,
        LISTING_SOFT_EXPIRY_DAYS -
        Math.floor((Date.now() - new Date(item.refreshed_at).getTime()) / (1000 * 60 * 60 * 24))
      );
      const isExpiringSoon = daysUntilExpiry <= 14 && item.status === 'active';

      return (
        <TouchableOpacity
          style={styles.listingCard}
          onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
          activeOpacity={0.7}
        >
          {/* Photo thumbnail */}
          {item.photos.length > 0 ? (
            <Image source={item.photos[0]} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: (item.category?.color ?? '#9E9E9E') + '20' }]}>
              <Text style={styles.thumbnailEmoji}>{item.category?.emoji ?? '📦'}</Text>
            </View>
          )}

          <View style={styles.listingHeader}>
            <Text style={styles.listingTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.listingMeta}>
            <Text style={styles.listingCategory}>
              {item.category?.emoji} {item.category?.name}
            </Text>
            {item.price && <Text style={styles.listingPrice}>{item.price}</Text>}
          </View>

          <View style={styles.listingStats}>
            <Text style={styles.statText}>{item.views_count} views</Text>
            <Text style={styles.statText}>{item.saves_count} saves</Text>
            <Text style={styles.statText}>{item.contacts_count} contacts</Text>
          </View>

          {isExpiringSoon && (
            <View style={styles.expiryWarning}>
              <Ionicons name="time-outline" size={14} color={colors.warning} />
              <Text style={styles.expiryText}>
                Expires in {daysUntilExpiry} days — refresh to stay visible
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateListing', { editListingId: item.id })}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary.main} />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>

            {item.status === 'active' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('PromoteListing', { listingId: item.id })}
              >
                <Ionicons name="megaphone-outline" size={18} color="#FF9800" />
                <Text style={[styles.actionText, { color: '#FF9800' }]}>Promote</Text>
              </TouchableOpacity>
            )}

            {item.status === 'active' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRefresh(item.id)}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Refresh</Text>
              </TouchableOpacity>
            )}

            {item.status === 'active' ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeactivate(item.id)}
              >
                <Ionicons name="pause-outline" size={18} color={colors.warning} />
                <Text style={[styles.actionText, { color: colors.warning }]}>Deactivate</Text>
              </TouchableOpacity>
            ) : item.status === 'inactive' ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReactivate(item.id)}
              >
                <Ionicons name="play-outline" size={18} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Reactivate</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, handleDeactivate, handleReactivate, handleDelete, handleRefresh]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Listings</Text>
        </View>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>You haven&apos;t created any listings yet</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateListing')}
            >
              <Text style={styles.createButtonText}>Create your first listing</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    alignItems: 'center',
    gap: spacing.s,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.m,
    paddingBottom: spacing.xl,
  },
  thumbnail: {
    width: '100%',
    height: 140,
    borderRadius: borderRadius.input,
    resizeMode: 'cover',
    marginBottom: spacing.s,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: borderRadius.input,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  thumbnailEmoji: {
    fontSize: 36,
  },
  listingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.input,
    padding: spacing.m,
    marginBottom: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  listingTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.s,
  },
  statusBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: borderRadius.button,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  listingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  listingCategory: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  listingPrice: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
  },
  listingStats: {
    flexDirection: 'row',
    gap: spacing.m,
    marginBottom: spacing.s,
  },
  statText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF3E0',
    padding: spacing.s,
    borderRadius: borderRadius.button,
    marginBottom: spacing.s,
  },
  expiryText: {
    ...typography.caption,
    color: colors.warning,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.s,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
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
});
