import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { isVerifiedSeller, type MarketplaceListing } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';

interface ListingCardProps {
  listing: MarketplaceListing;
  onPress: () => void;
  /** Optional width override for use inside horizontal strips */
  width?: number;
  /** Show a "Sponsored" badge overlay */
  sponsored?: boolean;
}

export const ListingCard = React.memo(function ListingCard({ listing, onPress, width, sponsored }: ListingCardProps) {
  const categoryColor = listing.category?.color ?? '#9E9E9E';
  const categoryEmoji = listing.category?.emoji ?? '📦';
  const categoryName = listing.category?.name ?? 'Other';
  const showVerifiedSeller = isVerifiedSeller(listing);
  const [firstPhoto] = listing.photos;

  return (
    <TouchableOpacity
      style={[styles.card, width != null ? { width } : null]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Image / gradient placeholder */}
      {firstPhoto ? (
        <Image source={firstPhoto} style={styles.image} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={[categoryColor + '33', categoryColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.imagePlaceholder}
        >
          <Text style={styles.placeholderEmoji}>{categoryEmoji}</Text>
        </LinearGradient>
      )}

      {/* Sponsored badge */}
      {sponsored && (
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
        </View>
      )}

      {/* Body */}
      <View style={styles.body}>
        <View style={[styles.categoryChip, { backgroundColor: categoryColor + '22' }]}>
          <Text style={[styles.categoryChipText, { color: categoryColor }]}>
            {categoryEmoji} {categoryName}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        {listing.price && (
          <Text style={styles.price}>Starting at {listing.price}</Text>
        )}

        <View style={styles.metaRow}>
          {showVerifiedSeller && (
            <>
              <Text style={styles.verifiedStar}>★</Text>
              <Text style={styles.metaText}>Verified Seller</Text>
              <Text style={styles.metaDot}>·</Text>
            </>
          )}
          <Text style={styles.metaText}>{listing.views_count} views</Text>
        </View>

        <View style={styles.contactBtn}>
          <Text style={styles.contactBtnText}>Contact Seller</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.s,
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  body: {
    padding: spacing.s,
    gap: 6,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 20,
  },
  price: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedStar: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
  },
  metaText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.secondary,
  },
  metaDot: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  contactBtn: {
    marginTop: 4,
    backgroundColor: colors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  contactBtnText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  sponsoredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
