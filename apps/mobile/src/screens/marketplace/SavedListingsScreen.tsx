import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getSavedListingsByUser,
  getUserSavedListingIds,
  saveListing,
  unsaveListing,
  type MarketplaceListing,
} from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { spacing } from '../../styles/spacing';
import { warmSurface } from '../../styles/warmTokens';
import type { MarketplaceStackParamList } from '../../types/navigation';
import { ListingGridCard } from '../../components/marketplace/ListingGridCard';
import { MarketplaceEmptyState } from '../../components/marketplace/MarketplaceEmptyState';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'SavedListings'>;

const GUTTER = 12;
const CARD_WIDTH = Math.floor((Dimensions.get('window').width - GUTTER * 3) / 2);

export default function SavedListingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSaved = useCallback(async () => {
    if (!user) {
      if (mountedRef.current) setLoading(false);
      return;
    }
    try {
      const [saved, ids] = await Promise.all([
        getSavedListingsByUser(supabase, user.id),
        getUserSavedListingIds(supabase, user.id),
      ]);
      if (!mountedRef.current) return;
      if (saved.data) setListings(saved.data);
      if (ids.data) setSavedIds(new Set(ids.data));
    } catch {
      // Silently handle — empty state will surface in the UI.
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

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
