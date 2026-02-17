import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  getPostsByMetroArea,
  getUserLikedPostIds,
  formatRelativeTime,
} from '@nusa/shared';
import type { Post, PostCategory } from '@nusa/shared';
import styles from '../styles/Feed.module.css';

const CATEGORIES: { label: string; value: PostCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '🏠 Housing', value: 'housing' },
  { label: '💼 Jobs', value: 'jobs' },
  { label: '🚨 Emergency', value: 'emergency' },
  { label: '✈️ Travel', value: 'travel' },
];

export default function FeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'all'>('all');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Parse category from URL query
  useEffect(() => {
    const { category } = router.query;
    if (category && ['housing', 'jobs', 'emergency', 'travel'].includes(category as string)) {
      setActiveCategory(category as PostCategory);
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

  const loadPosts = useCallback(async () => {
    if (!user?.metro_area_id) return;

    setLoading(true);
    const category = activeCategory === 'all' ? undefined : activeCategory;
    const result = await getPostsByMetroArea(
      supabase,
      user.metro_area_id,
      category,
      50
    );

    if (result.data) {
      setPosts(result.data);
    }
    setLoading(false);
  }, [user?.metro_area_id, activeCategory]);

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

  function handleCategoryChange(category: PostCategory | 'all') {
    setActiveCategory(category);
    // Update URL without navigation
    const query = category === 'all' ? {} : { category };
    router.replace({ pathname: '/feed', query }, undefined, { shallow: true });
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
            <p className={styles.metroName}>Your local area</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className={styles.tabs}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`${styles.tab} ${activeCategory === cat.value ? styles.tabActive : ''}`}
              onClick={() => handleCategoryChange(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Post List */}
        {loading ? (
          <div className={styles.loading}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏔️</div>
            <h3>No posts yet</h3>
            <p>Be the first to share something with your community!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likedIds.has(post.id)}
            />
          ))
        )}
      </div>
    </>
  );
}

function PostCard({ post, liked }: { post: Post; liked: boolean }) {
  const categoryClass =
    post.category === 'housing'
      ? styles.categoryHousing
      : post.category === 'jobs'
        ? styles.categoryJobs
        : post.category === 'emergency'
          ? styles.categoryEmergency
          : styles.categoryTravel;

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
        <span className={`${styles.postCategoryBadge} ${categoryClass}`}>
          {post.category}
        </span>
      </div>

      <div className={styles.postTitle}>{post.title}</div>
      <div className={styles.postDescription}>{post.description}</div>

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
