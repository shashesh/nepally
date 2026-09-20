import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, CloseButton, Skeleton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
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
import ReportPostModal from '../components/ReportPostModal';
import { PostCard } from '../components/posts/PostCard';
import { PostComposer } from '../components/feed/PostComposer';
import { SponsoredRail } from '../components/feed/SponsoredRail';
import { EmptyState, ErrorState, ImageLightbox, LoadingState, notify, useConfirm } from '../components/ui';
import { MetroPulseStrip } from '../components/pulse/MetroPulseStrip';
import LocationSwitcher from '../components/LocationSwitcher';
import { TopicPills } from '../components/layout/TopicPills';
import { PHONE_MEDIA_QUERY } from '../components/layout/breakpoints';
import styles from '../styles/Feed.module.css';


function parseTagSlugsParam(param: string | undefined): string[] {
  return param ? param.split(',').filter(Boolean) : [];
}

function haveSameTagSlugs(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((slug, index) => slug === b[index]);
}

interface FeedPageProps {
  routeBasePath?: string;
}

export function FeedPage({ routeBasePath = '/feed' }: FeedPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isPhone = useMediaQuery(PHONE_MEDIA_QUERY);
  const { activeLocation } = useLocation();
  const confirm = useConfirm();
  const FEED_PAGE_SIZE = 20;
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const loadingMoreRef = useRef(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [reportModalPostId, setReportModalPostId] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [stickyListings, setStickyListings] = useState<SponsoredListing[]>([]);
  const [sponsoredFeedListings, setSponsoredFeedListings] = useState<SponsoredListing[]>([]);
  const [feedReloadToken, setFeedReloadToken] = useState(0);

  // Tag-based filtering (multi-select) — set via sidebar nav links
  const pageTitle = routeBasePath === '/' ? 'Home - Nepally' : 'Feed - Nepally';
  const queryTags = router.query.tags;
  const queryTagsParam = typeof queryTags === 'string' ? queryTags : undefined;
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>(() =>
    router.isReady ? parseTagSlugsParam(queryTagsParam) : []
  );

  // Mirror tag filters from the URL query once the router is ready. Adjusting
  // state during render (not in an effect) means the first posts request
  // already uses the URL's tags.
  const [syncedTagQuery, setSyncedTagQuery] = useState({
    isReady: router.isReady,
    param: queryTagsParam,
  });
  if (syncedTagQuery.isReady !== router.isReady || syncedTagQuery.param !== queryTagsParam) {
    setSyncedTagQuery({ isReady: router.isReady, param: queryTagsParam });
    if (router.isReady) {
      const nextTags = parseTagSlugsParam(queryTagsParam);
      if (!haveSameTagSlugs(selectedTagSlugs, nextTags)) {
        setSelectedTagSlugs(nextTags);
      }
    }
  }

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

  // When an input of the first-page request changes (or Retry is pressed),
  // show the loading state — or clear the feed when there is nothing to load —
  // during render. The request itself runs in the effect further down.
  const feedRequestInputs = [
    authLoading,
    user,
    userNeedsMetroOnboarding,
    metroAreaId,
    selectedTagSlugs,
    feedReloadToken,
  ] as const;
  const [prevFeedRequestInputs, setPrevFeedRequestInputs] =
    useState<typeof feedRequestInputs | null>(null);
  if (
    !prevFeedRequestInputs ||
    feedRequestInputs.some((input, index) => input !== prevFeedRequestInputs[index])
  ) {
    setPrevFeedRequestInputs(feedRequestInputs);
    if (!authLoading) {
      const canLoadFeed = Boolean(user) && !userNeedsMetroOnboarding && Boolean(metroAreaId);
      setLoading(canLoadFeed);
      setLoadError(null);
      if (!canLoadFeed) {
        setPosts([]);
      }
    }
  }

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

      notify.success('Thanks. Your report has been submitted for review.');
      setReportModalPostId(null);
      return {};
    } finally {
      setReportSubmitting(false);
    }
  }

  // Load the first page of posts. The cleanup cancels a superseded request, so
  // only the latest one updates state.
  useEffect(() => {
    if (authLoading || !user || userNeedsMetroOnboarding || !metroAreaId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    (async () => {
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
        if (cancelled) return;

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
        if (cancelled) return;
        console.error('Failed to load posts:', error);
        setPosts([]);
        setHasMorePosts(false);
        setLoadError('Could not load posts. Please check your connection and try again.');
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [authLoading, user, userNeedsMetroOnboarding, metroAreaId, selectedTagSlugs, feedReloadToken]);

  /**
   * The sentinel is still on screen, so leaving hasMorePosts set would call
   * loadMorePosts again the moment loadingMorePosts clears, in a tight loop of
   * failing requests. useSearchPage stops the same way.
   */
  const stopPagingAfterFailure = useCallback(() => {
    setHasMorePosts(false);
    notify.error('Could not load more posts.');
  }, []);

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
      if (result.error) {
        // getPostsByMetroArea resolves with { error } rather than throwing, so
        // this, not the catch below, is the path a failed page actually takes.
        stopPagingAfterFailure();
      } else if (result.data) {
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
    } catch {
      stopPagingAfterFailure();
    } finally {
      loadingMoreRef.current = false;
      setLoadingMorePosts(false);
    }
  }, [metroAreaId, hasMorePosts, loading, selectedTagSlugs, posts.length, stopPagingAfterFailure]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: hasMorePosts,
    loading: loading || loadingMorePosts,
    onLoadMore: loadMorePosts,
  });

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
    notify.success(message);
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

  function openLightbox(photos: string[], startIndex: number) {
    const safePhotos = photos.filter(Boolean);
    if (safePhotos.length === 0) return;
    setLightboxPhotos(safePhotos);
    setLightboxIndex(Math.min(Math.max(startIndex, 0), safePhotos.length - 1));
  }

  function closeLightbox() {
    setLightboxPhotos([]);
    setLightboxIndex(0);
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
    setFeedReloadToken((token) => token + 1);
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
      notify.success('Link copied to clipboard');
    }
  }

  async function handleDeletePost(post: Post) {
    const shouldDelete = await confirm({
      title: 'Delete post',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!shouldDelete) return;

    const result = await deletePost(supabase, post.id);
    if (result.error) {
      notify.error('Failed to delete post. Please try again.');
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

            {isPhone ? (
              <div className={styles.phoneFilters}>
                <LocationSwitcher />
                <TopicPills />
              </div>
            ) : null}

            <PostComposer
              fullName={user.full_name}
              photoUrl={user.profile_photo}
              trustLevel={user.trust_level}
            />

            {metroAreaId && user?.id ? (
              <MetroPulseStrip
                metroAreaId={metroAreaId}
                metroLabel={activeLocation?.metro_name ?? 'your metro'}
                viewerId={user.id}
              />
            ) : null}

            {loading ? (
              <LoadingState variant="card" count={2} label="Loading posts…" />
            ) : loadError ? (
              <ErrorState title="Couldn't load posts" message={loadError} onRetry={handleRetryLoad} retryLabel="Retry" />
            ) : posts.length === 0 ? (
              <EmptyState
                icon={<span aria-hidden="true">🏔️</span>}
                title="No posts yet"
                description={
                  selectedTagSlugs.length > 0
                    ? 'No posts matching your filters in this area. Try different tags!'
                    : 'Be the first to share something with your community!'
                }
                action={
                  user.trust_level >= 1 ? (
                    <Button component={Link} href="/posts/create">
                      Create First Post
                    </Button>
                  ) : (
                    <Button component={Link} href="/profile" variant="default">
                      Verify Account to Post
                    </Button>
                  )
                }
              />
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
                  <div ref={sentinelRef} className={styles.feedLoadSentinel} aria-hidden="true" />
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

        <SponsoredRail stickyListings={stickyListings} events={upcomingEvents} />

        <ImageLightbox
          photos={lightboxPhotos}
          startIndex={lightboxIndex}
          opened={lightboxPhotos.length > 0}
          onClose={closeLightbox}
        />

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

