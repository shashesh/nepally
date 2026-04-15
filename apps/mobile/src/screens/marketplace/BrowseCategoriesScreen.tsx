import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getCategories, type MarketplaceCategory } from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmBorder, warmRadius, warmSurface } from '../../styles/warmTokens';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList, 'BrowseCategories'>;

export default function BrowseCategoriesScreen() {
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const result = await getCategories(supabase);
      if (!mountedRef.current) return;
      if (result.data) setCategories(result.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.wrap}>
        <ActivityIndicator size="large" color={colors.primary.main} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tile}
            onPress={() =>
              navigation.navigate('MarketplaceCategory', {
                categorySlug: item.slug,
                categoryName: item.name,
              })
            }
            accessibilityLabel={`Browse ${item.name}`}
          >
            <Text style={styles.emoji}>{item.emoji ?? '📦'}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: warmSurface.canvas },
  loader: { marginTop: spacing.l },
  grid: { padding: spacing.s, gap: spacing.s },
  row: { gap: spacing.s, marginBottom: spacing.s },
  tile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: warmSurface.card,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emoji: { fontSize: 32 },
  name: { ...typography.caption, color: colors.text.primary, fontWeight: '600', fontSize: 12 },
});
