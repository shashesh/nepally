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
} from '@nusa/shared';
import type { Post, PostComment } from '@nusa/shared';
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

  const catClass =
    post.category === 'housing'
      ? styles.catHousing
      : post.category === 'jobs'
        ? styles.catJobs
        : post.category === 'emergency'
          ? styles.catEmergency
          : styles.catTravel;

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
            <div className={styles.authorAvatar}>
              {post.author?.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                {post.author?.full_name || 'Anonymous'}
              </div>
              <div className={styles.postMeta}>
                {formatRelativeTime(new Date(post.created_at))} ·{' '}
                {post.location_city}, {post.location_state}
              </div>
            </div>
            <span className={`${styles.categoryBadge} ${catClass}`}>
              {post.category}
            </span>
          </div>

          {/* Title & Body */}
          <h1 className={styles.postTitle}>{post.title}</h1>
          <div className={styles.postBody}>{post.description}</div>

          {/* Category-specific Fields */}
          {post.fields && Object.keys(post.fields).length > 0 && (
            <div className={styles.fieldsGrid}>
              {Object.entries(post.fields).map(([key, value]) => (
                <div key={key} className={styles.fieldItem}>
                  <span className={styles.fieldLabel}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className={styles.fieldValue}>
                    {typeof value === 'boolean'
                      ? value
                        ? 'Yes'
                        : 'No'
                      : String(value)}
                  </span>
                </div>
              ))}
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
                <div className={styles.commentAvatar}>
                  {comment.author?.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
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
