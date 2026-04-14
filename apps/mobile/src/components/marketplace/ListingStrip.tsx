import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MarketplaceListing } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { ListingCard } from './ListingCard';

interface ListingStripProps {
  title: string;
  titleIcon?: string;
  listings: MarketplaceListing[];
  onItemPress: (listing: MarketplaceListing) => void;
  /**
   * Optional "show all" handler. When omitted, the header "View All →" button
   * and the trailing "Show All" footer card are not rendered — use this when
   * the strip has no dedicated destination screen.
   */
  onShowAll?: () => void;
  maxItems?: number;
  /** Card width inside the horizontal strip */
  cardWidth?: number;
}

const DEFAULT_CARD_WIDTH = Math.min(260, Dimensions.get('window').width * 0.72);

export function ListingStrip({
  title,
  titleIcon,
  listings,
  onItemPress,
  onShowAll,
  maxItems = 10,
  cardWidth = DEFAULT_CARD_WIDTH,
}: ListingStripProps) {
  const listingKeyExtractor = useCallback(
    (item: MarketplaceListing) => item.id,
    []
  );

  const renderListingItem = useCallback(
    ({ item }: { item: MarketplaceListing }) => (
      <View style={[styles.item, { width: cardWidth }]}>
        <ListingCard
          listing={item}
          width={cardWidth}
          onPress={() => onItemPress(item)}
        />
      </View>
    ),
    [cardWidth, onItemPress]
  );

  if (listings.length === 0) return null;

  const visible = listings.slice(0, maxItems);
  const showShowAll = onShowAll != null && listings.length >= maxItems;

  return (
    <View style={styles.strip} accessibilityLabel={title}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {titleIcon ? `${titleIcon} ` : ''}{title}
        </Text>
        {onShowAll != null && (
          <TouchableOpacity
            onPress={onShowAll}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`View all ${title}`}
          >
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        horizontal
        data={visible}
        keyExtractor={listingKeyExtractor}
        renderItem={renderListingItem}
        ListFooterComponent={
          showShowAll ? (
            <TouchableOpacity
              style={[styles.showAllCard, { width: cardWidth }]}
              onPress={onShowAll}
              activeOpacity={0.7}
              accessibilityLabel={`Show all ${title} listings`}
            >
              <Ionicons name="arrow-forward" size={32} color={colors.primary.main} />
              <Text style={styles.showAllText}>Show All</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginBottom: spacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  viewAll: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.main,
  },
  listContent: {
    paddingHorizontal: spacing.m,
    gap: spacing.s,
  },
  item: {
    // width set inline via prop
  },
  showAllCard: {
    height: 300,
    borderRadius: borderRadius.card,
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderStyle: 'dashed',
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  showAllText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary.main,
  },
});
