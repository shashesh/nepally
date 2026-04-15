import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TrustLevel, formatListingFreshness, type MarketplaceListing } from '@nepally/shared';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import {
  warmAccent,
  warmBorder,
  warmRadius,
  warmShadow,
  warmSurface,
} from '../../styles/warmTokens';

export interface ListingGridCardProps {
  listing: MarketplaceListing;
  width: number;
  onPress: () => void;
  isSaved: boolean;
  onToggleSave: (listingId: string) => void;
  sponsored?: boolean;
}

export const ListingGridCard = React.memo(function ListingGridCard({
  listing,
  width,
  onPress,
  isSaved,
  onToggleSave,
  sponsored,
}: ListingGridCardProps) {
  const imageHeight = Math.round(width * 1.25); // 4:5
  const [firstPhoto] = listing.photos;
  const categoryColor = listing.category?.color ?? '#9E9E9E';
  const isVerified = (listing.owner?.trust_level ?? 0) >= TrustLevel.VERIFIED;
  const freshness = useMemo(() => formatListingFreshness(listing.created_at), [listing.created_at]);

  const handleToggleSave = useCallback(() => {
    onToggleSave(listing.id);
  }, [listing.id, onToggleSave]);

  return (
    <TouchableOpacity
      style={[styles.card, { width }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={`Open listing: ${listing.title}`}
      accessibilityRole="button"
    >
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        {firstPhoto ? (
          <Image source={firstPhoto} style={styles.image} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={[categoryColor + '22', categoryColor + '55']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.image}
          >
            <Text style={styles.placeholderEmoji}>{listing.category?.emoji ?? '📦'}</Text>
          </LinearGradient>
        )}

        {sponsored && (
          <View style={styles.sponsoredBadge} accessibilityLabel="Sponsored listing">
            <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleToggleSave}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isSaved ? 'Unsave listing' : 'Save listing'}
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={22}
            color={isSaved ? warmAccent.warm : '#FFFFFF'}
          />
        </TouchableOpacity>

        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
      </View>

      <View style={styles.body}>
        {listing.price ? (
          <View style={styles.priceRow}>
            <Text style={styles.price}>{listing.price}</Text>
            {isVerified && <Text style={styles.verifiedCheck}>✓</Text>}
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        {freshness ? (
          <Text style={styles.meta}>{freshness}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: warmSurface.card,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    overflow: 'hidden',
    ...warmShadow,
  },
  imageWrap: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  saveBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20,14,8,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsoredBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(20,14,8,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sponsoredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryDot: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    padding: spacing.xs,
    gap: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '700',
    color: warmAccent.warm,
  },
  verifiedCheck: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '700',
  },
  title: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  meta: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
});
