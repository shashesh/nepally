import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../lib/supabase';
import {
  getPostsByMetroArea,
  deletePost,
  getTags,
  getUserLikedPostIds,
  getUserSavedPostIds,
  savePost,
  unsavePost,
  getOrCreateConversation,
  formatRelativeTime,
  TAG_EMOJI,
} from '@nusa/shared';
import type { Post, Tag } from '@nusa/shared';
import TagFilterBar from '../components/TagFilterBar';
import Avatar from '../components/Avatar';
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoomLevel, setLightboxZoomLevel] = useState(0);
  const [lightboxChromeVisible, setLightboxChromeVisible] = useState(true);
  const latestLoadRequestId = useRef(0);
  const lightboxChromeHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tag-based filtering (multi-select)
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);
  const pageTitle = routeBasePath === '/' ? 'Home - NUSA' : 'Feed - NUSA';
  const queryTags = router.query.tags;

  // Load tags on mount
  useEffect(() => {
    getTags(supabase).then((result) => {
      if (result.data) setAvailableTags(result.data);
    });
  }, []);

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

  const loadPosts = useCallback(async () => {
    if (authLoading) return;

    const requestId = ++latestLoadRequestId.current;

    if (!user) {
      setPosts([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    if (!metroAreaId) {
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
        50
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

      if ('error' in result && result.error) {
        setPosts([]);
        setLoadError('Could not load posts. Please check your connection and try again.');
        return;
      }

      if ('data' in result && result.data) {
        setPosts(result.data);
      } else {
        setPosts([]);
      }
    } catch (error) {
      if (requestId !== latestLoadRequestId.current) return;
      console.error('Failed to load posts:', error);
      setPosts([]);
      setLoadError('Could not load posts. Please check your connection and try again.');
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (requestId === latestLoadRequestId.current) {
        setLoading(false);
      }
    }
  }, [authLoading, user, metroAreaId, selectedTagSlugs]);

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

  function showSaveToast(message: string) {
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    setSaveToast(message);
    saveToastTimerRef.current = setTimeout(() => setSaveToast(null), 2500);
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

  function handleAllChip() {
    setSelectedTagSlugs([]);
    router.replace({ pathname: routeBasePath }, undefined, { shallow: true });
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

  if (!user) return null;

  const firstName = user.full_name?.trim().split(' ')[0] || 'there';
  const sponsoredItems = [
    {
      id: 'biz-1',
      title: 'Sponsor Spotlight',
      description: 'Promote a trusted local business to your metro feed.',
      cta: 'Learn more',
    },
    {
      id: 'event-1',
      title: 'Community Events',
      description: 'Highlight upcoming events and community gatherings near you.',
      cta: 'See opportunities',
    },
  ];

  return (
    <>
      {saveToast && (
        <div className={styles.toast}>{saveToast}</div>
      )}
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
                <button
                  onClick={() => setBannerDismissed(true)}
                  className={styles.dismissBtn}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            <div className={styles.feedHeader}>
              <h1 className={styles.feedTitle}>Community Feed</h1>
            </div>

            <div className={styles.composerCard}>
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

            <TagFilterBar
              tags={availableTags}
              selectedSlugs={selectedTagSlugs}
              onTagToggle={handleTagChipToggle}
              onAllPress={handleAllChip}
            />

            {loading ? (
              <div data-testid="feed-loading" className={styles.loadingState}>
                <div className={styles.skeletonCard}>
                  <div className={styles.skeletonLineLg} />
                  <div className={styles.skeletonLineMd} />
                  <div className={styles.skeletonLineSm} />
                </div>
                <div className={styles.skeletonCard}>
                  <div className={styles.skeletonLineLg} />
                  <div className={styles.skeletonLineMd} />
                  <div className={styles.skeletonLineSm} />
                </div>
              </div>
            ) : loadError ? (
              <div className={styles.errorState}>
                <div className={styles.errorIcon}>⚠️</div>
                <h3>Couldn&apos;t load posts</h3>
                <p>{loadError}</p>
                <button className={styles.retryBtn} onClick={handleRetryLoad}>
                  Retry
                </button>
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
              posts.map((post) => (
                <PostCard
                  key={post.id}
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
                  onSaveToggle={post.author_id !== user?.id ? () => handleSaveToggle(post) : undefined}
                />
              ))
            )}
          </div>
        </section>

        <aside className={styles.sponsoredRail}>
          <h2 className={styles.sponsoredTitle}>Sponsored</h2>
          <div className={styles.sponsoredList}>
            {sponsoredItems.map((item) => (
              <article key={item.id} className={styles.sponsoredCard}>
                <h3 className={styles.sponsoredCardTitle}>{item.title}</h3>
                <p className={styles.sponsoredCardText}>{item.description}</p>
                <button type="button" className={styles.sponsoredCta}>{item.cta}</button>
              </article>
            ))}
          </div>
        </aside>

        {lightboxPhotos.length > 0 && (
          <div className={styles.lightboxOverlay} onClick={closeLightbox} role="presentation">
            <div
              className={styles.lightboxContent}
              onClick={(e) => e.stopPropagation()}
              onMouseMove={resetLightboxChromeTimer}
              onTouchStart={resetLightboxChromeTimer}
            >
              <button
                type="button"
                className={`${styles.lightboxClose} ${styles.lightboxChrome} ${
                  lightboxChromeVisible ? styles.lightboxChromeVisible : styles.lightboxChromeHidden
                }`}
                onClick={closeLightbox}
                aria-label="Close image viewer"
              >
                ✕
              </button>

              <img
                src={lightboxPhotos[lightboxIndex]}
                alt={`Post photo ${lightboxIndex + 1}`}
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
  onSaveToggle?: () => void;
}) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const postMenuRef = useRef<HTMLDivElement>(null);
  const mediaTouchStartXRef = useRef<number | null>(null);
  const isOwnPost = currentUserId === post.author_id;
  const photoUrls = (post.photos || []).filter(Boolean).slice(0, 3);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
      if (postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) {
        setPostMenuOpen(false);
      }
    }

    if (avatarMenuOpen || postMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [avatarMenuOpen, postMenuOpen]);

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
              <button
                className={styles.avatarDropdownItem}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAvatarMenuOpen(false);
                  onAvatarViewProfile?.(post.author_id);
                }}
              >
                View Profile
              </button>
              <button
                className={styles.avatarDropdownItem}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAvatarMenuOpen(false);
                  onAvatarChat?.(post.author_id, post.author?.full_name || 'User');
                }}
              >
                Chat
              </button>
            </div>
          )}
        </div>
        <div className={styles.postAuthorInfo}>
          <div className={styles.postAuthorName}>
            {post.author?.full_name || 'Anonymous'}
          </div>
          <div className={styles.postTimestamp}>
            {formatRelativeTime(new Date(post.created_at))}
          </div>
        </div>
        <div className={styles.postHeaderRight}>
          <span
            className={`${styles.postCategoryBadge} ${
              post.is_global ? styles.postCategoryBadgeGlobal : styles.postCategoryBadgeLocal
            }`}
          >
            {post.is_global ? '🌐 Global' : '📍 Local'}
          </span>

          <div className={styles.postMoreWrapper} ref={postMenuRef}>
            <button
              className={styles.postMoreButton}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setPostMenuOpen((prev) => !prev);
              }}
              aria-label="Post options"
            >
              ⋯
            </button>

            {postMenuOpen && (
              <div className={styles.postMoreMenu}>
                {isOwnPost ? (
                  <>
                    <button className={styles.postMoreItem} onClick={handleEditPost}>Edit Post</button>
                    <button className={styles.postMoreItem} onClick={handleShareMenuClick}>Share Post</button>
                    <button className={`${styles.postMoreItem} ${styles.postMoreItemDanger}`} onClick={handleDeleteMenuClick}>
                      Delete Post
                    </button>
                  </>
                ) : (
                  <>
                    {onSaveToggle && (
                      <button
                        className={styles.postMoreItem}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setPostMenuOpen(false);
                          onSaveToggle();
                        }}
                      >
                        {saved ? 'Unsave Post' : 'Save Post'}
                      </button>
                    )}
                    <button className={styles.postMoreItem} onClick={handleShareMenuClick}>Share Post</button>
                    <button
                      className={`${styles.postMoreItem} ${styles.postMoreItemDanger}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setPostMenuOpen(false);
                        alert('Post reported. Our moderation team will review this post.');
                      }}
                    >
                      Report Post
                    </button>
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
            <img
              src={photoUrls[mediaIndex]}
              alt={`Post image ${mediaIndex + 1}`}
              className={styles.postMediaImg}
              loading="lazy"
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

      {/* Tag pills */}
      {post.tags && post.tags.length > 0 && (
        <div className={styles.tagRow}>
          {post.tags.map((tag) => {
            const emoji = TAG_EMOJI[tag.slug] || '';
            return (
              <span
                key={tag.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick(tag.slug);
                }}
                className={styles.tagPill}
              >
                {emoji ? `${emoji} ${tag.name}` : tag.name}
              </span>
            );
          })}
        </div>
      )}

      <div className={styles.postFooter}>
        <span className={styles.postStat}>
          {liked ? '❤️' : '🤍'} {post.likes_count || 0}
        </span>
        <span className={styles.postStat}>💬 {post.comments_count || 0}</span>
        <span className={styles.postStat}>👁 {post.views_count || 0}</span>
        {onSaveToggle && (
          <button
            className={`${styles.postStatSaveBtn} ${saved ? styles.postStatSaved : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSaveToggle();
            }}
            aria-label={saved ? 'Unsave post' : 'Save post'}
          >
            {saved ? '🔖' : '🏷️'}
          </button>
        )}
      </div>
    </Link>
  );
}
