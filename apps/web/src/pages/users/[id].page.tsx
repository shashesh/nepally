import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  TRUST_LEVELS,
  getUserById,
  getPostsByAuthorId,
  getEventsByOrganizer,
  getActiveListingsBySeller,
  getOrCreateConversation,
  formatRelativeTime,
  formatPublicName,
  LANGUAGE_LABELS,
  getHelperScore,
  HELPER_SCORE_VISIBILITY_THRESHOLD,
  type LanguageCode,
} from '@nepally/shared';
import type {
  PublicUser,
  Post,
  TrustLevel,
  Event,
  MarketplaceListing,
} from '@nepally/shared';
import { FollowButton } from '../../components/users/FollowButton';
import styles from '../../styles/PublicProfile.module.css';

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

export default function PublicProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [userListings, setUserListings] = useState<MarketplaceListing[]>([]);
  const [metroName, setMetroName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [helperScore, setHelperScore] = useState<number | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    let isMounted = true;
    const currentId = id;

    async function loadProfile(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await getUserById(supabase, currentId);

      if (!isMounted) return;

      if (result.error || !result.data) {
        setError(
          'We couldn\u2019t find this member. They may have deleted their account.'
        );
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
        if (isMounted && metro) {
          setMetroName(`${metro.name}, ${metro.state}`);
        }
      }
    }

    async function loadPosts(): Promise<void> {
      setPostsLoading(true);
      const result = await getPostsByAuthorId(supabase, currentId, 30);
      if (!isMounted) return;
      setUserPosts(result.data || []);
      setPostsLoading(false);
    }

    async function loadEvents(): Promise<void> {
      setEventsLoading(true);
      const result = await getEventsByOrganizer(supabase, currentId, 50);
      if (!isMounted) return;
      setUserEvents(result.data || []);
      setEventsLoading(false);
    }

    async function loadListings(): Promise<void> {
      setListingsLoading(true);
      const result = await getActiveListingsBySeller(supabase, currentId, 30);
      if (!isMounted) return;
      setUserListings(result.data || []);
      setListingsLoading(false);
    }

    async function loadHelperScore(): Promise<void> {
      const result = await getHelperScore(supabase, currentId);
      if (!isMounted) return;
      setHelperScore(result.data?.helperScore ?? 0);
    }

    loadProfile();
    loadPosts();
    loadEvents();
    loadListings();
    loadHelperScore();

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function handleMessage(): Promise<void> {
    if (!currentUser || !profileUser) {
      router.push('/login');
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
    setMessagingLoading(false);

    if (result.data) {
      router.push(`/messages/${result.data.conversationId}`);
    } else {
      notifications.show({
        message: 'Failed to start conversation. Please try again.',
        color: 'red',
      });
    }
  }

  const publicName = useMemo(
    () => (profileUser ? formatPublicName(profileUser.full_name) : ''),
    [profileUser]
  );

  const firstName = useMemo(() => {
    if (!profileUser) return '';
    return profileUser.full_name.trim().split(/\s+/)[0] ?? profileUser.full_name;
  }, [profileUser]);

  const isOwnProfile = currentUser?.id === profileUser?.id;

  // ── Loading skeleton ──────────────────────────
  if (loading) {
    return (
      <>
        <Head>
          <title>Profile &middot; Nepally</title>
        </Head>
        <div className={styles.skeletonPage} aria-busy="true" aria-live="polite">
          <div className={styles.skeletonBanner} />
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonCardInner}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonLines}>
                <div
                  className={`${styles.skeletonLine} ${styles.skeletonLineDisplay}`}
                />
                <div
                  className={`${styles.skeletonLine} ${styles.skeletonLineChip}`}
                />
                <div
                  className={`${styles.skeletonLine} ${styles.skeletonLineMeta}`}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Error state ───────────────────────────────
  if (error || !profileUser) {
    return (
      <>
        <Head>
          <title>Profile &middot; Nepally</title>
        </Head>
        <div className={styles.page}>
          <p className={styles.notice}>
            {error || 'Profile not found.'}{' '}
            <Link href="/" className={styles.noticeLink}>
              Back to feed
            </Link>
          </p>
        </div>
      </>
    );
  }

  // ── Derived values ────────────────────────────
  const trustConfig = TRUST_LEVELS[profileUser.trust_level as TrustLevel];
  const trustName = trustConfig?.name || 'Member';
  const trustClass =
    profileUser.trust_level === 0
      ? styles.trustNew
      : profileUser.trust_level === 1
        ? styles.trustVerified
        : styles.trustContributor;

  const memberSinceYear = new Date(profileUser.created_at).getFullYear();
  const photoUrl = profileUser.profile_photo;
  const initials = getInitials(profileUser.full_name);

  const messageLabel = !currentUser
    ? 'Sign in to message'
    : `Message ${publicName}`;

  // ── Tab content renderers ─────────────────────
  function renderPosts(): React.ReactElement {
    if (postsLoading) {
      return <p className={styles.emptyMessage}>Loading\u2026</p>;
    }
    if (userPosts.length === 0) {
      if (isOwnProfile) {
        return (
          <p className={styles.emptyMessage}>
            You haven&apos;t posted anything yet.
            <Link href="/posts/new">Start a post &rarr;</Link>
          </p>
        );
      }
      return (
        <p className={styles.emptyMessage}>
          {firstName} hasn&apos;t posted anything yet.
        </p>
      );
    }

    return (
      <div className={styles.rowList}>
        {userPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            className={styles.rowItem}
          >
            <div className={styles.rowTop}>
              <span className={styles.rowTitle}>{post.title}</span>
              <span
                className={`${styles.rowScope}${
                  post.is_global ? ` ${styles.rowScopeGlobal}` : ''
                }`}
              >
                {post.is_global ? 'Global' : 'Local'}
              </span>
            </div>
            {post.description && (
              <p className={styles.rowDescription}>{post.description}</p>
            )}
            <div className={styles.rowMeta}>
              <span>{formatRelativeTime(new Date(post.created_at))}</span>
              <span>{pluralize(post.likes_count || 0, 'like')}</span>
              <span>{pluralize(post.comments_count || 0, 'comment')}</span>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  function renderEvents(): React.ReactElement {
    if (eventsLoading) {
      return <p className={styles.emptyMessage}>Loading\u2026</p>;
    }
    if (userEvents.length === 0) {
      return (
        <p className={styles.emptyMessage}>
          {firstName} hasn&apos;t organized any events.
        </p>
      );
    }

    return (
      <div className={styles.rowList}>
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
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className={styles.rowItem}
            >
              <div className={styles.rowTop}>
                <span className={styles.rowTitle}>{event.title}</span>
                <span
                  className={`${styles.rowScope}${
                    event.is_global ? ` ${styles.rowScopeGlobal}` : ''
                  }`}
                >
                  {event.is_global ? 'Global' : 'Local'}
                </span>
              </div>
              <p className={styles.rowDescription}>
                {new Date(event.start_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' \u00b7 '}
                {event.location_name}
              </p>
              <div className={styles.rowMeta}>
                <span>{pluralize(event.rsvp_count || 0, 'going')}</span>
                {statusLabel && <span>{statusLabel}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  function renderListings(): React.ReactElement {
    if (listingsLoading) {
      return <p className={styles.emptyMessage}>Loading\u2026</p>;
    }
    if (userListings.length === 0) {
      if (isOwnProfile) {
        return (
          <p className={styles.emptyMessage}>
            You haven&apos;t listed anything yet.
            <Link href="/marketplace/new">Post a listing &rarr;</Link>
          </p>
        );
      }
      return (
        <p className={styles.emptyMessage}>
          {firstName} has no active listings.
        </p>
      );
    }

    return (
      <div className={styles.rowList}>
        {userListings.map((listing) => {
          const thumb =
            listing.photos && listing.photos.length > 0
              ? listing.photos[0]
              : null;
          const price = formatPrice(listing);
          const categoryName = listing.category?.name || 'Marketplace';

          return (
            <Link
              key={listing.id}
              href={`/marketplace/listing/${listing.id}`}
              className={styles.listingRow}
            >
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt=""
                  className={styles.listingThumb}
                  width={80}
                  height={80}
                />
              ) : (
                <div
                  className={styles.listingThumbPlaceholder}
                  aria-hidden="true"
                >
                  {categoryName.charAt(0)}
                </div>
              )}
              <div className={styles.listingBody}>
                <span className={styles.listingTitle}>{listing.title}</span>
                <div className={styles.rowMeta}>
                  {price && <span className={styles.listingPrice}>{price}</span>}
                  <span className={styles.listingMeta}>{categoryName}</span>
                  <span className={styles.listingMeta}>
                    {formatRelativeTime(new Date(listing.created_at))}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  function renderAbout(): React.ReactElement {
    return (
      <div className={styles.aboutSection}>
        {profileUser?.bio && (
          <div className={styles.aboutBioBlock}>
            <span className={styles.aboutLabel}>Bio</span>
            <p className={styles.aboutBio}>{profileUser.bio}</p>
          </div>
        )}
        <div className={styles.aboutRow}>
          <span className={styles.aboutLabel}>Location</span>
          <span className={styles.aboutValue}>{metroName || 'Not set'}</span>
        </div>
        <div className={styles.aboutRow}>
          <span className={styles.aboutLabel}>Member since</span>
          <span className={styles.aboutValue}>{memberSinceYear}</span>
        </div>
        <div className={styles.aboutRow}>
          <span className={styles.aboutLabel}>Trust level</span>
          <span className={`${styles.aboutValue} ${styles.aboutTrust}`}>
            <span className={`${styles.trustChip} ${trustClass}`}>
              <span className={styles.trustDot} />
              Level {profileUser?.trust_level ?? 0} &middot; {trustName}
            </span>
          </span>
        </div>
        <div className={styles.aboutDivider} />
        <div className={styles.aboutRow}>
          <span className={styles.aboutLabel}>Posts</span>
          <span className={styles.aboutValue}>{userPosts.length}</span>
        </div>
        <div className={styles.aboutRow}>
          <span className={styles.aboutLabel}>Events organized</span>
          <span className={styles.aboutValue}>{userEvents.length}</span>
        </div>
        <div className={styles.aboutRow}>
          <span className={styles.aboutLabel}>Active listings</span>
          <span className={styles.aboutValue}>{userListings.length}</span>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────
  return (
    <>
      <Head>
        <title>{publicName} &middot; Nepally</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Banner */}
          <div className={styles.banner} />

          {/* Profile card (overlaps banner) */}
          <div className={styles.profileCard}>
            <div className={styles.profileCardTop}>
              <div className={styles.avatarRing}>
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={`${publicName} profile photo`}
                    width={88}
                    height={88}
                    className={styles.avatarPhoto}
                  />
                ) : (
                  <div className={styles.avatarFallback} aria-hidden="true">
                    {initials}
                  </div>
                )}
              </div>

              <div className={styles.identityInline}>
                <h1 className={styles.displayName}>{publicName}</h1>
                <span className={`${styles.trustChip} ${trustClass}`}>
                  <span className={styles.trustDot} />
                  Level {profileUser.trust_level} &middot; {trustName}
                </span>
              </div>
            </div>

            <div className={styles.profileBody}>
              {profileUser.trust_level === 0 && !isOwnProfile && (
                <p className={styles.newMemberHint}>
                  New to Nepally &mdash; message carefully.
                </p>
              )}

              {profileUser.bio ? (
                <p className={styles.bio}>{profileUser.bio}</p>
              ) : isOwnProfile ? (
                <p className={styles.bioEmpty}>
                  <Link href="/profile" className={styles.bioEditLink}>
                    Add a short bio &rarr;
                  </Link>
                </p>
              ) : null}

              {/* Stats row — counts are shown on the tabs */}
              <div className={styles.statsRow}>
                {metroName && (
                  <>
                    <span className={styles.statItem}>{metroName}</span>
                    <span className={styles.statDot}>&middot;</span>
                  </>
                )}
                <span className={styles.statItem}>
                  Joined {memberSinceYear}
                </span>
              </div>

              {/* Follow row — button + follower/following counts */}
              <div className={styles.socialRow}>
                <FollowButton
                  supabase={supabase}
                  viewerId={currentUser?.id ?? null}
                  targetUserId={profileUser.id}
                />
                <span className={styles.followCount}>{profileUser.follower_count ?? 0} followers</span>
                <span className={styles.followDot}>·</span>
                <span className={styles.followCount}>{profileUser.following_count ?? 0} following</span>
              </div>

              {/* Identity chips */}
              {(profileUser.hometown_district ||
                profileUser.college ||
                typeof profileUser.years_in_us === 'number' ||
                (profileUser.languages ?? []).length > 0) && (
                <div className={styles.identityChipRow}>
                  {profileUser.hometown_district && (
                    <span className={styles.identityChip}>{profileUser.hometown_district}</span>
                  )}
                  {profileUser.college && (
                    <span className={styles.identityChip}>{profileUser.college}</span>
                  )}
                  {typeof profileUser.years_in_us === 'number' && (
                    <span className={styles.identityChip}>{profileUser.years_in_us} years in US</span>
                  )}
                  {(profileUser.languages ?? []).map((code) => (
                    <span key={code} className={styles.identityChip}>
                      {LANGUAGE_LABELS[code as LanguageCode] ?? code}
                    </span>
                  ))}
                </div>
              )}

              {typeof helperScore === 'number' && helperScore >= HELPER_SCORE_VISIBILITY_THRESHOLD && (
                <p className={styles.helperBadge}>🙏 Helped {helperScore} people this year</p>
              )}

              {/* CTA */}
              <div className={styles.ctaRow}>
                {isOwnProfile ? (
                  <Link href="/profile" className={styles.editLink}>
                    Edit profile &rarr;
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.messageCta}
                    onClick={handleMessage}
                    disabled={messagingLoading}
                  >
                    {messagingLoading ? 'Opening conversation\u2026' : messageLabel}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tab rail */}
          <div
            className={styles.tabRail}
            role="tablist"
            aria-label="Profile sections"
          >
            {(['posts', 'events', 'listings', 'about'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const label =
                tab === 'posts'
                  ? 'Posts'
                  : tab === 'events'
                    ? 'Events'
                    : tab === 'listings'
                      ? 'Listings'
                      : 'About';
              const count =
                tab === 'posts'
                  ? userPosts.length
                  : tab === 'events'
                    ? userEvents.length
                    : tab === 'listings'
                      ? userListings.length
                      : undefined;
              const tabId = `profile-tab-${tab}`;
              const panelId = `profile-tabpanel-${tab}`;
              return (
                <button
                  key={tab}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={isActive ? 'true' : 'false'}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <span className={styles.tabCount}> {count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div
            className={styles.content}
            role="tabpanel"
            id={`profile-tabpanel-${activeTab}`}
            aria-labelledby={`profile-tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === 'posts' && renderPosts()}
            {activeTab === 'events' && renderEvents()}
            {activeTab === 'listings' && renderListings()}
            {activeTab === 'about' && renderAbout()}
          </div>
        </div>
      </div>
    </>
  );
}
