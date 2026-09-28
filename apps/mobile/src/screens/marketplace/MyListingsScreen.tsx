import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  Platform,
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
  getDaysUntilSoftExpiry,
  formatListingPrice,
  pluralize,
  userMessage,
  LISTING_SOFT_EXPIRY_DAYS,
  TrustLevel,
  type MarketplaceListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useNow';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { MarketplaceErrorState } from '../../components/marketplace/MarketplaceErrorState';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList>;

const STATUS_CONFIG = {
  active: { label: 'Active', color: colors.success, bgColor: '#E8F5E9' },
  inactive: { label: 'Inactive', color: colors.warning, bgColor: '#FFF3E0' },
  removed: { label: 'Removed', color: colors.error, bgColor: '#FFEBEE' },
};

const LOAD_FAILED = "Couldn't load your listings.";
const TRY_AGAIN = 'Please try again.';

/** The owner's listings, the failure to show instead, or null when signed out. */
type OwnListingsResult = { data: MarketplaceListing[] } | { error: string } | null;

async function loadOwnListings(userId: string | undefined): Promise<OwnListingsResult> {
  if (!userId) return null;
  try {
    const result = await getListingsByOwner(supabase, userId);
    if (result.error) {
      return { error: userMessage(result.error, LOAD_FAILED, 'my_listings_load_failed', { platform: 'mobile' }) };
    }
    return { data: result.data ?? [] };
  } catch (error) {
    return { error: userMessage(error, LOAD_FAILED, 'my_listings_load_failed', { platform: 'mobile' }) };
  }
}

/** A change an owner makes to one listing, and what to tell them afterwards. */
interface ListingMutation {
  run: (client: typeof supabase, listingId: string) => Promise<{ error?: Error }>;
  failureTitle: string;
  event: string;
  success?: { title: string; message: string };
}

const MUTATIONS = {
  refresh: {
    run: refreshListing,
    failureTitle: "Couldn't refresh this listing",
    event: 'my_listings_refresh_failed',
    success: {
      title: 'Listing refreshed',
      message: `It stays visible for another ${LISTING_SOFT_EXPIRY_DAYS} days.`,
    },
  },
  deactivate: {
    run: deactivateListing,
    failureTitle: "Couldn't deactivate this listing",
    event: 'my_listings_deactivate_failed',
  },
  reactivate: {
    run: reactivateListing,
    failureTitle: "Couldn't reactivate this listing",
    event: 'my_listings_reactivate_failed',
  },
  delete: {
    run: deleteListing,
    failureTitle: "Couldn't delete this listing",
    event: 'my_listings_delete_failed',
  },
} satisfies Record<string, ListingMutation>;

interface MenuAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/** A listing's More menu: an action sheet on iOS, an alert with the same buttons on Android. */
function showMoreMenu(title: string, actions: MenuAction[]): void {
  if (Platform.OS === 'ios') {
    const destructiveIndex = actions.findIndex((action) => action.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((action) => action.label), 'Cancel'],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
      },
      (index) => actions[index]?.onPress()
    );
    return;
  }
  Alert.alert(title, undefined, [
    ...actions.map((action) => ({
      text: action.label,
      onPress: action.onPress,
      style: action.destructive ? ('destructive' as const) : ('default' as const),
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

export default function MyListingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const userId = user?.id;
  const canCreate = (user?.trust_level ?? 0) >= TrustLevel.VERIFIED;

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the fetch effect (screen focus, pull-to-refresh, after a mutation).
  const [reloadKey, setReloadKey] = useState(0);
  // Listings with a change on its way; the ref stops a second tap before the state has rendered.
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const pendingRef = useRef<ReadonlySet<string>>(new Set());
  const mountedRef = useRef(true);
  const now = useNow();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadOwnListings(userId).then((result) => {
      if (cancelled) return;
      if (result && 'error' in result) {
        setError(result.error);
      } else if (result) {
        setListings(result.data);
        setError(null);
      } else {
        // No one signed in: never leave another member's listings on screen.
        setListings([]);
        setError(null);
      }
      setLoading(false);
      setRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const reloadListings = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      reloadListings();
    });
    return unsubscribe;
  }, [navigation, reloadListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reloadListings();
  }, [reloadListings]);

  const runMutation = useCallback(
    async (listingId: string, mutation: ListingMutation) => {
      if (pendingRef.current.has(listingId)) return;
      pendingRef.current = new Set([...pendingRef.current, listingId]);
      setPendingIds(pendingRef.current);

      let failure: unknown = null;
      try {
        failure = (await mutation.run(supabase, listingId)).error ?? null;
      } catch (thrown) {
        failure = thrown;
      }

      pendingRef.current = new Set([...pendingRef.current].filter((id) => id !== listingId));
      // Gone back meanwhile: don't alert over another screen.
      if (!mountedRef.current) return;
      setPendingIds(pendingRef.current);
      if (failure) {
        Alert.alert(
          mutation.failureTitle,
          userMessage(failure, TRY_AGAIN, mutation.event, { platform: 'mobile', listingId })
        );
      } else if (mutation.success) {
        Alert.alert(mutation.success.title, mutation.success.message);
      }
      reloadListings();
    },
    [reloadListings]
  );

  const openMoreMenu = useCallback(
    (item: MarketplaceListing) => {
      const confirmDeactivate = () =>
        Alert.alert('Deactivate Listing', 'This will hide your listing from the marketplace.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Deactivate', onPress: () => void runMutation(item.id, MUTATIONS.deactivate) },
        ]);
      const confirmDelete = () =>
        Alert.alert('Delete Listing', 'This will permanently remove your listing. Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void runMutation(item.id, MUTATIONS.delete),
          },
        ]);

      const statusAction: MenuAction[] =
        item.status === 'active'
          ? [{ label: 'Deactivate', onPress: confirmDeactivate }]
          : item.status === 'inactive'
            ? [{ label: 'Reactivate', onPress: () => void runMutation(item.id, MUTATIONS.reactivate) }]
            : [];
      showMoreMenu(item.title, [...statusAction, { label: 'Delete', onPress: confirmDelete, destructive: true }]);
    },
    [runMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => {
      const statusConfig = STATUS_CONFIG[item.status];
      const price = formatListingPrice(item.price);
      const daysUntilExpiry = getDaysUntilSoftExpiry(item.refreshed_at, now);
      const isExpiringSoon = daysUntilExpiry <= 14 && item.status === 'active';
      const isPending = pendingIds.has(item.id);

      return (
        <View style={styles.listingCard}>
          {/* The card opens the listing; the actions sit outside it so a screen reader reaches each. */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={[item.title, statusConfig.label, price].filter(Boolean).join(', ')}
          >
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
              {price ? <Text style={styles.listingPrice}>{price}</Text> : null}
            </View>

            <View style={styles.listingStats}>
              <Text style={styles.statText}>{pluralize(item.views_count, 'view')}</Text>
              <Text style={styles.statText}>{pluralize(item.saves_count, 'save')}</Text>
              <Text style={styles.statText}>{pluralize(item.contacts_count, 'contact')}</Text>
            </View>

            {isExpiringSoon && (
              <View style={styles.expiryWarning}>
                <Ionicons name="time-outline" size={14} color={colors.warning} />
                <Text style={styles.expiryText}>
                  Expires in {pluralize(daysUntilExpiry, 'day')} — refresh to stay visible
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <RowAction
              icon="create-outline"
              label="Edit"
              onPress={() => navigation.navigate('CreateListing', { editListingId: item.id })}
            />
            {item.status === 'active' && (
              <RowAction
                icon="refresh-outline"
                label="Refresh"
                tone="success"
                busy={isPending}
                onPress={() => void runMutation(item.id, MUTATIONS.refresh)}
              />
            )}
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => openMoreMenu(item)}
              disabled={isPending}
              accessibilityRole="button"
              accessibilityLabel="More actions"
              accessibilityState={{ disabled: isPending }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [navigation, now, pendingIds, runMutation, openMoreMenu]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => navigation.goBack()} />

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        // A reload that fails with listings on screen keeps them and says so;
        // with none on screen the empty slot shows the full error instead.
        ListHeaderComponent={
          error && listings.length > 0 ? (
            <MarketplaceErrorState message={error} onRetry={reloadListings} compact />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary.main]} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          error ? (
            <MarketplaceErrorState message={error} onRetry={reloadListings} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>You haven&apos;t created any listings yet</Text>
              {canCreate ? (
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CreateListing')}
                  accessibilityRole="button"
                >
                  <Text style={styles.createButtonText}>Create your first listing</Text>
                </TouchableOpacity>
              ) : (
                // Creating needs Level 1, as on Marketplace Home.
                <Text style={styles.verifyText}>Verify your account to create listings.</Text>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} accessibilityRole="header">
        My Listings
      </Text>
    </View>
  );
}

interface RowActionProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'success';
  busy?: boolean;
}

function RowAction({ icon, label, onPress, tone = 'primary', busy = false }: RowActionProps) {
  const color = tone === 'success' ? colors.success : colors.primary.main;
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={18} color={color} />
      )}
      <Text style={[styles.actionText, tone === 'success' && styles.actionTextSuccess]}>{label}</Text>
    </TouchableOpacity>
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
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.s,
  },
  actionText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
  },
  actionTextSuccess: {
    color: colors.success,
  },
  moreButton: {
    marginLeft: 'auto',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
  verifyText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
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
