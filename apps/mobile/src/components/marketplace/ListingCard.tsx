import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MarketplaceListing } from '@nepally/shared';
import { LISTING_TYPE_LABELS } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';

interface ListingCardProps {
  listing: MarketplaceListing;
  onPress: () => void;
}

export function ListingCard({ listing, onPress }: ListingCardProps) {
  const categoryColor = listing.category?.color ?? '#9E9E9E';
  const categoryEmoji = listing.category?.emoji ?? '📦';
  const categoryName = listing.category?.name ?? 'Other';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Photo */}
      {listing.photos.length > 0 ? (
        <Image source={{ uri: listing.photos[0] }} style={styles.photo} />
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: categoryColor + '20' }]}>
          <Text style={styles.photoPlaceholderEmoji}>{categoryEmoji}</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
            <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
              {categoryEmoji} {categoryName}
            </Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {LISTING_TYPE_LABELS[listing.listing_type]}
            </Text>
          </View>
        </View>

        {listing.price && (
          <Text style={styles.price}>{listing.price}</Text>
        )}

        {listing.business_name && (
          <Text style={styles.businessName} numberOfLines={1}>
            {listing.business_name}
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>{listing.views_count}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="bookmark-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.statText}>{listing.saves_count}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    marginHorizontal: spacing.m,
    marginBottom: spacing.s,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },
  photo: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderEmoji: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    padding: spacing.s,
    justifyContent: 'space-between',
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.badge,
  },
  categoryBadgeText: {
    ...typography.caption,
    fontSize: 11,
  },
  typeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.badge,
    backgroundColor: colors.background,
  },
  typeBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
  },
  price: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: 2,
  },
  businessName: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
