import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { MarketplaceCategory } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { warmAccent, warmBorder, warmRadius, warmSurface } from '../../styles/warmTokens';

interface CategoryTileRowProps {
  categories: MarketplaceCategory[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}

export function CategoryTileRow({ categories, selectedSlug, onSelect }: CategoryTileRowProps) {
  const keyExtractor = useCallback((c: MarketplaceCategory) => c.id, []);

  const renderItem = useCallback(
    ({ item }: { item: MarketplaceCategory }) => {
      const isSelected = item.slug === selectedSlug;
      return (
        <TouchableOpacity
          style={[styles.tile, isSelected && styles.tileSelected]}
          onPress={() => onSelect(isSelected ? '' : item.slug)}
          accessibilityLabel={`Filter by ${item.name}`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={styles.emoji}>{item.emoji ?? '📦'}</Text>
          <Text style={styles.label} numberOfLines={2}>
            {item.name}
          </Text>
        </TouchableOpacity>
      );
    },
    [onSelect, selectedSlug]
  );

  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      showsHorizontalScrollIndicator={false}
      style={styles.wrap}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: warmSurface.canvas,
  },
  list: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    gap: 10,
  },
  tile: {
    // A minimum, not a fixed width, so names and larger Dynamic Type sizes fit.
    minWidth: 72,
    maxWidth: 104,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    borderRadius: warmRadius.tile,
    backgroundColor: warmSurface.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    alignItems: 'center',
    gap: 4,
  },
  tileSelected: {
    borderColor: warmAccent.warm,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
