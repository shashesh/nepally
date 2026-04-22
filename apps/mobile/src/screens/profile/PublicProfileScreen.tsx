import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { FollowButton } from '../../components/FollowButton';
import type { HomeStackParamList } from '../../types/navigation';
import {
  TrustLevel,
  getUserById,
  getPostsByAuthorId,
  getEventsByOrganizer,
  getActiveListingsBySeller,
  getOrCreateConversation,
  formatRelativeTime,
  formatPublicName,
  getTrustLabel,
  LANGUAGE_LABELS,
  getHelperScore,
  HELPER_SCORE_VISIBILITY_THRESHOLD,
  type LanguageCode,
} from '@nepally/shared';
import type {
  User,
  Post,
  Event,
  MarketplaceListing,
} from '@nepally/shared';
import { colors } from '../../styles/colors';
import { typography, fontFamily } from '../../styles/typography';
import { spacing, borderRadius, shadows } from '../../styles/spacing';
import { sanitizeMediaUri } from '../../utils/mediaUrl';

type Navigation = NativeStackNavigationProp<HomeStackParamList, 'PublicProfileView'>;
type Route = RouteProp<HomeStackParamList, 'PublicProfileView'>;
type ProfileTab = 'posts' | 'events' | 'listings' | 'about';

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function formatPrice(listing: MarketplaceListing): string | null {
  if (listing.price === null || listing.price === undefined) return null;
  const raw =
    typeof listing.price === 'number' ? listing.price : Number(listing.price);
  if (!Number.isFinite(raw)) return null;
  return raw.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: raw % 1 === 0 ? 0 : 2,
  });
}

/** Trust level badge colors matching the rest of the app */
function getTrustColors(level: number): { bg: string; fg: string } {
  if (level === TrustLevel.CONTRIBUTOR) {
    return { bg: '#E3F2FD', fg: colors.primary.main };
  }
  if (level === TrustLevel.VERIFIED) {
    return { bg: '#E8F5E9', fg: colors.success };
  }
  return { bg: '#F5F5F5', fg: colors.text.secondary };
}

export default function PublicProfileScreen(): React.ReactElement {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [userListings, setUserListings] = useState<MarketplaceListing[]>([]);
  const [metroName, setMetroName] = useState<string | null>(null);
  const [helperScore, setHelperScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [messagingLoading, setMessagingLoading] = useState(false);

  useEffect(() => {
    async function loadProfile(): Promise<void> {
      setLoading(true);
      setError(null);
      const result = await getUserById(supabase, userId);
      if (!mountedRef.current) return;
      if (result.error || !result.data) {
        setError('We couldn\u2019t find this member. They may have deleted their account.');
        setLoading(false);
        return;
      }
      setProfileUser(result.data);
      setLoading(false);

      if (result.data.metro_area_id) {
        const { data: metro } = await supabase
          .from('metro_areas')
          .select('name, state')
          .eq('id', result.data.metro_area_id)
          .single();
        if (mountedRef.current && metro) {
          setMetroName(`${metro.name}, ${metro.state}`);
        }
      }
    }

    async function loadPosts(): Promise<void> {
      setPostsLoading(true);
      const result = await getPostsByAuthorId(supabase, userId, 30);
      if (!mountedRef.current) return;
      setUserPosts(result.data || []);
      setPostsLoading(false);
    }

    async function loadEvents(): Promise<void> {
      setEventsLoading(true);
      const result = await getEventsByOrganizer(supabase, userId, 50);
      if (!mountedRef.current) return;
      setUserEvents(result.data || []);
      setEventsLoading(false);
    }

    async function loadListings(): Promise<void> {
      setListingsLoading(true);
      const result = await getActiveListingsBySeller(supabase, userId, 30);
      if (!mountedRef.current) return;
      setUserListings(result.data || []);
      setListingsLoading(false);
    }

    async function loadHelperScore(): Promise<void> {
      const result = await getHelperScore(supabase, userId);
      if (!mountedRef.current) return;
      setHelperScore(result.data?.helperScore ?? 0);
    }

    loadProfile();
    loadPosts();
    loadEvents();
    loadListings();
    loadHelperScore();
  }, [userId]);

  const handleMessage = useCallback(async (): Promise<void> => {
    if (!currentUser || !profileUser) return;

    if (currentUser.trust_level === TrustLevel.NEW) {
      Alert.alert(
        'Verify to message',
        'Please verify your email to message other members.',
        [{ text: 'OK' }]
      );
      return;
    }

    setMessagingLoading(true);
    const result = await getOrCreateConversation(
      supabase,
      currentUser.id,
      currentUser.full_name,
      profileUser.id,
      profileUser.full_name
    );
    if (!mountedRef.current) return;
    setMessagingLoading(false);

    if (result.data) {
      navigation.getParent()?.navigate('Chat', {
        screen: 'MessageThread',
        params: {
          conversationId: result.data.conversationId,
          otherUserId: profileUser.id,
          otherUserName: profileUser.full_name,
          otherUserTrustLevel: profileUser.trust_level,
          otherUserPhotoUrl: profileUser.profile_photo ?? null,
        },
      });
    } else {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  }, [currentUser, profileUser, navigation]);

  const handleListingPress = useCallback(
    (listingId: string): void => {
      navigation.getParent()?.navigate('Marketplace', {
        screen: 'ListingDetail',
        params: { listingId },
      });
    },
    [navigation]
  );

  // ── Loading ─────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ───────────────────────────────────
  if (error || !profileUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Profile not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived values ──────────────────────────
  const publicName = formatPublicName(profileUser.full_name);
  const firstName =
    profileUser.full_name.trim().split(/\s+/)[0] ?? profileUser.full_name;
  const isOwnProfile = currentUser?.id === userId;
  const memberSinceYear = new Date(profileUser.created_at).getFullYear();
  const trustLevel = profileUser.trust_level;
  const initials = getInitials(profileUser.full_name);
  const safePhotoUrl = sanitizeMediaUri(profileUser.profile_photo);
  const hasPhoto = !!safePhotoUrl;

  const trustColors = getTrustColors(trustLevel);

  // Stats line — counts are shown on the tabs instead
  const statsParts: string[] = [];
  if (metroName) statsParts.push(metroName);
  statsParts.push(`Joined ${memberSinceYear}`);

  // Tabs
  const tabs: { id: ProfileTab; label: string; count?: number }[] = [
    { id: 'posts', label: 'Posts', count: userPosts.length },
    { id: 'events', label: 'Events', count: userEvents.length },
    { id: 'listings', label: 'Listings', count: userListings.length },
    { id: 'about', label: 'About' },
  ];

  // ── Tab content renderers ───────────────────
  const renderPosts = (): React.ReactElement => {
    if (postsLoading) {
      return <Text style={styles.emptyText}>Loading\u2026</Text>;
    }
    if (userPosts.length === 0) {
      if (isOwnProfile) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTextInner}>
              You haven{'\u2019'}t posted anything yet.
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => { navigation.navigate('CreatePost' as never); }}
              activeOpacity={0.75}
            >
              <Text style={styles.emptyCtaText}>Start a post</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <Text style={styles.emptyText}>
          {firstName} hasn{'\u2019'}t posted anything yet.
        </Text>
      );
    }
    return (
      <View style={styles.rowList}>
        {userPosts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.card}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            activeOpacity={0.75}
          >
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {post.title}
              </Text>
              <Text
                style={[
                  styles.rowScope,
                  post.is_global && styles.rowScopeGlobal,
                ]}
              >
                {post.is_global ? 'GLOBAL' : 'LOCAL'}
              </Text>
            </View>
            {post.description ? (
              <Text style={styles.rowDescription} numberOfLines={2}>
                {post.description}
              </Text>
            ) : null}
            <View style={styles.rowMeta}>
              <Text style={styles.rowMetaText}>
                {formatRelativeTime(new Date(post.created_at))}
              </Text>
              <Text style={styles.rowMetaText}>
                {pluralize(post.likes_count || 0, 'like')}
              </Text>
              <Text style={styles.rowMetaText}>
                {pluralize(post.comments_count || 0, 'comment')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEvents = (): React.ReactElement => {
    if (eventsLoading) {
      return <Text style={styles.emptyText}>Loading\u2026</Text>;
    }
    if (userEvents.length === 0) {
      return (
        <Text style={styles.emptyText}>
          {firstName} hasn{'\u2019'}t organized any events.
        </Text>
      );
    }
    return (
      <View style={styles.rowList}>
        {userEvents.map((event) => {
          const isPast =
            new Date(event.end_date ?? event.start_date) < new Date();
          const isCancelled = event.status === 'cancelled';
          const statusLabel = isCancelled
            ? 'Cancelled'
            : isPast
              ? 'Past'
              : null;
          return (
            <TouchableOpacity
              key={event.id}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => {
                const rootNavigation = navigation.getParent();
                if (!rootNavigation) return;
                (rootNavigation.navigate as (...args: unknown[]) => void)('Events', {
                  screen: 'EventDetail',
                  params: { eventId: event.id },
                });
              }}
            >
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text
                  style={[
                    styles.rowScope,
                    event.is_global && styles.rowScopeGlobal,
                  ]}
                >
                  {event.is_global ? 'GLOBAL' : 'LOCAL'}
                </Text>
              </View>
              <Text style={styles.rowDescription} numberOfLines={1}>
                {new Date(event.start_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' \u00b7 '}
                {event.location_name}
              </Text>
              <View style={styles.rowMeta}>
                <Text style={styles.rowMetaText}>
                  {pluralize(event.rsvp_count || 0, 'going')}
                </Text>
                {statusLabel && (
                  <Text style={styles.rowMetaText}>{statusLabel}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderListings = (): React.ReactElement => {
    if (listingsLoading) {
      return <Text style={styles.emptyText}>Loading\u2026</Text>;
    }
    if (userListings.length === 0) {
      if (isOwnProfile) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTextInner}>
              You have no active listings.
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  (parent.navigate as (...args: unknown[]) => void)('Marketplace', {
                    screen: 'CreateListing',
                  });
                }
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.emptyCtaText}>Post a listing</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <Text style={styles.emptyText}>
          {firstName} has no active listings.
        </Text>
      );
    }
    return (
      <View style={styles.rowList}>
        {userListings.map((listing) => {
          const thumb =
            listing.photos && listing.photos.length > 0
              ? listing.photos[0]
              : null;
          const price = formatPrice(listing);
          const categoryName = listing.category?.name || 'Marketplace';
          return (
            <TouchableOpacity
              key={listing.id}
              style={styles.listingCard}
              activeOpacity={0.75}
              onPress={() => handleListingPress(listing.id)}
            >
              {thumb ? (
                <Image
                  source={thumb}
                  style={styles.listingThumb}
                  contentFit="cover"
                  accessibilityLabel=""
                />
              ) : (
                <View style={styles.listingThumbPlaceholder}>
                  <Text style={styles.listingThumbPlaceholderText}>
                    {categoryName.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.listingBody}>
                <Text style={styles.listingTitle} numberOfLines={2}>
                  {listing.title}
                </Text>
                <View style={styles.rowMeta}>
                  {price ? (
                    <Text style={styles.listingPrice}>{price}</Text>
                  ) : null}
                  <Text style={styles.rowMetaText}>{categoryName}</Text>
                  <Text style={styles.rowMetaText}>
                    {formatRelativeTime(new Date(listing.created_at))}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderAbout = (): React.ReactElement => (
    <View style={styles.aboutCard}>
      {profileUser.bio ? (
        <View style={styles.aboutBioBlock}>
          <Text style={styles.aboutLabel}>BIO</Text>
          <Text style={styles.aboutBio}>{profileUser.bio}</Text>
        </View>
      ) : null}
      <View style={styles.aboutRow}>
        <Text style={styles.aboutLabel}>LOCATION</Text>
        <Text style={styles.aboutValue}>{metroName || 'Not set'}</Text>
      </View>
      <View style={styles.aboutRow}>
        <Text style={styles.aboutLabel}>MEMBER SINCE</Text>
        <Text style={styles.aboutValue}>{memberSinceYear}</Text>
      </View>
      <View style={styles.aboutRow}>
        <Text style={styles.aboutLabel}>TRUST LEVEL</Text>
        <View style={[styles.trustChip, { backgroundColor: trustColors.bg }]}>
          <View style={[styles.trustDot, { backgroundColor: trustColors.fg }]} />
          <Text style={[styles.trustChipText, { color: trustColors.fg }]}>
            Level {trustLevel} {'·'} {getTrustLabel(trustLevel)}
          </Text>
        </View>
      </View>
      <View style={styles.aboutDivider} />
      <View style={styles.aboutRow}>
        <Text style={styles.aboutLabel}>POSTS</Text>
        <Text style={styles.aboutValue}>{userPosts.length}</Text>
      </View>
      <View style={styles.aboutRow}>
        <Text style={styles.aboutLabel}>EVENTS ORGANIZED</Text>
        <Text style={styles.aboutValue}>{userEvents.length}</Text>
      </View>
      <View style={styles.aboutRow}>
        <Text style={styles.aboutLabel}>ACTIVE LISTINGS</Text>
        <Text style={styles.aboutValue}>{userListings.length}</Text>
      </View>
    </View>
  );

  // ── Render ──────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner — gradient block behind avatar */}
        <View style={styles.banner} />

        {/* Profile card — overlaps banner bottom */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardTop}>
            <View style={styles.avatarRing}>
              {hasPhoto ? (
                <Image
                  source={safePhotoUrl}
                  style={styles.avatarPhoto}
                  contentFit="cover"
                  transition={200}
                  accessibilityLabel={`${publicName} profile photo`}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{initials}</Text>
                </View>
              )}
            </View>

            <View style={styles.identityInline}>
              <Text style={styles.displayName} numberOfLines={2}>
                {publicName}
              </Text>
              <View style={[styles.trustChip, { backgroundColor: trustColors.bg }]}>
                <View
                  style={[styles.trustDot, { backgroundColor: trustColors.fg }]}
                />
                <Text style={[styles.trustChipText, { color: trustColors.fg }]}>
                  Level {trustLevel} {'·'} {getTrustLabel(trustLevel)}
                </Text>
              </View>
            </View>
          </View>

          {/* Body */}
          <View style={styles.profileBody}>
            {trustLevel === TrustLevel.NEW && !isOwnProfile ? (
              <Text style={styles.newMemberHint}>
                New to Nepally \u2014 message carefully.
              </Text>
            ) : null}

            {profileUser.bio ? (
              <Text style={styles.bio}>{profileUser.bio}</Text>
            ) : null}

            {/* Stats — Reddit-style compact */}
            <View style={styles.statsRow}>
              {statsParts.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 ? (
                    <Text style={styles.statDot}>{'\u00b7'}</Text>
                  ) : null}
                  <Text style={styles.statText}>{item}</Text>
                </React.Fragment>
              ))}
            </View>

            {/* Follow button */}
            {!isOwnProfile ? (
              <FollowButton
                supabase={supabase}
                viewerId={currentUser?.id ?? null}
                targetUserId={profileUser.id}
              />
            ) : null}

            {/* Follower / following counts */}
            <View style={styles.countsRow}>
              <Text style={styles.count}>{profileUser.follower_count ?? 0} followers</Text>
              <Text style={styles.countDot}>·</Text>
              <Text style={styles.count}>{profileUser.following_count ?? 0} following</Text>
            </View>

            {/* Identity chips */}
            <View style={styles.chipsRow}>
              {profileUser.hometown_district ? (
                <View style={styles.identityChip}>
                  <Text style={styles.identityChipText}>{profileUser.hometown_district}</Text>
                </View>
              ) : null}
              {profileUser.college ? (
                <View style={styles.identityChip}>
                  <Text style={styles.identityChipText}>{profileUser.college}</Text>
                </View>
              ) : null}
              {typeof profileUser.years_in_us === 'number' ? (
                <View style={styles.identityChip}>
                  <Text style={styles.identityChipText}>{profileUser.years_in_us} years in US</Text>
                </View>
              ) : null}
              {(profileUser.languages ?? []).map((code) => (
                <View key={code} style={styles.identityChip}>
                  <Text style={styles.identityChipText}>
                    {LANGUAGE_LABELS[code as LanguageCode] ?? code}
                  </Text>
                </View>
              ))}
            </View>

            {typeof helperScore === 'number' && helperScore >= HELPER_SCORE_VISIBILITY_THRESHOLD ? (
              <Text style={styles.helperBadge}>🙏 Helped {helperScore} people this year</Text>
            ) : null}

            {/* CTA */}
            {!isOwnProfile ? (
              <TouchableOpacity
                style={[
                  styles.messageCta,
                  messagingLoading && styles.messageCtaDisabled,
                ]}
                onPress={handleMessage}
                disabled={messagingLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.messageCtaText}>
                  {messagingLoading
                    ? 'Opening conversation\u2026'
                    : `Message ${publicName}`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Tab rail */}
        <View
          style={styles.tabRail}
          accessibilityRole="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const countSuffix =
              tab.count !== undefined && tab.count > 0 ? `, ${tab.count}` : '';
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${tab.label}${countSuffix}`}
              >
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 ? (
                    <Text style={styles.tabCount}> {tab.count}</Text>
                  ) : null}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'posts' && renderPosts()}
          {activeTab === 'events' && renderEvents()}
          {activeTab === 'listings' && renderListings()}
          {activeTab === 'about' && renderAbout()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
    paddingHorizontal: spacing.l,
    textAlign: 'center',
  } as TextStyle,
  scrollContent: {
    paddingBottom: spacing.xl,
  } as ViewStyle,

  // ── Banner ──────────────────────────────────
  banner: {
    height: 120,
    backgroundColor: colors.primary.main,
  } as ViewStyle,

  // ── Profile card ────────────────────────────
  profileCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.xs,
    marginTop: -40,
    borderRadius: borderRadius.card,
    padding: spacing.s,
    paddingTop: 0,
    ...shadows.card,
  } as ViewStyle,
  profileCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.s,
    marginTop: -24,
    marginBottom: spacing.xs,
  } as ViewStyle,

  // ── Avatar ──────────────────────────────────
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.card,
  } as ViewStyle,
  avatarPhoto: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.surfaceMuted,
  } as ImageStyle,
  avatarFallback: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  avatarFallbackText: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    color: colors.primary.main,
    letterSpacing: -0.5,
  } as TextStyle,

  // ── Identity inline ─────────────────────────
  identityInline: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
    paddingBottom: spacing.xxs,
  } as ViewStyle,
  displayName: {
    ...typography.h3,
    color: colors.text.primary,
  } as TextStyle,

  // ── Trust chip ──────────────────────────────
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  } as ViewStyle,
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  trustChipText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.01,
  } as TextStyle,

  // ── Profile body ────────────────────────────
  profileBody: {
    gap: spacing.xs,
  } as ViewStyle,
  newMemberHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  } as TextStyle,
  bio: {
    ...typography.body,
    color: colors.text.secondary,
  } as TextStyle,
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  statText: {
    ...typography.caption,
    color: colors.text.tertiary,
  } as TextStyle,
  statDot: {
    ...typography.caption,
    color: colors.border,
  } as TextStyle,

  // ── CTA ─────────────────────────────────────
  messageCta: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  messageCtaDisabled: {
    opacity: 0.6,
  } as ViewStyle,
  messageCtaText: {
    ...typography.button,
    color: colors.white,
  } as TextStyle,

  // ── Tab rail ────────────────────────────────
  tabRail: {
    flexDirection: 'row',
    marginHorizontal: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    ...shadows.card,
    overflow: 'hidden',
  } as ViewStyle,
  tab: {
    flex: 1,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.card,
  } as ViewStyle,
  tabActive: {
    backgroundColor: 'rgba(21, 101, 192, 0.08)',
  } as ViewStyle,
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.text.tertiary,
    fontWeight: '500',
  } as TextStyle,
  tabLabelActive: {
    fontFamily: fontFamily.semibold,
    color: colors.primary.main,
    fontWeight: '600',
  } as TextStyle,
  tabCount: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '400',
  } as TextStyle,

  // ── Content area ────────────────────────────
  content: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  } as ViewStyle,

  // ── Empty states ────────────────────────────
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    paddingVertical: spacing.m,
    textAlign: 'center',
  } as TextStyle,
  emptyState: {
    paddingVertical: spacing.m,
    gap: spacing.s,
    alignItems: 'center',
  } as ViewStyle,
  emptyTextInner: {
    ...typography.body,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  } as TextStyle,
  emptyCta: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyCtaText: {
    ...typography.button,
    color: colors.text.primary,
  } as TextStyle,

  // ── Card rows (posts, events) ───────────────
  rowList: {
    gap: spacing.xs,
  } as ViewStyle,
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  } as ViewStyle,
  rowTitle: {
    ...typography.body,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.text.primary,
    flex: 1,
  } as TextStyle,
  rowScope: {
    ...typography.label,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.text.tertiary,
    letterSpacing: 0.6,
  } as TextStyle,
  rowScopeGlobal: {
    color: colors.primary.main,
  } as TextStyle,
  rowDescription: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  } as TextStyle,
  rowMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  } as ViewStyle,
  rowMetaText: {
    ...typography.caption,
    color: colors.text.tertiary,
  } as TextStyle,

  // ── Listing cards ───────────────────────────
  listingCard: {
    flexDirection: 'row',
    gap: spacing.s,
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  listingThumb: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.button,
    backgroundColor: colors.surfaceMuted,
  } as ImageStyle,
  listingThumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.button,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  listingThumbPlaceholderText: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: colors.text.tertiary,
  } as TextStyle,
  listingBody: {
    flex: 1,
    gap: spacing.xxs,
  } as ViewStyle,
  listingTitle: {
    ...typography.body,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    color: colors.text.primary,
  } as TextStyle,
  listingPrice: {
    ...typography.body,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.text.primary,
  } as TextStyle,

  // ── Follow counts + identity chips ──────────
  countsRow: { flexDirection: 'row', marginTop: 12 } as ViewStyle,
  count: { fontSize: 14, color: '#555' } as TextStyle,
  countDot: { marginHorizontal: 6, color: '#999' } as TextStyle,
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 } as ViewStyle,
  identityChip: {
    backgroundColor: '#f4f4f4',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  } as ViewStyle,
  identityChipText: { fontSize: 12, color: '#333' } as TextStyle,
  helperBadge: {
    marginTop: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  } as TextStyle,

  // ── About card ──────────────────────────────
  aboutCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  aboutBioBlock: {
    gap: spacing.xxs,
    paddingBottom: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xxs,
  } as ViewStyle,
  aboutBio: {
    ...typography.body,
    color: colors.text.secondary,
  } as TextStyle,
  aboutDivider: {
    height: spacing.xxs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  } as ViewStyle,
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  } as ViewStyle,
  aboutLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.6,
  } as TextStyle,
  aboutValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
    textAlign: 'right',
  } as TextStyle,
});

// Re-export for tests.
export const PROFILE_TEST_COLORS = colors;
