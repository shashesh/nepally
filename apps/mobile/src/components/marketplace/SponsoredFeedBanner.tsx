import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { SponsoredListing } from '@nepally/shared';
import { ListingCard } from './ListingCard';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

interface SponsoredFeedBannerProps {
  items: SponsoredListing[];
  onItemPress: (listingId: string) => void;
}

const CARD_WIDTH = 200;

export const SponsoredFeedBanner = React.memo(function SponsoredFeedBanner({
  items,
  onItemPress,
}: SponsoredFeedBannerProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📢 Sponsored</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <ListingCard
            key={item.id}
            listing={item.listing}
            onPress={() => onItemPress(item.listing.id)}
            width={CARD_WIDTH}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    marginBottom: spacing.s,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  scrollContent: {
    paddingHorizontal: spacing.m,
    gap: spacing.s,
  },
});
