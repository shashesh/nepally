import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getSavedListingsByUser,
  getUserSavedListingIds,
  saveListing,
  unsaveListing,
  userMessage,
  type MarketplaceListing,
} from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { spacing } from '../../styles/spacing';
import { warmSurface } from '../../styles/warmTokens';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { ListingGridCard } from '../../components/marketplace/ListingGridCard';
import { MarketplaceEmptyState } from '../../components/marketplace/MarketplaceEmptyState';
import { MarketplaceErrorState } from '../../components/marketplace/MarketplaceErrorState';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'SavedListings'>;

const GUTTER = 12;
const CARD_WIDTH = Math.floor((Dimensions.get('window').width - GUTTER * 3) / 2);

const LOAD_FAILED = "Couldn't load your saved listings.";

type SavedListingsResult =
  | { listings: MarketplaceListing[]; savedIds: string[] | undefined }
  | { error: string }
  | null;

/** The member's saved listings and ids, the failure to show instead, or null when signed out. */
async function loadSavedListings(userId: string | undefined): Promise<SavedListingsResult> {
  if (!userId) return null;
  try {
    const [saved, ids] = await Promise.all([
      getSavedListingsByUser(supabase, userId),
      getUserSavedListingIds(supabase, userId),
    ]);
    if (saved.error) {
      return { error: userMessage(saved.error, LOAD_FAILED, 'saved_listings_load_failed', { platform: 'mobile' }) };
    }
    return { listings: saved.data ?? [], savedIds: ids.data };
  } catch (error) {
    return { error: userMessage(error, LOAD_FAILED, 'saved_listings_load_failed', { platform: 'mobile' }) };
  }
}

export default function SavedListingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;
    loadSavedListings(userId).then((result) => {
      if (cancelled) return;
      if (result && 'error' in result) {
        setError(result.error);
      } else if (result) {
        setListings(result.listings);
        if (result.savedIds) setSavedIds(new Set(result.savedIds));
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

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
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      } else {
        await saveListing(supabase, listingId);
      }
    },
    [savedIds]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.wrap}>
        <ActivityIndicator size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.wrap}>
        <MarketplaceErrorState message={error} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (listings.length === 0) {
    return (
      <SafeAreaView style={styles.wrap}>
        <MarketplaceEmptyState variant="empty-category" hidePrimary />
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
        renderItem={({ item }) => (
          <ListingGridCard
            listing={item}
            width={CARD_WIDTH}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            isSaved={savedIds.has(item.id)}
            onToggleSave={handleToggleSave}
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
