import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  incrementListingContacts,
  getOrCreateConversation,
  getListingHighlights,
  getDaysSinceRefresh,
  formatListingPrice,
  createReport,
  listingInquiryDraft,
  toMailtoUrl,
  toMapsUrls,
  toTelUrl,
  toWebsiteUrl,
  TrustLevel,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  BUSINESS_HOURS_DAYS,
} from '@nepally/shared';
import { ReportPostSheet } from '../../components/sheets/ReportPostSheet';
import { Avatar } from '../../components/Avatar';
import { TrustBadge } from '../../components/badges/TrustBadge';
import { MarketplaceErrorState } from '../../components/marketplace/MarketplaceErrorState';
import { useAuth } from '../../hooks/useAuth';
import { useSavedListingIds } from '../../hooks/useSavedListingIds';
import { useNow } from '../../hooks/useNow';
import { useListing } from '../../hooks/useListing';
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

  const { listing, loading, loadError, reload } = useListing(listingId);
  const { savedIds, toggle: toggleSaved } = useSavedListingIds(userId);
  const isSaved = savedIds.has(listingId);
  const [saving, setSaving] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  // Coming back from an edit can change the photos: start the carousel over
  // (its key remounts it at the first photo) so the count never reads "3 / 1".
  const photoSet = listing?.photos.join(' ') ?? '';
  const [shownPhotoSet, setShownPhotoSet] = useState(photoSet);
  if (photoSet !== shownPhotoSet) {
    setShownPhotoSet(photoSet);
    setPhotoIndex(0);
  }
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [contacting, setContacting] = useState(false);
  const contactingRef = useRef(false);
  const mountedRef = useRef(true);
  const now = useNow();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await toggleSaved(listingId);
    setSaving(false);
  }, [toggleSaved, listingId]);

  const handleContact = useCallback(async () => {
    // The ref stops a second tap before the busy state has rendered.
    if (!listing?.owner || !user || contactingRef.current) return;
    const owner = listing.owner;
    contactingRef.current = true;
    setContacting(true);
    let conversationId: string | null = null;
    try {
      const result = await getOrCreateConversation(
        supabase,
        user.id,
        user.full_name,
        owner.id,
        owner.full_name
      );
      conversationId = result.data?.conversationId ?? null;
    } catch {
      conversationId = null;
    }
    contactingRef.current = false;
    // Gone back meanwhile: don't pull the member into a chat or alert over another screen.
    if (!mountedRef.current) return;
    setContacting(false);
    if (!conversationId) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
      return;
    }
    void incrementListingContacts(supabase, listingId);
    navigation.getParent()?.navigate('Chat', {
      screen: 'MessageThread',
      params: {
        conversationId,
        otherUserId: owner.id,
        otherUserName: owner.full_name,
        otherUserTrustLevel: owner.trust_level,
        otherUserPhotoUrl: owner.profile_photo ?? null,
        initialDraft: listingInquiryDraft(listing.title),
      },
    });
  }, [listing, listingId, navigation, user]);

  const handleReport = useCallback(() => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to report listings.');
      return;
    }
    // The reports INSERT policy requires Level 1; say so instead of surfacing an RLS failure.
    if ((user.trust_level ?? 0) < TrustLevel.VERIFIED) {
      Alert.alert('Verify to Report', 'Please verify your account to report listings.');
      return;
    }
    setReportOpen(true);
  }, [user]);

  const handleReportClose = useCallback(() => {
    if (!reportSubmitting) setReportOpen(false);
  }, [reportSubmitting]);

  const handleReportSubmit = useCallback(
    async (reason: string, description?: string) => {
      if (!user) return;
      setReportSubmitting(true);
      const result = await createReport(supabase, {
        reported_by: user.id,
        target_type: 'listing',
        target_id: listingId,
        reason,
        description,
      });
      setReportSubmitting(false);
      if (result.error) {
        Alert.alert('Error', result.error.message || 'Failed to report listing. Please try again.');
        return;
      }
      setReportOpen(false);
      Alert.alert('Listing Reported', 'Thank you. Our moderation team will review this listing.');
    },
    [listingId, user]
  );

  const handleOpenSeller = useCallback(() => {
    const owner = listing?.owner;
    if (!owner) return;
    // Your own listing: your own profile, as a post's author link does.
    if (owner.id === user?.id) {
      navigation.getParent()?.navigate('Profile');
      return;
    }
    navigation.navigate('PublicProfileView', { userId: owner.id });
  }, [listing, navigation, user?.id]);

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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          {loadError ? (
            <MarketplaceErrorState message={loadError} onRetry={reload} />
          ) : (
            <Text style={styles.errorText}>Listing not found</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const categoryColor = listing.category?.color ?? '#9E9E9E';
  const isOwner = user?.id === listing.owner_id;
  const daysAgo = getDaysSinceRefresh(listing.refreshed_at, now);
  const highlights = getListingHighlights(listing, now);
  const price = formatListingPrice(listing.price);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {!isOwner && (
            <TouchableOpacity
              onPress={handleReport}
              style={styles.headerButton}
              accessibilityLabel="Report listing"
            >
              <Ionicons name="flag-outline" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photos */}
        {listing.photos.length > 0 ? (
          <View>
            <ScrollView
              key={photoSet}
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
          {price ? (
            <View style={styles.inlinePriceCard}>
              <Text style={styles.inlinePrice}>{price}</Text>
            </View>
          ) : null}

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
              <DetailRow
                icon="location-outline"
                label="Address"
                value={listing.address}
                urls={mapsUrls(listing.address)}
                linkLabel={`Open ${listing.address} in Maps`}
              />
            )}
            {listing.phone && (
              <DetailRow
                icon="call-outline"
                label="Phone"
                value={listing.phone}
                urls={asUrls(toTelUrl(listing.phone))}
                linkLabel={`Call ${listing.phone}`}
              />
            )}
            {listing.email && (
              <DetailRow
                icon="mail-outline"
                label="Email"
                value={listing.email}
                urls={asUrls(toMailtoUrl(listing.email))}
                linkLabel={`Email ${listing.email}`}
              />
            )}
            {listing.website_url && (
              <DetailRow
                icon="globe-outline"
                label="Website"
                value={listing.website_url}
                urls={asUrls(toWebsiteUrl(listing.website_url))}
                linkLabel={`Open ${listing.website_url}`}
              />
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

        {/* Seller card */}
        {listing.owner && (
          <View style={styles.ownerSection}>
            <Text style={styles.sectionTitle}>Posted by</Text>
            <TouchableOpacity
              style={styles.ownerRow}
              onPress={handleOpenSeller}
              accessibilityRole="button"
              accessibilityLabel={`View ${listing.owner.full_name}'s profile`}
            >
              <Avatar
                name={listing.owner.full_name}
                photoUrl={listing.owner.profile_photo}
                trustLevel={listing.owner.trust_level}
                size="medium"
              />
              <View style={styles.ownerInfo}>
                <View style={styles.ownerNameRow}>
                  <Text style={styles.ownerName}>{listing.owner.full_name}</Text>
                  <TrustBadge level={badgeLevel(listing.owner.trust_level)} />
                </View>
                <Text style={styles.ownerMeta}>
                  {daysAgo === 0 ? 'Refreshed today' : `Refreshed ${daysAgo}d ago`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
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
          {price ? (
            <View style={styles.stickyBarPrice}>
              <Text style={styles.stickyBarPriceText}>{price}</Text>
            </View>
          ) : null}
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
            style={[styles.stickyBarButton, contacting && styles.stickyBarButtonBusy]}
            onPress={handleContact}
            disabled={contacting}
            accessibilityRole="button"
            accessibilityLabel="Contact Seller"
            accessibilityState={{ busy: contacting, disabled: contacting }}
          >
            {contacting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.stickyBarButtonText}>Contact Seller</Text>
            )}
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
        </View>
      )}

      <ReportPostSheet
        visible={reportOpen}
        submitting={reportSubmitting}
        title="Report Listing"
        onClose={handleReportClose}
        onSubmit={handleReportSubmit}
      />
    </SafeAreaView>
  );
}

/** `TrustBadge` has a badge for levels 0 to 2. */
function badgeLevel(trustLevel: number): 0 | 1 | 2 {
  if (trustLevel >= 2) return 2;
  return trustLevel >= 1 ? 1 : 0;
}

/** Opens the first URL something on the device handles, and says so when nothing does. */
async function openFirst(urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Nothing handles this one; try the next.
    }
  }
  Alert.alert("Couldn't open that", 'No app on this device can open it.');
}

function asUrls(url: string | null): string[] | null {
  return url ? [url] : null;
}

/** Maps for the address: the platform's own app first, then Google Maps in the browser. */
function mapsUrls(address: string): string[] | null {
  const maps = toMapsUrls(address);
  if (!maps) return null;
  return [Platform.OS === 'ios' ? maps.apple : maps.geo, maps.google];
}

interface DetailRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  /** URLs to try in turn on a tap. Without any, the value is plain text. */
  urls?: string[] | null;
  /** What a screen reader announces for the link, e.g. "Call 555-0100". */
  linkLabel?: string;
}

function DetailRow({ icon, label, value, urls, linkLabel }: DetailRowProps) {
  const content = (
    <>
      <Ionicons name={icon} size={18} color={colors.text.secondary} />
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={[styles.detailValue, urls && styles.detailLinkValue]} selectable>
        {value}
      </Text>
    </>
  );
  if (!urls) return <View style={styles.detailRow}>{content}</View>;
  return (
    <TouchableOpacity
      style={[styles.detailRow, styles.detailLinkRow]}
      onPress={() => void openFirst(urls)}
      accessibilityRole="link"
      accessibilityLabel={linkLabel}
    >
      {content}
    </TouchableOpacity>
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
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  detailLinkRow: {
    minHeight: 44,
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
  detailLinkValue: {
    color: colors.primary.main,
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
  ownerInfo: {
    flex: 1,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
  stickyBarButtonBusy: {
    opacity: 0.7,
  },
  stickyBarButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
  },
});
