import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ActionIcon, Badge, Button, CloseButton, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core';
import { useClickOutside } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../lib/supabase';
import {
  getPostsByMetroArea,
  deletePost,
  getUserLikedPostIds,
  getUserSavedPostIds,
  savePost,
  unsavePost,
  getOrCreateConversation,
  createReport,
  formatRelativeTime,
  getUpcomingEventsByMetro,
  getSponsoredFeedListings,
  getStickyBusinessListings,
  interleaveSponsoredItems,
  SPONSORED_FEED_INJECTION_INTERVAL,
} from '@nepally/shared';
import type { Post, Event, SponsoredListing } from '@nepally/shared';

type FeedEntry =
  | { kind: 'post'; post: Post }
  | { kind: 'sponsored'; sponsored: SponsoredListing };
import Avatar from '../components/Avatar';
import ReportPostModal from '../components/ReportPostModal';
import styles from '../styles/Feed.module.css';

const LIGHTBOX_ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3, 4] as const;
const LIGHTBOX_CHROME_HIDE_DELAY_MS = 1500;

interface FeedPageProps {
  routeBasePath?: string;
}

export function FeedPage({ routeBasePath = '/feed' }: FeedPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { activeLocation } = useLocation();
  const FEED_PAGE_SIZE = 20;
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const loadingMoreRef = useRef(false);
  const loadSentinelRef = useRef<HTMLDivElement | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoomLevel, setLightboxZoomLevel] = useState(0);
  const [lightboxChromeVisible, setLightboxChromeVisible] = useState(true);
  const [reportModalPostId, setReportModalPostId] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [stickyListings, setStickyListings] = useState<SponsoredListing[]>([]);
  const [sponsoredFeedListings, setSponsoredFeedListings] = useState<SponsoredListing[]>([]);
  const latestLoadRequestId = useRef(0);
  const lightboxChromeHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tag-based filtering (multi-select) — set via sidebar nav links
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);
  const pageTitle = routeBasePath === '/' ? 'Home - Nepally' : 'Feed - Nepally';
  const queryTags = router.query.tags;

  // Parse tag filters from URL query
  useEffect(() => {
    if (!router.isReady) return;

    const nextTags = queryTags && typeof queryTags === 'string'
      ? queryTags.split(',').filter(Boolean)
      : [];

    setSelectedTagSlugs((prev) => {
      if (
        prev.length === nextTags.length &&
        prev.every((slug, index) => slug === nextTags[index])
      ) {
        return prev;
      }
      return nextTags;
    });
  }, [router.isReady, queryTags]);

  // Redirect if not logged in or no metro area set
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
    } else if (!user.metro_area_id) {
      router.replace('/onboarding/zip');
    }
  }, [authLoading, user, router]);

  const metroAreaId = activeLocation?.metro_area_id ?? user?.metro_area_id;
  const userNeedsMetroOnboarding = Boolean(user && !user.metro_area_id);

  function handleReportPost(postId: string) {
    setReportModalPostId(postId);
  }

  async function submitReport(values: { reason: string; description?: string }) {
    if (!user?.id) {
      return { error: 'Please sign in to report posts.' };
    }

    if (!reportModalPostId) {
      return { error: 'Unable to report this post right now. Please try again.' };
    }

    setReportSubmitting(true);
    try {
      const result = await createReport(supabase, {
        reported_by: user.id,
        target_type: 'post',
        target_id: reportModalPostId,
        reason: values.reason,
        description: values.description,
      });

      if (result.error) {
        return { error: result.error.message || 'Failed to submit report. Please try again.' };
      }

      notifications.show({
        message: 'Thanks. Your report has been submitted for review.',
        autoClose: 2500,
      });
      setReportModalPostId(null);
      return {};
    } finally {
      setReportSubmitting(false);
    }
  }

  const loadPosts = useCallback(async () => {
    if (authLoading) return;

    const requestId = ++latestLoadRequestId.current;

    if (!user) {
      setPosts([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    if (userNeedsMetroOnboarding || !metroAreaId) {
      setPosts([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const slugs = selectedTagSlugs.length > 0 ? selectedTagSlugs : undefined;
      const requestPromise = getPostsByMetroArea(
        supabase,
        metroAreaId,
        slugs,
        FEED_PAGE_SIZE,
        0
      );
      const timeoutPromise = new Promise<{ error: Error }>((resolve) => {
        timeoutId = setTimeout(
          () => resolve({ error: new Error('Timed out while loading posts') }),
          12000
        );
      });
      const result = await Promise.race([requestPromise, timeoutPromise]);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (requestId !== latestLoadRequestId.current) return;

      if (!result || typeof result !== 'object') {
        setPosts([]);
        setHasMorePosts(false);
        setLoadError('Could not load posts. Please check your connection and try again.');
        return;
      }

      if ('error' in result && result.error) {
        setPosts([]);
        setHasMorePosts(false);
        setLoadError('Could not load posts. Please check your connection and try again.');
        return;
      }

      if ('data' in result && result.data) {
        setPosts(result.data);
        setHasMorePosts(Boolean((result as { hasMore?: boolean }).hasMore));
      } else {
        setPosts([]);
        setHasMorePosts(false);
      }
    } catch (error) {
      if (requestId !== latestLoadRequestId.current) return;
      console.error('Failed to load posts:', error);
      setPosts([]);
      setHasMorePosts(false);
      setLoadError('Could not load posts. Please check your connection and try again.');
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (requestId === latestLoadRequestId.current) {
        setLoading(false);
      }
    }
  }, [authLoading, user, userNeedsMetroOnboarding, metroAreaId, selectedTagSlugs]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (!metroAreaId || !hasMorePosts || loading) return;

    loadingMoreRef.current = true;
    setLoadingMorePosts(true);
    try {
      const slugs = selectedTagSlugs.length > 0 ? selectedTagSlugs : undefined;
      const result = await getPostsByMetroArea(
        supabase,
        metroAreaId,
        slugs,
        FEED_PAGE_SIZE,
        posts.length
      );
      if (result.data) {
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const next = [...prev];
          for (const p of result.data!) {
            if (!seen.has(p.id)) next.push(p);
          }
          return next;
        });
        setHasMorePosts(Boolean(result.hasMore));
      } else {
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMorePosts(false);
    }
  }, [metroAreaId, hasMorePosts, loading, selectedTagSlugs, posts.length]);

  // IntersectionObserver sentinel for infinite scroll
  useEffect(() => {
    const node = loadSentinelRef.current;
    if (!node) return;
    if (!hasMorePosts || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMorePosts();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMorePosts, loading, loadMorePosts]);

  // Load liked post IDs
  useEffect(() => {
    if (user) {
      getUserLikedPostIds(supabase, user.id).then((result) => {
        if (result.data) {
          setLikedIds(new Set(result.data));
        }
      });
    }
  }, [user]);

  // Load saved post IDs
  useEffect(() => {
    if (user) {
      getUserSavedPostIds(supabase, user.id).then((result) => {
        if (result.data) {
          setSavedIds(new Set(result.data));
        }
      });
    }
  }, [user]);

  // Load upcoming events and sponsored listings for sidebar
  useEffect(() => {
    if (!metroAreaId) return;
    const requestedMetro = metroAreaId;
    getUpcomingEventsByMetro(supabase, requestedMetro, 3).then((result) => {
      if (requestedMetro !== metroAreaId) return; // stale response guard
      if (result.data) {
        setUpcomingEvents(result.data);
      }
    });
    getStickyBusinessListings(supabase, requestedMetro, { limit: 3 }).then((result) => {
      if (requestedMetro !== metroAreaId) return;
      if (result.data) {
        setStickyListings(result.data);
      }
    });
    getSponsoredFeedListings(supabase, requestedMetro, { limit: 5 }).then((result) => {
      if (requestedMetro !== metroAreaId) return;
      if (result.data) {
        setSponsoredFeedListings(result.data);
      }
    });
  }, [metroAreaId]);

  function showSaveToast(message: string) {
    notifications.show({ message, autoClose: 2500 });
  }

  async function handleSaveToggle(post: Post) {
    if (!user) return;
    const wasSaved = savedIds.has(post.id);

    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(post.id);
      else next.add(post.id);
      return next;
    });

    const result = wasSaved
      ? await unsavePost(supabase, post.id)
      : await savePost(supabase, post.id);

    if (result.error) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      showSaveToast('Failed to update saved post.');
    } else {
      showSaveToast(wasSaved ? 'Post unsaved.' : 'Post saved.');
    }
  }

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    return () => {
      if (lightboxChromeHideTimeoutRef.current) {
        clearTimeout(lightboxChromeHideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (lightboxPhotos.length === 0) return;

    function resetChromeTimer() {
      setLightboxChromeVisible(true);
      if (lightboxChromeHideTimeoutRef.current) {
        clearTimeout(lightboxChromeHideTimeoutRef.current);
      }
      lightboxChromeHideTimeoutRef.current = setTimeout(() => {
        setLightboxChromeVisible(false);
      }, LIGHTBOX_CHROME_HIDE_DELAY_MS);
    }

    function closeLightboxFromKey() {
      if (lightboxChromeHideTimeoutRef.current) {
        clearTimeout(lightboxChromeHideTimeoutRef.current);
        lightboxChromeHideTimeoutRef.current = null;
      }
      setLightboxPhotos([]);
      setLightboxIndex(0);
      setLightboxZoomLevel(0);
      setLightboxChromeVisible(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeLightboxFromKey();
      }
      if (event.key === 'ArrowRight') {
        resetChromeTimer();
        setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length);
      }
      if (event.key === 'ArrowLeft') {
        resetChromeTimer();
        setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxPhotos]);

  function clearLightboxChromeTimer() {
    if (lightboxChromeHideTimeoutRef.current) {
      clearTimeout(lightboxChromeHideTimeoutRef.current);
      lightboxChromeHideTimeoutRef.current = null;
    }
  }

  function resetLightboxChromeTimer() {
    setLightboxChromeVisible(true);
    clearLightboxChromeTimer();
    lightboxChromeHideTimeoutRef.current = setTimeout(() => {
      setLightboxChromeVisible(false);
    }, LIGHTBOX_CHROME_HIDE_DELAY_MS);
  }

  function openLightbox(photos: string[], startIndex: number) {
    const safePhotos = photos.filter(Boolean);
    if (safePhotos.length === 0) return;
    const normalizedIndex = Math.min(Math.max(startIndex, 0), safePhotos.length - 1);
    setLightboxPhotos(safePhotos);
    setLightboxIndex(normalizedIndex);
    setLightboxZoomLevel(0);
    resetLightboxChromeTimer();
  }

  function closeLightbox() {
    clearLightboxChromeTimer();
    setLightboxPhotos([]);
    setLightboxIndex(0);
    setLightboxZoomLevel(0);
    setLightboxChromeVisible(true);
  }

  function showNextLightboxPhoto() {
    resetLightboxChromeTimer();
    setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length);
    setLightboxZoomLevel(0);
  }

  function showPreviousLightboxPhoto() {
    resetLightboxChromeTimer();
    setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length);
    setLightboxZoomLevel(0);
  }

  function zoomInLightbox() {
    resetLightboxChromeTimer();
    setLightboxZoomLevel((prev) => Math.min(prev + 1, LIGHTBOX_ZOOM_LEVELS.length - 1));
  }

  function zoomOutLightbox() {
    resetLightboxChromeTimer();
    setLightboxZoomLevel((prev) => Math.max(prev - 1, 0));
  }

  function handleLightboxWheel(event: React.WheelEvent<HTMLImageElement>) {
    resetLightboxChromeTimer();
    event.preventDefault();
    if (event.deltaY < 0) {
      zoomInLightbox();
    } else {
      zoomOutLightbox();
    }
  }

  function getLightboxImageZoomClass(level: number): string {
    if (level === 0) return styles.lightboxImageZoom0;
    if (level === 1) return styles.lightboxImageZoom1;
    if (level === 2) return styles.lightboxImageZoom2;
    if (level === 3) return styles.lightboxImageZoom3;
    if (level === 4) return styles.lightboxImageZoom4;
    if (level === 5) return styles.lightboxImageZoom5;
    return styles.lightboxImageZoom6;
  }

  function handleTagChipToggle(slug: string) {
    setSelectedTagSlugs((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug];
      // Update URL without navigation
      const query = next.length > 0 ? { tags: next.join(',') } : {};
      router.replace({ pathname: routeBasePath, query }, undefined, { shallow: true });
      return next;
    });
  }

  function handleRetryLoad() {
    loadPosts();
  }

  function handleAvatarViewProfile(authorId: string) {
    router.push(`/users/${authorId}`);
  }

  async function handleAvatarChat(authorId: string, authorName: string) {
    if (!user) return;
    const result = await getOrCreateConversation(
      supabase,
      user.id,
      user.full_name,
      authorId,
      authorName
    );
    if (result.data) {
      router.push(`/messages/${result.data.conversationId}`);
    }
  }

  async function handleSharePost(post: Post) {
    const sharePath = `/posts/${post.id}`;
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${sharePath}`
      : sharePath;

    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: post.title,
        text: post.description,
        url: shareUrl,
      });
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard');
    }
  }

  async function handleDeletePost(post: Post) {
    const shouldDelete = confirm('Are you sure you want to delete this post? This cannot be undone.');
    if (!shouldDelete) return;

    const result = await deletePost(supabase, post.id);
    if (result.error) {
      alert('Failed to delete post. Please try again.');
      return;
    }

    setPosts((prev) => prev.filter((item) => item.id !== post.id));
  }

  function handleEditPost(post: Post) {
    router.push(`/posts/create?edit=${post.id}`);
  }

  const feedEntries: FeedEntry[] = useMemo(() => {
    const postEntries: FeedEntry[] = posts.map((post) => ({ kind: 'post', post }));
    const sponsoredEntries: FeedEntry[] = sponsoredFeedListings.map((sponsored) => ({
      kind: 'sponsored',
      sponsored,
    }));
    return interleaveSponsoredItems(postEntries, sponsoredEntries, {
      interval: SPONSORED_FEED_INJECTION_INTERVAL,
    });
  }, [posts, sponsoredFeedListings]);

  if (!user) return null;

  const firstName = user.full_name?.trim().split(' ')[0] || 'there';
  const sponsoredItems = stickyListings.length > 0
    ? stickyListings.map((s) => ({
        id: s.id,
        title: s.listing.title,
        description: s.listing.description?.slice(0, 100) || '',
        cta: 'View Listing',
        label: 'Sponsored',
        href: `/marketplace/listing/${s.listing.id}`,
      }))
    : [
        {
          id: 'biz-1',
          title: 'Himalayan Kitchen',
          description: 'Authentic Nepali cuisine in the heart of your city. Order online or dine in!',
          cta: 'Visit Website',
          label: 'AD',
          href: '#',
        },
        {
          id: 'biz-2',
          title: 'Nepal Travel Co.',
          description: 'Book affordable flights to Kathmandu. Special diaspora fares available now.',
          cta: 'Learn More',
          label: 'AD',
          href: '#',
        },
      ];

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className={styles.feedShell}>
        <section className={styles.feedMain}>
          <div className={styles.feedPage}>
            {user.trust_level === 0 && !bannerDismissed && (
              <div className={styles.levelBanner}>
                <span>
                  ⚠️ You are a new member (Level 0). Verify your account to unlock
                  full posting rights.
                </span>
                <CloseButton
                  onClick={() => setBannerDismissed(true)}
                  aria-label="Dismiss"
                  size="sm"
                  variant="subtle"
                />
              </div>
            )}

            <div className={styles.composerCard}>
              <Avatar
                name={user.full_name || '?'}
                photoUrl={user.profile_photo}
                trustLevel={user.trust_level}
                size="medium"
              />
              <Link
                href={user.trust_level >= 1 ? '/posts/create' : '/profile'}
                className={styles.composerInputLink}
                aria-label="Start a new post"
              >
                What&apos;s on your mind, {firstName}?
              </Link>
              {user.trust_level >= 1 ? (
                <Link href="/posts/create" className={styles.createPostBtn}>
                  Create Post
                </Link>
              ) : (
                <Link href="/profile" className={styles.createPostBtnMuted}>
                  Verify to Post
                </Link>
              )}
            </div>

            {loading ? (
              <Stack data-testid="feed-loading" gap="md">
                {[0, 1].map((i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <Skeleton height={16} width="70%" mb="sm" />
                    <Skeleton height={12} width="50%" mb="xs" />
                    <Skeleton height={12} width="30%" />
                  </div>
                ))}
              </Stack>
            ) : loadError ? (
              <div className={styles.errorState}>
                <Text size="xl" ta="center" mb="xs">⚠️</Text>
                <Text fw={600} ta="center">Couldn&apos;t load posts</Text>
                <Text size="sm" c="dimmed" ta="center" mb="sm">{loadError}</Text>
                <Button variant="outline" onClick={handleRetryLoad}>
                  Retry
                </Button>
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏔️</div>
                <h3>No posts yet</h3>
                <p>
                  {selectedTagSlugs.length > 0
                    ? 'No posts matching your filters in this area. Try different tags!'
                    : 'Be the first to share something with your community!'}
                </p>
                {user.trust_level >= 1 ? (
                  <Link href="/posts/create" className={styles.emptyActionBtn}>
                    Create First Post
                  </Link>
                ) : (
                  <Link href="/profile" className={styles.emptyActionBtnSecondary}>
                    Verify Account to Post
                  </Link>
                )}
              </div>
            ) : (
              feedEntries.map((entry) => {
                if (entry.kind === 'sponsored') {
                  const listing = entry.sponsored.listing;
                  return (
                    <Link
                      key={`sponsored-${entry.sponsored.id}`}
                      href={`/marketplace/listing/${listing.id}`}
                      className={styles.inlineSponsoredCard}
                    >
                      <div className={styles.inlineSponsoredLabel}>Sponsored · Marketplace</div>
                      <h3 className={styles.inlineSponsoredTitle}>{listing.title}</h3>
                      {listing.description && (
                        <p className={styles.inlineSponsoredDescription}>
                          {listing.description.slice(0, 160)}
                          {listing.description.length > 160 ? '…' : ''}
                        </p>
                      )}
                      {listing.price && (
                        <div className={styles.inlineSponsoredPrice}>{listing.price}</div>
                      )}
                    </Link>
                  );
                }
                const post = entry.post;
                return (
                  <PostCard
                    key={`post-${post.id}`}
                    post={post}
                    liked={likedIds.has(post.id)}
                    saved={savedIds.has(post.id)}
                    onTagClick={handleTagChipToggle}
                    currentUserId={user?.id}
                    onAvatarViewProfile={handleAvatarViewProfile}
                    onAvatarChat={handleAvatarChat}
                    onOpenLightbox={openLightbox}
                    onSharePost={handleSharePost}
                    onDeletePost={handleDeletePost}
                    onEditPost={handleEditPost}
                    onReportPost={handleReportPost}
                    onSaveToggle={post.author_id !== user?.id ? () => handleSaveToggle(post) : undefined}
                  />
                );
              })
            )}
            {!loading && !loadError && posts.length > 0 && (
              <>
                {hasMorePosts && (
                  <div ref={loadSentinelRef} className={styles.feedLoadSentinel} aria-hidden="true" />
                )}
                {loadingMorePosts && (
                  <div className={styles.feedFooterLoader} data-testid="feed-loading-more">
                    <Skeleton height={14} width="60%" mb="xs" />
                    <Skeleton height={12} width="40%" />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <aside className={styles.sponsoredRail}>
          <h2 className={styles.sponsoredTitle}>Sponsored</h2>
          <div className={styles.sponsoredList}>
            {sponsoredItems.map((item) => (
              <article key={item.id} className={styles.sponsoredCard}>
                <div className={styles.sponsoredCardImagePlaceholder}>
                  <span className={styles.sponsoredAdLabel}>{item.label}</span>
                </div>
                <div className={styles.sponsoredCardBody}>
                  <h3 className={styles.sponsoredCardTitle}>{item.title}</h3>
                  <p className={styles.sponsoredCardText}>{item.description}</p>
                  <Link href={item.href}>
                    <Button variant="subtle" size="compact-sm">{item.cta}</Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {upcomingEvents.length > 0 && (
            <div className={styles.eventsWidget}>
              <div className={styles.eventsWidgetHeader}>
                <h2 className={styles.eventsWidgetTitle}>Upcoming Events</h2>
                <Link href="/events" className={styles.eventsWidgetViewAll}>
                  View All
                </Link>
              </div>
              <div className={styles.eventsWidgetList}>
                {upcomingEvents.map((event, eventIndex) => {
                  const eventDate = new Date(event.start_date);
                  const month = eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                  const day = eventDate.getDate().toString().padStart(2, '0');
                  const dateColorClasses = [
                    { date: styles.eventsWidgetDateBlue, month: styles.eventsWidgetMonthBlue },
                    { date: styles.eventsWidgetDateAmber, month: styles.eventsWidgetMonthAmber },
                    { date: styles.eventsWidgetDateTeal, month: styles.eventsWidgetMonthTeal },
                    { date: styles.eventsWidgetDatePurple, month: styles.eventsWidgetMonthPurple },
                    { date: styles.eventsWidgetDateRose, month: styles.eventsWidgetMonthRose },
                  ];
                  const colorVariant = dateColorClasses[eventIndex % dateColorClasses.length];
                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={styles.eventsWidgetCard}
                    >
                      <div className={`${styles.eventsWidgetDate} ${colorVariant.date}`}>
                        <span className={`${styles.eventsWidgetMonth} ${colorVariant.month}`}>{month}</span>
                        <span className={styles.eventsWidgetDay}>{day}</span>
                      </div>
                      <div className={styles.eventsWidgetInfo}>
                        <span className={styles.eventsWidgetName}>{event.title}</span>
                        <span className={styles.eventsWidgetLocation}>{event.location_name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {lightboxPhotos.length > 0 && (
          <div className={styles.lightboxOverlay} onClick={closeLightbox} role="presentation">
            <div
              className={styles.lightboxContent}
              onClick={(e) => e.stopPropagation()}
              onMouseMove={resetLightboxChromeTimer}
              onTouchStart={resetLightboxChromeTimer}
            >
              <ActionIcon
                variant="filled"
                color="dark"
                radius="xl"
                className={`${styles.lightboxClose} ${styles.lightboxChrome} ${
                  lightboxChromeVisible ? styles.lightboxChromeVisible : styles.lightboxChromeHidden
                }`}
                onClick={closeLightbox}
                aria-label="Close image viewer"
              >
                ✕
              </ActionIcon>

              <Image
                src={lightboxPhotos[lightboxIndex]}
                alt={`Post photo ${lightboxIndex + 1}`}
                width={1600}
                height={1200}
                className={`${styles.lightboxImage} ${getLightboxImageZoomClass(lightboxZoomLevel)}`}
                onWheel={handleLightboxWheel}
                onDoubleClick={() => {
                  resetLightboxChromeTimer();
                  setLightboxZoomLevel((prev) => (prev === 0 ? 3 : 0));
                }}
              />

              <div
                className={`${styles.lightboxZoomControls} ${styles.lightboxChrome} ${
                  lightboxChromeVisible ? styles.lightboxChromeVisible : styles.lightboxChromeHidden
                }`}
              >
                <button
                  type="button"
                  className={styles.lightboxZoomBtn}
                  onClick={zoomOutLightbox}
                  disabled={lightboxZoomLevel === 0}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className={styles.lightboxZoomLabel}>
                  {Math.round(LIGHTBOX_ZOOM_LEVELS[lightboxZoomLevel] * 100)}%
                </span>
                <button
                  type="button"
                  className={styles.lightboxZoomBtn}
                  onClick={zoomInLightbox}
                  disabled={lightboxZoomLevel === LIGHTBOX_ZOOM_LEVELS.length - 1}
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>

              {lightboxPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.lightboxNavBtn} ${styles.lightboxNavPrev} ${styles.lightboxChrome} ${
                      lightboxChromeVisible ? styles.lightboxChromeVisible : styles.lightboxChromeHidden
                    }`}
                    onClick={showPreviousLightboxPhoto}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={`${styles.lightboxNavBtn} ${styles.lightboxNavNext} ${styles.lightboxChrome} ${
                      lightboxChromeVisible ? styles.lightboxChromeVisible : styles.lightboxChromeHidden
                    }`}
                    onClick={showNextLightboxPhoto}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div
                    className={`${styles.lightboxCounter} ${styles.lightboxChrome} ${
                      lightboxChromeVisible ? styles.lightboxChromeVisible : styles.lightboxChromeHidden
                    }`}
                  >
                    {lightboxIndex + 1} / {lightboxPhotos.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <ReportPostModal
          opened={Boolean(reportModalPostId)}
          onClose={() => {
            if (!reportSubmitting) {
              setReportModalPostId(null);
            }
          }}
          onSubmit={submitReport}
          submitting={reportSubmitting}
        />
      </div>
    </>
  );
}

export default function FeedRoutePage() {
  return <FeedPage routeBasePath="/feed" />;
}

function PostCard({
  post,
  liked,
  saved,
  onTagClick,
  currentUserId,
  onAvatarViewProfile,
  onAvatarChat,
  onOpenLightbox,
  onSharePost,
  onDeletePost,
  onEditPost,
  onReportPost,
  onSaveToggle,
}: {
  post: Post;
  liked: boolean;
  saved?: boolean;
  onTagClick: (slug: string) => void;
  currentUserId?: string;
  onAvatarViewProfile?: (authorId: string) => void;
  onAvatarChat?: (authorId: string, authorName: string) => void;
  onOpenLightbox: (photos: string[], startIndex: number) => void;
  onSharePost: (post: Post) => Promise<void>;
  onDeletePost: (post: Post) => Promise<void>;
  onEditPost: (post: Post) => void;
  onReportPost: (postId: string) => void;
  onSaveToggle?: () => void;
}) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const avatarMenuRef = useClickOutside(() => setAvatarMenuOpen(false));
  const postMenuRef = useClickOutside(() => setPostMenuOpen(false));
  const mediaTouchStartXRef = useRef<number | null>(null);
  const isOwnPost = currentUserId === post.author_id;
  const photoUrls = (post.photos || []).filter(Boolean).slice(0, 3);

  useEffect(() => {
    setMediaIndex(0);
  }, [post.id]);

  function handleEditPost(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setPostMenuOpen(false);
    onEditPost(post);
  }

  async function handleShareMenuClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setPostMenuOpen(false);
    await onSharePost(post);
  }

  async function handleDeleteMenuClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setPostMenuOpen(false);
    await onDeletePost(post);
  }

  function handleMediaKeyDown(event: React.KeyboardEvent<HTMLDivElement>, startIndex: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    onOpenLightbox(photoUrls, startIndex);
  }

  function showPreviousMedia(event?: React.SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (photoUrls.length <= 1) return;
    setMediaIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length);
  }

  function showNextMedia(event?: React.SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (photoUrls.length <= 1) return;
    setMediaIndex((prev) => (prev + 1) % photoUrls.length);
  }

  function handleMediaTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    mediaTouchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleMediaTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (mediaTouchStartXRef.current === null || photoUrls.length <= 1) return;
    const endX = event.changedTouches[0]?.clientX ?? mediaTouchStartXRef.current;
    const delta = endX - mediaTouchStartXRef.current;
    mediaTouchStartXRef.current = null;

    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      showPreviousMedia();
    } else {
      showNextMedia();
    }
  }

  return (
    <Link href={`/posts/${post.id}`} className={styles.postCard}>
      <div className={styles.postCardHeader}>
        <div className={styles.avatarWrapper} ref={avatarMenuRef}>
          <div
            className={!isOwnPost ? styles.avatarTrigger : styles.avatarTriggerDisabled}
            onClick={(e) => {
              if (!isOwnPost) {
                e.preventDefault();
                e.stopPropagation();
                setAvatarMenuOpen(!avatarMenuOpen);
              }
            }}
          >
            <Avatar
              name={post.author?.full_name || '?'}
              photoUrl={post.author?.profile_photo}
              trustLevel={post.author?.trust_level}
              size="medium"
            />
          </div>
          {avatarMenuOpen && (
            <div className={styles.avatarDropdown}>
              <UnstyledButton
                className={styles.avatarDropdownItem}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAvatarMenuOpen(false);
                  onAvatarViewProfile?.(post.author_id);
                }}
              >
                View Profile
              </UnstyledButton>
              <UnstyledButton
                className={styles.avatarDropdownItem}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAvatarMenuOpen(false);
                  onAvatarChat?.(post.author_id, post.author?.full_name || 'User');
                }}
              >
                Chat
              </UnstyledButton>
            </div>
          )}
        </div>
        <div className={styles.postAuthorInfo}>
          <div className={styles.postAuthorName}>
            {post.author?.full_name || 'Anonymous'}
          </div>
          <div className={styles.postTimestampRow}>
            <span className={styles.postTimestamp}>
              {formatRelativeTime(new Date(post.created_at))}
            </span>
            {post.tags && post.tags.length > 0 && (
              <>
                <span className={styles.postTimestampDot}>·</span>
                {post.tags.map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    className={styles.postTagBadge}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTagClick(tag.slug);
                    }}
                  >
                    {tag.name.toUpperCase()}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
        <div className={styles.postHeaderRight}>
          <Badge
            variant="light"
            color={post.is_global ? 'orange' : 'blue'}
            size="sm"
          >
            {post.is_global ? '🌐 Global' : '📍 Local'}
          </Badge>

          <div className={styles.postMoreWrapper} ref={postMenuRef}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setPostMenuOpen((prev) => !prev);
              }}
              aria-label="Post options"
            >
              ⋯
            </ActionIcon>

            {postMenuOpen && (
              <div className={styles.postMoreMenu}>
                {isOwnPost ? (
                  <>
                    <UnstyledButton className={styles.postMoreItem} onClick={handleEditPost}>Edit Post</UnstyledButton>
                    <UnstyledButton className={styles.postMoreItem} onClick={handleShareMenuClick}>Share Post</UnstyledButton>
                    <UnstyledButton className={`${styles.postMoreItem} ${styles.postMoreItemDanger}`} onClick={handleDeleteMenuClick}>
                      Delete Post
                    </UnstyledButton>
                  </>
                ) : (
                  <>
                    {onSaveToggle && (
                      <UnstyledButton
                        className={styles.postMoreItem}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setPostMenuOpen(false);
                          onSaveToggle();
                        }}
                      >
                        {saved ? 'Unsave Post' : 'Save Post'}
                      </UnstyledButton>
                    )}
                    <UnstyledButton className={styles.postMoreItem} onClick={handleShareMenuClick}>Share Post</UnstyledButton>
                    <UnstyledButton
                      className={`${styles.postMoreItem} ${styles.postMoreItemDanger}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setPostMenuOpen(false);
                        onReportPost(post.id);
                      }}
                    >
                      Report Post
                    </UnstyledButton>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.postTitle}>{post.title}</div>
      <div className={styles.postDescription}>{post.description}</div>

      {/* Photos */}
      {photoUrls.length > 0 && (
        <div className={styles.postMediaWrap}>
          <div
            className={`${styles.postMediaBtn} ${styles.postMediaCarousel}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenLightbox(photoUrls, mediaIndex);
            }}
            onKeyDown={(e) => handleMediaKeyDown(e, mediaIndex)}
            onTouchStart={handleMediaTouchStart}
            onTouchEnd={handleMediaTouchEnd}
            role="button"
            tabIndex={0}
            aria-label="Open post image"
          >
            <Image
              src={photoUrls[mediaIndex]}
              alt={`Post image ${mediaIndex + 1}`}
              fill
              sizes="(max-width: 900px) 100vw, 720px"
              className={styles.postMediaImg}
            />

            {photoUrls.length > 1 && (
              <>
                <div className={styles.postMediaCounter}>
                  {mediaIndex + 1} / {photoUrls.length}
                </div>
                <div
                  className={`${styles.postMediaNavBtn} ${styles.postMediaNavPrev}`}
                  onClick={showPreviousMedia}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      showPreviousMedia(e);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Previous image"
                >
                  ‹
                </div>
                <div
                  className={`${styles.postMediaNavBtn} ${styles.postMediaNavNext}`}
                  onClick={showNextMedia}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      showNextMedia(e);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Next image"
                >
                  ›
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.postFooter}>
        <div className={styles.postFooterLeft}>
          <span className={styles.postStat}>
            <svg className={styles.postStatIcon} width="20" height="20" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className={styles.postStatCount}>{post.likes_count || 0}</span>
          </span>
          <span className={styles.postStat}>
            <svg className={styles.postStatIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className={styles.postStatCount}>{post.comments_count || 0}</span>
          </span>
          <button
            className={styles.postShareBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSharePost(post);
            }}
            aria-label="Share post"
          >
            <svg className={styles.postStatIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>
        <span className={styles.postViewDetails}>
          View Details &rarr;
        </span>
      </div>
    </Link>
  );
}
