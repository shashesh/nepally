import React, { useEffect, useState, useCallback } from 'react';
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
  formatRelativeTime,
  TAG_EMOJI,
  TAG_COLORS,
  DEFAULT_TAG_COLOR,
} from '@nusa/shared';
import type { Post, Tag } from '@nusa/shared';
import TagFilterBar from '../components/TagFilterBar';
import styles from '../styles/Feed.module.css';

export default function FeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocation } = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Tag-based filtering (multi-select)
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);

  // Load tags on mount
  useEffect(() => {
    getTags(supabase).then((result) => {
      if (result.data) setAvailableTags(result.data);
    });
  }, []);

  // Parse tag filters from URL query
  useEffect(() => {
    const { tags } = router.query;
    if (tags && typeof tags === 'string') {
      setSelectedTagSlugs(tags.split(',').filter(Boolean));
    }
  }, [router.query]);

  // Redirect if not logged in or no metro area set
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (!user.metro_area_id) {
      router.replace('/onboarding/zip');
    }
  }, [user, router]);

  const metroAreaId = activeLocation?.metro_area_id ?? user?.metro_area_id;

  const loadPosts = useCallback(async () => {
    if (!metroAreaId) return;

    setLoading(true);
    const slugs = selectedTagSlugs.length > 0 ? selectedTagSlugs : undefined;
    const result = await getPostsByMetroArea(
      supabase,
      metroAreaId,
      slugs,
      50
    );

    if (result.data) {
      setPosts(result.data);
    }
    setLoading(false);
  }, [metroAreaId, selectedTagSlugs]);

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
      router.replace({ pathname: '/feed', query }, undefined, { shallow: true });
      return next;
    });
  }

  function handleAllChip() {
    setSelectedTagSlugs([]);
    router.replace({ pathname: '/feed' }, undefined, { shallow: true });
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Feed - NUSA</title>
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
            <Link
              href="/posts/create"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
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
          <div className={styles.loading}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏔️</div>
            <h3>No posts yet</h3>
            <p>
              {selectedTagSlugs.length > 0
                ? 'No posts matching your filters in this area. Try different tags!'
                : 'Be the first to share something with your community!'}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likedIds.has(post.id)}
              onTagClick={handleTagChipToggle}
            />
          ))
        )}
      </div>
    </>
  );
}

function PostCard({
  post,
  liked,
  onTagClick,
}: {
  post: Post;
  liked: boolean;
  onTagClick: (slug: string) => void;
}) {
  return (
    <Link href={`/posts/${post.id}`} className={styles.postCard}>
      <div className={styles.postCardHeader}>
        <div className={styles.postAuthorAvatar}>
          {post.author?.full_name?.charAt(0).toUpperCase() || '?'}
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
          className={styles.postCategoryBadge}
          style={{
            backgroundColor: post.is_global ? '#E3F2FD' : '#E8F5E9',
            color: post.is_global ? '#1565C0' : '#388E3C',
          }}
        >
          {post.is_global ? '🌐 Global' : '📍 Local'}
        </span>
      </div>

      <div className={styles.postTitle}>{post.title}</div>
      <div className={styles.postDescription}>{post.description}</div>

      {/* Tag pills */}
      {post.tags && post.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
          {post.tags.map((tag) => {
            const tagColor = TAG_COLORS[tag.slug] || DEFAULT_TAG_COLOR;
            const emoji = TAG_EMOJI[tag.slug] || '';
            return (
              <span
                key={tag.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick(tag.slug);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 500,
                  color: tagColor,
                  backgroundColor: `${tagColor}26`, // 15% opacity
                  cursor: 'pointer',
                }}
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
