import React, { useEffect, useState, useRef, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getPostById,
  getPostComments,
  createComment,
  deleteComment,
  likePost,
  unlikePost,
  getUserLikedPostIds,
  getOrCreateConversation,
  buildSingleLevelCommentThreads,
  formatRelativeTime,
  TAG_EMOJI,
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
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

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
    const result = await createComment(supabase, post.id, commentText, replyTargetId ?? undefined);
    setSubmitting(false);

    if (result.data) {
      setComments((prev) => [...prev, result.data!]);
      setCommentText('');
      setReplyTargetId(null);
    }
  }

  async function handleDeleteComment(commentId: string) {
    const result = await deleteComment(supabase, commentId);
    if (!result.error) {
      setComments((prev) => prev.filter((comment) => comment.id !== commentId && comment.parent_comment_id !== commentId));
    }
  }

  async function handleAvatarChat() {
    if (!user || !post || !post.author) return;
    if (post.author_id === user.id) return;

    const result = await getOrCreateConversation(
      supabase,
      user.id,
      user.full_name,
      post.author_id,
      post.author.full_name
    );

    if (result.data) {
      router.push(`/messages/${result.data.conversationId}`);
    }
  }

  async function handleShare() {
    if (!post) return;

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: post.title,
        text: post.description,
        url: shareUrl,
      });
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard');
    }
  }

  const commentThreads = buildSingleLevelCommentThreads(comments);

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
          <div className={styles.postHeader}>
            <div className={styles.avatarWrapper} ref={avatarMenuRef}>
              <div
                className={post.author_id !== user?.id ? styles.avatarTrigger : styles.avatarTriggerDisabled}
                onClick={() => {
                  if (post.author_id !== user?.id) setAvatarMenuOpen(!avatarMenuOpen);
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
                    onClick={() => { setAvatarMenuOpen(false); alert('User profiles coming soon'); }}
                  >
                    View Profile
                  </button>
                  <button
                    className={styles.avatarDropdownItem}
                    onClick={() => { setAvatarMenuOpen(false); handleAvatarChat(); }}
                  >
                    Chat
                  </button>
                </div>
              )}
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                {post.author?.full_name || 'Anonymous'}
              </div>
              <div className={styles.postMeta}>{formatRelativeTime(new Date(post.created_at))}</div>
            </div>
          </div>

          <h1 className={styles.postTitle}>{post.title}</h1>
          <div className={styles.postBody}>{post.description}</div>

          <div className={styles.postActions}>
            <button
              onClick={handleLike}
              className={`${styles.actionBtn} ${liked ? styles.actionBtnActive : ''}`}
            >
              {liked ? '❤️' : '🤍'} {likesCount}
            </button>
            <button className={styles.actionBtn} onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}>
              💬 {comments.length}
            </button>
            <button className={`${styles.actionBtn} ${styles.actionBtnDisabled}`} onClick={() => alert('Saved posts coming soon')}>
              🔖 Save
            </button>
            <button className={styles.actionBtn} onClick={handleShare}>
              ↗ Share
            </button>
          </div>

          <div className={styles.metaRow}>
            <span
              className={`${styles.categoryBadge} ${post.is_global ? styles.globalBadge : styles.localBadge}`}
            >
              {post.is_global ? '🌐 Global' : '📍 Local'}
            </span>

            {post.tags?.map((tag) => {
              const emoji = TAG_EMOJI[tag.slug] || '';
              return (
                <span key={tag.id} className={styles.metaTag}>
                  {emoji ? `${emoji} ${tag.name}` : tag.name}
                </span>
              );
            })}

            {post.location_city && (
              <span className={styles.metaLocation}>{post.location_city}, {post.location_state}</span>
            )}
          </div>

        </div>

        <div className={styles.commentsSection} id="comments">
          <h2 className={styles.commentsTitle}>
            Comments ({comments.length})
          </h2>

          {user && (
            <form onSubmit={handleComment} className={styles.commentForm}>
              {replyTargetId && (
                <div className={styles.replyBanner}>
                  Replying to comment
                  <button type="button" className={styles.replyCancel} onClick={() => setReplyTargetId(null)}>
                    Cancel
                  </button>
                </div>
              )}
              <div className={styles.commentFormRow}>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className={styles.commentInput}
                  placeholder={replyTargetId ? 'Write a reply...' : 'Write a comment...'}
                />
                <button
                  type="submit"
                  className={styles.commentSubmitBtn}
                  disabled={submitting || !commentText.trim()}
                >
                  {submitting ? '...' : 'Post'}
                </button>
              </div>
            </form>
          )}

          {commentThreads.length === 0 ? (
            <div className={styles.noComments}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            commentThreads.map((thread) => (
              <div key={thread.parent.id} className={styles.commentThread}>
                <div className={styles.comment}>
                  <Avatar
                    name={thread.parent.author?.full_name || '?'}
                    photoUrl={thread.parent.author?.profile_photo}
                    trustLevel={thread.parent.author?.trust_level}
                    size="small"
                  />
                  <div className={styles.commentContent}>
                    <span className={styles.commentAuthor}>{thread.parent.author?.full_name || 'Anonymous'}</span>
                    <span className={styles.commentTime}>{formatRelativeTime(new Date(thread.parent.created_at))}</span>
                    <div className={styles.commentText}>{thread.parent.content}</div>
                    <div className={styles.commentActionsRow}>
                      <button type="button" className={styles.inlineLink} onClick={() => setReplyTargetId(thread.parent.id)}>
                        Reply
                      </button>
                      {thread.replies.length > 0 && (
                        <button
                          type="button"
                          className={styles.inlineLink}
                          onClick={() => setExpandedReplies((prev) => ({ ...prev, [thread.parent.id]: !prev[thread.parent.id] }))}
                        >
                          {expandedReplies[thread.parent.id] ? 'Hide replies' : `Show replies (${thread.replies.length})`}
                        </button>
                      )}
                      {thread.parent.author_id === user?.id && (
                        <button type="button" className={styles.inlineLinkDanger} onClick={() => handleDeleteComment(thread.parent.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {expandedReplies[thread.parent.id] && thread.replies.map((reply) => (
                  <div key={reply.id} className={styles.replyRow}>
                    <Avatar
                      name={reply.author?.full_name || '?'}
                      photoUrl={reply.author?.profile_photo}
                      trustLevel={reply.author?.trust_level}
                      size="small"
                    />
                    <div className={styles.commentContent}>
                      <span className={styles.commentAuthor}>{reply.author?.full_name || 'Anonymous'}</span>
                      <span className={styles.commentTime}>{formatRelativeTime(new Date(reply.created_at))}</span>
                      <div className={styles.commentText}>{reply.content}</div>
                      {reply.author_id === user?.id && (
                        <div className={styles.commentActionsRow}>
                          <button type="button" className={styles.inlineLinkDanger} onClick={() => handleDeleteComment(reply.id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
