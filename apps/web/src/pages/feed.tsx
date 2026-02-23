import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { supabase } from '../lib/supabase';
import {
  getPostsByMetroArea,
  getTags,
  getUserLikedPostIds,
  getOrCreateConversation,
  formatRelativeTime,
  TAG_EMOJI,
} from '@nusa/shared';
import type { Post, Tag } from '@nusa/shared';
import TagFilterBar from '../components/TagFilterBar';
import Avatar from '../components/Avatar';
import styles from '../styles/Feed.module.css';

interface FeedPageProps {
  routeBasePath?: string;
}

export function FeedPage({ routeBasePath = '/feed' }: FeedPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { activeLocation } = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const latestLoadRequestId = useRef(0);

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
    try {
      const slugs = selectedTagSlugs.length > 0 ? selectedTagSlugs : undefined;
      const requestPromise = getPostsByMetroArea(
        supabase,
        metroAreaId,
        slugs,
        50
      );
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timed out while loading posts')), 12000);
      });
      const result = await Promise.race([requestPromise, timeoutPromise]);

      if (requestId !== latestLoadRequestId.current) return;

      if (result.error) {
        setPosts([]);
        setLoadError('Could not load posts. Please check your connection and try again.');
        return;
      }

      if (result.data) {
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

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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

  if (!user) return null;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className={styles.feedPage}>
        {/* Level 0 Banner */}
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
          <div>
            <h1 className={styles.feedTitle}>Community Feed</h1>
            <p className={styles.metroName}>
              {activeLocation
                ? `${activeLocation.metro_name}, ${activeLocation.metro_state}`
                : 'Your local area'}
              {activeLocation?.is_temporary && (
                <span className={styles.visitingBadge}>
                  (Visiting)
                </span>
              )}
            </p>
          </div>
          {user.trust_level >= 1 && (
            <Link href="/posts/create" className={styles.createPostBtn}>
              + Create Post
            </Link>
          )}
        </div>

        {/* Tag Filter Chips */}
        <TagFilterBar
          tags={availableTags}
          selectedSlugs={selectedTagSlugs}
          onTagToggle={handleTagChipToggle}
          onAllPress={handleAllChip}
        />

        {/* Post List */}
        {loading ? (
          <div className={styles.loadingState}>
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
              onTagClick={handleTagChipToggle}
              currentUserId={user?.id}
              onAvatarChat={handleAvatarChat}
            />
          ))
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
  onTagClick,
  currentUserId,
  onAvatarChat,
}: {
  post: Post;
  liked: boolean;
  onTagClick: (slug: string) => void;
  currentUserId?: string;
  onAvatarChat?: (authorId: string, authorName: string) => void;
}) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const isOwnPost = currentUserId === post.author_id;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }

    if (avatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [avatarMenuOpen]);

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
                  alert('User profiles coming soon');
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
        {/* Local / Global badge */}
        <span
          className={`${styles.postCategoryBadge} ${
            post.is_global ? styles.postCategoryBadgeGlobal : styles.postCategoryBadgeLocal
          }`}
        >
          {post.is_global ? '🌐 Global' : '📍 Local'}
        </span>
      </div>

      <div className={styles.postTitle}>{post.title}</div>
      <div className={styles.postDescription}>{post.description}</div>

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
      </div>
    </Link>
  );
}
