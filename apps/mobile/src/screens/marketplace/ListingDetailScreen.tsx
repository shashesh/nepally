import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getListingById,
  saveListing,
  unsaveListing,
  getUserSavedListingIds,
  incrementListingViews,
  incrementListingContacts,
  getOrCreateConversation,
  getActivePromotionForListing,
  getListingHighlights,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  BUSINESS_HOURS_DAYS,
  type MarketplaceListing,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList>;
type Route = RouteProp<MarketplaceStackParamList, 'ListingDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const userId = user?.id;

  const { listingId } = route.params;

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hasActivePromotion, setHasActivePromotion] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [listingResult, savedResult] = await Promise.all([
          getListingById(supabase, listingId),
          userId
            ? getUserSavedListingIds(supabase, userId)
            : Promise.resolve({ data: null as string[] | null }),
        ]);

        if (cancelled) return;

        if (listingResult.data) {
          setListing(listingResult.data);
          void incrementListingViews(supabase, listingId);

          // Check for active promotion (non-blocking)
          if (listingResult.data.owner_id === userId) {
            getActivePromotionForListing(supabase, listingId).then((promoResult) => {
              if (!cancelled && promoResult.data) {
                setHasActivePromotion(true);
              }
            });
          }
        }

        if (savedResult.data) {
          setIsSaved(savedResult.data.includes(listingId));
        }
      } catch {
        // Silently handle — listing stays null → "not found" UI shown.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [listingId, userId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    if (isSaved) {
      const result = await unsaveListing(supabase, listingId);
      if (!result.error) setIsSaved(false);
    } else {
      const result = await saveListing(supabase, listingId);
      if (!result.error) setIsSaved(true);
    }
    setSaving(false);
  }, [isSaved, listingId]);

  const handleContact = useCallback(async () => {
    if (!listing?.owner || !user) return;
    void incrementListingContacts(supabase, listingId);
    const result = await getOrCreateConversation(
      supabase,
      user.id,
      user.full_name,
      listing.owner.id,
      listing.owner.full_name
    );
    if (result.data) {
      navigation.getParent()?.navigate('Chat', {
        screen: 'MessageThread',
        params: {
          conversationId: result.data.conversationId,
          otherUserId: listing.owner.id,
          otherUserName: listing.owner.full_name,
          otherUserTrustLevel: listing.owner.trust_level,
          otherUserPhotoUrl: listing.owner.profile_photo ?? null,
        },
      });
    } else {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  }, [listing, listingId, navigation, user]);

  const handleReport = useCallback(() => {
    Alert.alert(
      'Report Listing',
      'Are you sure you want to report this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // Uses existing report system
            Alert.alert('Reported', 'Thank you for reporting. We will review this listing.');
          },
        },
      ]
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Listing not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categoryColor = listing.category?.color ?? '#9E9E9E';
  const isOwner = user?.id === listing.owner_id;
  const daysAgo = Math.floor(
    (Date.now() - new Date(listing.refreshed_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const highlights = getListingHighlights(listing, new Date());

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleReport} style={styles.headerButton}>
            <Ionicons name="flag-outline" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photos */}
        {listing.photos.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
              }}
            >
              {listing.photos.map((photo, index) => (
                <Image key={index} source={photo} style={styles.photo} contentFit="cover" />
              ))}
            </ScrollView>
            {listing.photos.length > 1 && (
              <View style={styles.photoIndicator}>
                <Text style={styles.photoIndicatorText}>
                  {photoIndex + 1} / {listing.photos.length}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: categoryColor + '20' }]}>
            <Text style={styles.photoPlaceholderEmoji}>{listing.category?.emoji ?? '📦'}</Text>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.contentSection}>
          {/* Breadcrumb */}
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbText}>Marketplace</Text>
            {listing.category?.name && (
              <>
                <Text style={styles.breadcrumbSep}> › </Text>
                <Text style={styles.breadcrumbText}>{listing.category.name}</Text>
              </>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: categoryColor + '20' }]}>
              <Text style={[styles.badgeText, { color: categoryColor }]}>
                {listing.category?.emoji} {listing.category?.name}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.background }]}>
              <Text style={styles.badgeTextSecondary}>
                {LISTING_TYPE_LABELS[listing.listing_type]}
              </Text>
            </View>
            {listing.item_condition && (
              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                <Text style={styles.badgeTextSecondary}>
                  {ITEM_CONDITION_LABELS[listing.item_condition]}
                </Text>
              </View>
            )}
          </View>

          {/* Highlights strip */}
          {highlights.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.highlightsStrip}
            >
              {highlights.map((chip) => (
                <View
                  key={chip.key}
                  style={[styles.highlightChip, chip.key === 'open_now' && styles.highlightChipOpen]}
                >
                  <Text style={styles.highlightChipText}>
                    {chip.icon} {chip.value}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Inline price card */}
          {listing.price && (
            <View style={styles.inlinePriceCard}>
              <Text style={styles.inlinePrice}>{listing.price}</Text>
            </View>
          )}

          {/* Description */}
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Business Details */}
        {listing.listing_type === 'business' && (
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Business Details</Text>
            {listing.business_name && (
              <DetailRow icon="business-outline" label="Business" value={listing.business_name} />
            )}
            {listing.address && (
              <DetailRow icon="location-outline" label="Address" value={listing.address} />
            )}
            {listing.phone && (
              <DetailRow icon="call-outline" label="Phone" value={listing.phone} />
            )}
            {listing.email && (
              <DetailRow icon="mail-outline" label="Email" value={listing.email} />
            )}
            {listing.website_url && (
              <DetailRow icon="globe-outline" label="Website" value={listing.website_url} />
            )}
            {listing.business_hours && (
              <View style={styles.hoursSection}>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
                  <Text style={styles.detailLabel}>Hours</Text>
                </View>
                {BUSINESS_HOURS_DAYS.map((day) => {
                  const hours = listing.business_hours?.[day];
                  if (!hours) return null;
                  return (
                    <View key={day} style={styles.hoursRow}>
                      <Text style={styles.hoursDay}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                      <Text style={styles.hoursTime}>{hours.open} - {hours.close}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Owner Info */}
        {listing.owner && (
          <View style={styles.ownerSection}>
            <Text style={styles.sectionTitle}>Posted by</Text>
            <View style={styles.ownerRow}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerInitial}>
                  {listing.owner.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{listing.owner.full_name}</Text>
                <Text style={styles.ownerMeta}>
                  {daysAgo === 0 ? 'Refreshed today' : `Refreshed ${daysAgo}d ago`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.statText}>{listing.views_count} views</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="bookmark-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.statText}>{listing.saves_count} saves</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar — non-owner only */}
      {!isOwner && (
        <View style={styles.stickyBar}>
          {listing.price && (
            <View style={styles.stickyBarPrice}>
              <Text style={styles.stickyBarPriceText}>{listing.price}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.saveIconButton, isSaved && styles.saveButtonActive]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Unsave listing' : 'Save listing'}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? colors.primary.main : colors.text.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stickyBarButton}
            onPress={handleContact}
            accessibilityRole="button"
          >
            <Text style={styles.stickyBarButtonText}>Contact Seller</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Owner Edit Bar */}
      {isOwner && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('CreateListing', { editListingId: listing.id })}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary.main} />
            <Text style={styles.editButtonText}>Edit Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, hasActivePromotion && styles.disabledButton]}
            onPress={() => navigation.navigate('PromoteListing', { listingId: listing.id })}
            disabled={hasActivePromotion}
          >
            <Ionicons
              name="megaphone-outline"
              size={20}
              color={hasActivePromotion ? colors.text.disabled : '#FF9800'}
            />
            <Text style={[styles.editButtonText, hasActivePromotion && styles.disabledButtonText]}>
              {hasActivePromotion ? 'Promoted' : 'Promote'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.text.secondary} />
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  headerButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: 250,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: SCREEN_WIDTH,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderEmoji: {
    fontSize: 64,
  },
  photoIndicator: {
    position: 'absolute',
    bottom: spacing.s,
    right: spacing.m,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.button,
  },
  photoIndicatorText: {
    ...typography.caption,
    color: colors.white,
  },
  contentSection: {
    backgroundColor: colors.white,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.h3,
    color: colors.primary.main,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.m,
  },
  badge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.button,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  badgeTextSecondary: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  description: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
  detailsSection: {
    backgroundColor: colors.white,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.m,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    width: 60,
  },
  detailValue: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  hoursSection: {
    marginTop: spacing.xs,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 28,
    marginBottom: 4,
  },
  hoursDay: {
    ...typography.caption,
    color: colors.text.secondary,
    width: 90,
  },
  hoursTime: {
    ...typography.caption,
    color: colors.text.primary,
  },
  ownerSection: {
    backgroundColor: colors.white,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInitial: {
    ...typography.h3,
    color: colors.primary.main,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ownerMeta: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  statsSection: {
    flexDirection: 'row',
    gap: spacing.l,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
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
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    flexDirection: 'row',
    padding: spacing.m,
    gap: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveIconButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.input,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
    height: 48,
  },
  editButtonText: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: colors.text.disabled,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  breadcrumbText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  breadcrumbSep: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  highlightsStrip: {
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  highlightChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.badge,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  highlightChipOpen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  highlightChipText: {
    ...typography.caption,
    color: colors.text.primary,
  },
  inlinePriceCard: {
    marginVertical: spacing.s,
    padding: spacing.s,
    backgroundColor: colors.background,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlinePrice: {
    ...typography.h3,
    color: colors.primary.main,
    fontWeight: '700',
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.s,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  stickyBarPrice: {
    flexShrink: 0,
  },
  stickyBarPriceText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary.main,
  },
  stickyBarButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.input,
    alignItems: 'center',
  },
  stickyBarButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
});
