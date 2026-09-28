import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSavedListingsByUser, userMessage, type MarketplaceListing } from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSavedListingIds } from '../../hooks/useSavedListingIds';
import { useGridCardWidth } from '../../hooks/useGridCardWidth';
import { useRefocusEffect } from '../../hooks/useRefocusEffect';
import { spacing } from '../../styles/spacing';
import { warmAccent, warmSurface } from '../../styles/warmTokens';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { ListingGridCard } from '../../components/marketplace/ListingGridCard';
import { MarketplaceEmptyState } from '../../components/marketplace/MarketplaceEmptyState';
import { MarketplaceErrorState } from '../../components/marketplace/MarketplaceErrorState';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'SavedListings'>;

const GUTTER = 12;
const LOAD_FAILED = "Couldn't load your saved listings.";

/** The member's saved listings, the failure to show instead, or null when signed out. */
type SavedListingsResult = MarketplaceListing[] | { error: string } | null;

async function loadSavedListings(userId: string | undefined): Promise<SavedListingsResult> {
  if (!userId) return null;
  try {
    const saved = await getSavedListingsByUser(supabase, userId);
    if (saved.error) {
      return { error: userMessage(saved.error, LOAD_FAILED, 'saved_listings_load_failed', { platform: 'mobile' }) };
    }
    return saved.data ?? [];
  } catch (error) {
    return { error: userMessage(error, LOAD_FAILED, 'saved_listings_load_failed', { platform: 'mobile' }) };
  }
}

export default function SavedListingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const userId = user?.id;
  const cardWidth = useGridCardWidth(GUTTER);
  const { setSaved, reload: reloadSavedIds } = useSavedListingIds(userId);

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadSavedListings(userId).then((result) => {
      if (cancelled) return;
      if (result && 'error' in result) {
        setError(result.error);
      } else if (result) {
        setListings(result);
        setError(null);
      } else {
        // No one signed in: never leave another member's saved listings on screen.
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

  /** Refetches quietly; the list stays on screen until the new one lands. */
  const refetch = useCallback(() => {
    setReloadKey((key) => key + 1);
    void reloadSavedIds();
  }, [reloadSavedIds]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    refetch();
  }, [refetch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

  // Coming back after saving or unsaving elsewhere shows the current list.
  // The first focus is the first load, which the effect above already does.
  useRefocusEffect(refetch);

  // Every card here is saved, so the heart always unsaves, even if the ids
  // haven't loaded yet (a toggle would then save it again).
  const handleUnsave = useCallback(
    async (listingId: string) => {
      const stuck = await setSaved(listingId, false);
      // An unsaved listing leaves this screen; a failed unsave keeps it.
      if (stuck) setListings((prev) => prev.filter((l) => l.id !== listingId));
    },
    [setSaved]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.wrap}>
        <ActivityIndicator size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  // The full error only when there is nothing to show; otherwise the list stays.
  if (error && listings.length === 0) {
    return (
      <SafeAreaView style={styles.wrap}>
        <MarketplaceErrorState message={error} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (listings.length === 0) {
    return (
      <SafeAreaView style={styles.wrap}>
        <MarketplaceEmptyState
          variant="empty-saved"
          onPrimary={() => navigation.navigate('MarketplaceHome')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          error ? <MarketplaceErrorState message={error} onRetry={onRefresh} compact /> : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[warmAccent.warm]} />
        }
        renderItem={({ item }) => (
          <ListingGridCard
            listing={item}
            width={cardWidth}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            isSaved
            onToggleSave={handleUnsave}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: warmSurface.canvas },
  loader: { marginTop: spacing.l },
  grid: { padding: GUTTER, gap: GUTTER },
  row: { gap: GUTTER, marginBottom: GUTTER },
});
