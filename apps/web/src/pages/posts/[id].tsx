import React, { useEffect, useState, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getPostById,
  getPostComments,
  createComment,
  likePost,
  unlikePost,
  getUserLikedPostIds,
  getOrCreateConversation,
  formatRelativeTime,
  TAG_EMOJI,
  TAG_COLORS,
  DEFAULT_TAG_COLOR,
} from '@nusa/shared';
import type { Post, PostComment } from '@nusa/shared';
import Avatar from '../../components/Avatar';
import styles from '../../styles/PostDetail.module.css';

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    loadPost(id);
    loadComments(id);
  }, [id]);

  useEffect(() => {
    if (user && post) {
      getUserLikedPostIds(supabase, user.id).then((result) => {
        if (result.data) {
          setLiked(result.data.includes(post.id));
        }
      });
    }
  }, [user, post?.id]);

  async function loadPost(postId: string) {
    setLoading(true);
    const result = await getPostById(supabase, postId);
    if (result.data) {
      setPost(result.data);
      setLikesCount(result.data.likes_count || 0);
    }
    setLoading(false);
  }

  async function loadComments(postId: string) {
    const result = await getPostComments(supabase, postId);
    if (result.data) {
      setComments(result.data);
    }
  }

  async function handleLike() {
    if (!user || !post) return;

    if (liked) {
      setLiked(false);
      setLikesCount((c) => c - 1);
      await unlikePost(supabase, post.id);
    } else {
      setLiked(true);
      setLikesCount((c) => c + 1);
      await likePost(supabase, post.id);
    }
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    if (!user || !post || !commentText.trim()) return;

    setSubmitting(true);
    const result = await createComment(supabase, post.id, commentText);
    setSubmitting(false);

    if (result.data) {
      setComments((prev) => [...prev, result.data!]);
      setCommentText('');
    }
  }

  async function handleMessage() {
    if (!user || !post || !post.author) return;
    if (post.author_id === user.id) return; // Can't message yourself

    const result = await getOrCreateConversation(
      supabase,
      user.id,
      user.full_name,
      post.author_id,
      post.author.full_name,
      post.id
    );

    if (result.data) {
      router.push(`/messages/${result.data.conversationId}`);
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!post) {
    return (
      <div className={styles.loading}>
        <h2>Post not found</h2>
        <Link href="/feed">Back to Feed</Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} - NUSA</title>
      </Head>
      <div className={styles.postPage}>
        <Link href="/feed" className={styles.backLink}>
          ← Back to Feed
        </Link>

        <div className={styles.postDetail}>
          {/* Header */}
          <div className={styles.postHeader}>
            <Avatar
              name={post.author?.full_name || '?'}
              photoUrl={post.author?.profile_photo}
              trustLevel={post.author?.trust_level}
              size="medium"
            />
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                {post.author?.full_name || 'Anonymous'}
              </div>
              <div className={styles.postMeta}>
                {formatRelativeTime(new Date(post.created_at))} ·{' '}
                {post.location_city}, {post.location_state}
              </div>
            </div>
            {/* Local / Global badge */}
            <span
              className={styles.categoryBadge}
              style={{
                backgroundColor: post.is_global ? '#E3F2FD' : '#E8F5E9',
                color: post.is_global ? '#1565C0' : '#388E3C',
              }}
            >
              {post.is_global ? '🌐 Global' : '📍 Local'}
            </span>
          </div>

          {/* Title & Body */}
          <h1 className={styles.postTitle}>{post.title}</h1>
          <div className={styles.postBody}>{post.description}</div>

          {/* Tag pills */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
              {post.tags.map((tag) => {
                const tagColor = TAG_COLORS[tag.slug] || DEFAULT_TAG_COLOR;
                const emoji = TAG_EMOJI[tag.slug] || '';
                return (
                  <span
                    key={tag.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      color: tagColor,
                      backgroundColor: `${tagColor}26`,
                    }}
                  >
                    {emoji ? `${emoji} ${tag.name}` : tag.name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className={styles.postActions}>
            <button
              onClick={handleLike}
              className={`${styles.actionBtn} ${liked ? styles.actionBtnActive : ''}`}
            >
              {liked ? '❤️' : '🤍'} {likesCount}
            </button>
            <span className={styles.actionBtn}>💬 {comments.length}</span>
            {user && post.author_id !== user.id && (
              <button onClick={handleMessage} className={styles.messageBtn}>
                ✉️ Message Author
              </button>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className={styles.commentsSection}>
          <h2 className={styles.commentsTitle}>
            Comments ({comments.length})
          </h2>

          {/* Comment Form */}
          {user && (
            <form onSubmit={handleComment} className={styles.commentForm}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className={styles.commentInput}
                placeholder="Write a comment..."
              />
              <button
                type="submit"
                className={styles.commentSubmitBtn}
                disabled={submitting || !commentText.trim()}
              >
                {submitting ? '...' : 'Post'}
              </button>
            </form>
          )}

          {/* Comment List */}
          {comments.length === 0 ? (
            <div className={styles.noComments}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <Avatar
                  name={comment.author?.full_name || '?'}
                  photoUrl={comment.author?.profile_photo}
                  trustLevel={comment.author?.trust_level}
                  size="small"
                />
                <div className={styles.commentContent}>
                  <span className={styles.commentAuthor}>
                    {comment.author?.full_name || 'Anonymous'}
                  </span>
                  <span className={styles.commentTime}>
                    {formatRelativeTime(new Date(comment.created_at))}
                  </span>
                  <div className={styles.commentText}>{comment.content}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
