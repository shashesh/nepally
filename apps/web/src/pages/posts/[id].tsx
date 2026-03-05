import React, { useEffect, useState, useRef, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  getPostById,
  deletePost,
  getPostComments,
  createComment,
  deleteComment,
  likePost,
  unlikePost,
  getUserLikedPostIds,
  savePost,
  unsavePost,
  getUserSavedPostIds,
  getOrCreateConversation,
  buildSingleLevelCommentThreads,
  formatRelativeTime,
  logClientEvent,
  TAG_EMOJI,
} from '@nusa/shared';
import type { Post, PostComment } from '@nusa/shared';
import Avatar from '../../components/Avatar';
import styles from '../../styles/PostDetail.module.css';

const DETAIL_CAROUSEL_CHROME_HIDE_DELAY_MS = 1500;
const DETAIL_LIGHTBOX_CHROME_HIDE_DELAY_MS = 1500;
const DETAIL_LIGHTBOX_ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3, 4] as const;

type AvatarMenuUser = {
  id: string;
  full_name: string;
};

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarMenuUser, setAvatarMenuUser] = useState<AvatarMenuUser | null>(null);
  const [avatarMenuPosition, setAvatarMenuPosition] = useState({ top: 0, left: 0 });
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [carouselChromeVisible, setCarouselChromeVisible] = useState(true);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoomLevel, setLightboxZoomLevel] = useState(0);
  const [lightboxChromeVisible, setLightboxChromeVisible] = useState(true);
  const touchStartXRef = useRef<number | null>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const postMenuRef = useRef<HTMLDivElement>(null);
  const carouselChromeHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightboxChromeHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    loadPost(id);
    loadComments(id);
  }, [id]);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [post?.id]);

  useEffect(() => {
    return () => {
      if (carouselChromeHideTimeoutRef.current) {
        clearTimeout(carouselChromeHideTimeoutRef.current);
      }
      if (lightboxChromeHideTimeoutRef.current) {
        clearTimeout(lightboxChromeHideTimeoutRef.current);
      }
    };
  }, []);

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
    if (user && post) {
      getUserSavedPostIds(supabase, user.id).then((result) => {
        if (result.data) {
          setSaved(result.data.includes(post.id));
        }
      });
    }
  }, [user, post?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-avatar-menu-root="true"]')) {
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
    if (!avatarMenuOpen || !avatarDropdownRef.current) return;
    avatarDropdownRef.current.style.top = `${avatarMenuPosition.top}px`;
    avatarDropdownRef.current.style.left = `${avatarMenuPosition.left}px`;
  }, [avatarMenuOpen, avatarMenuPosition]);

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

  function showSaveToast(message: string) {
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    setSaveToast(message);
    saveToastTimerRef.current = setTimeout(() => setSaveToast(null), 2500);
  }

  async function handleSave() {
    if (!user || !post) return;
    const wasSaved = saved;

    if (wasSaved) {
      setSaved(false);
      const { error } = await unsavePost(supabase, post.id);
      showSaveToast(error ? 'Failed to unsave post.' : 'Post unsaved.');
    } else {
      setSaved(true);
      const { error } = await savePost(supabase, post.id);
      showSaveToast(error ? 'Failed to save post.' : 'Post saved.');
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
    const shouldDelete = confirm('Delete this comment?');
    if (!shouldDelete) return;

    const result = await deleteComment(supabase, commentId);
    if (result.error) {
      logClientEvent({
        event: 'comment_delete_failed',
        context: {
          platform: 'web',
          commentId,
          userId: user?.id ?? null,
        },
        error: result.error,
      });
      alert(result.error.message || 'Failed to delete comment. Please try again.');
      return;
    }

    setComments((prev) => prev.filter((comment) => comment.id !== commentId && comment.parent_comment_id !== commentId));
  }

  function openAvatarMenu(event: React.MouseEvent<HTMLElement>, menuUser: AvatarMenuUser | null) {
    if (!menuUser) return;
    if (menuUser.id === user?.id) return;

    if (typeof window !== 'undefined') {
      const MENU_WIDTH = 144;
      const MENU_HEIGHT = 90;
      const EDGE_GAP = 8;
      const VERTICAL_OFFSET = 8;

      const maxLeft = Math.max(EDGE_GAP, window.innerWidth - MENU_WIDTH - EDGE_GAP);
      const left = Math.min(Math.max(EDGE_GAP, event.clientX), maxLeft);

      const belowTop = event.clientY + VERTICAL_OFFSET;
      const canOpenBelow = belowTop + MENU_HEIGHT <= window.innerHeight - EDGE_GAP;
      const top = canOpenBelow
        ? belowTop
        : Math.max(EDGE_GAP, event.clientY - MENU_HEIGHT - VERTICAL_OFFSET);

      setAvatarMenuPosition({ top, left });
    }

    setAvatarMenuUser(menuUser);
    setAvatarMenuOpen(true);
  }

  async function handleAvatarChat() {
    if (!user || !avatarMenuUser) return;
    if (avatarMenuUser.id === user.id) return;

    const result = await getOrCreateConversation(
      supabase,
      user.id,
      user.full_name,
      avatarMenuUser.id,
      avatarMenuUser.full_name
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

  function handleEditPost() {
    if (!post) return;
    setPostMenuOpen(false);
    router.push(`/posts/create?edit=${post.id}`);
  }

  async function handleDeletePost() {
    if (!post) return;
    const shouldDelete = confirm('Are you sure you want to delete this post? This cannot be undone.');
    if (!shouldDelete) return;

    setPostMenuOpen(false);
    const result = await deletePost(supabase, post.id);
    if (result.error) {
      alert('Failed to delete post. Please try again.');
      return;
    }

    router.push('/feed');
  }

  const commentThreads = buildSingleLevelCommentThreads(comments);
  const postPhotos = (post?.photos || []).filter(Boolean).slice(0, 3);

  function clearCarouselChromeTimer() {
    if (carouselChromeHideTimeoutRef.current) {
      clearTimeout(carouselChromeHideTimeoutRef.current);
      carouselChromeHideTimeoutRef.current = null;
    }
  }

  function resetCarouselChromeTimer() {
    setCarouselChromeVisible(true);
    if (postPhotos.length <= 1) return;
    clearCarouselChromeTimer();
    carouselChromeHideTimeoutRef.current = setTimeout(() => {
      setCarouselChromeVisible(false);
    }, DETAIL_CAROUSEL_CHROME_HIDE_DELAY_MS);
  }

  useEffect(() => {
    if (postPhotos.length <= 1) {
      clearCarouselChromeTimer();
      setCarouselChromeVisible(true);
      return;
    }

    resetCarouselChromeTimer();
  }, [post?.id, postPhotos.length]);

  useEffect(() => {
    if (lightboxPhotos.length === 0) return;

    function handleLightboxKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeLightbox();
      }
      if (event.key === 'ArrowRight') {
        resetLightboxChromeTimer();
        setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length);
      }
      if (event.key === 'ArrowLeft') {
        resetLightboxChromeTimer();
        setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length);
      }
    }

    document.addEventListener('keydown', handleLightboxKeyDown);
    return () => document.removeEventListener('keydown', handleLightboxKeyDown);
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
    }, DETAIL_LIGHTBOX_CHROME_HIDE_DELAY_MS);
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

  function showPreviousLightboxPhoto() {
    if (lightboxPhotos.length <= 1) return;
    resetLightboxChromeTimer();
    setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length);
    setLightboxZoomLevel(0);
  }

  function showNextLightboxPhoto() {
    if (lightboxPhotos.length <= 1) return;
    resetLightboxChromeTimer();
    setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length);
    setLightboxZoomLevel(0);
  }

  function zoomInLightbox() {
    resetLightboxChromeTimer();
    setLightboxZoomLevel((prev) => Math.min(prev + 1, DETAIL_LIGHTBOX_ZOOM_LEVELS.length - 1));
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

  function showPreviousPhoto() {
    if (postPhotos.length <= 1) return;
    resetCarouselChromeTimer();
    setCurrentPhotoIndex((prev) => (prev - 1 + postPhotos.length) % postPhotos.length);
  }

  function showNextPhoto() {
    if (postPhotos.length <= 1) return;
    resetCarouselChromeTimer();
    setCurrentPhotoIndex((prev) => (prev + 1) % postPhotos.length);
  }

  function handleCarouselTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    resetCarouselChromeTimer();
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleCarouselTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    resetCarouselChromeTimer();
    if (touchStartXRef.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(delta) < 40) return;
    if (delta > 0) showPreviousPhoto();
    else showNextPhoto();
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
      {saveToast && (
        <div className={styles.toast}>{saveToast}</div>
      )}
      <Head>
        <title>{post.title} - NUSA</title>
      </Head>
      <div className={styles.postPage}>
        <Link href="/feed" className={styles.backLink}>
          ← Back to Feed
        </Link>

        <div className={styles.postDetail}>
          <div className={styles.postHeader}>
            <div className={styles.avatarWrapper} data-avatar-menu-root="true">
              <button
                type="button"
                className={post.author_id !== user?.id ? styles.avatarTrigger : styles.avatarTriggerDisabled}
                onClick={(event) => {
                  openAvatarMenu(event, post.author ? { id: post.author_id, full_name: post.author.full_name } : null);
                }}
                aria-label="User options"
              >
                <Avatar
                  name={post.author?.full_name || '?'}
                  photoUrl={post.author?.profile_photo}
                  trustLevel={post.author?.trust_level}
                  size="medium"
                />
              </button>
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                {post.author?.full_name || 'Anonymous'}
              </div>
              <div className={styles.postMeta}>{formatRelativeTime(new Date(post.created_at))}</div>
            </div>

            <div className={styles.postHeaderActions}>
              <span
                className={`${styles.categoryBadge} ${post.is_global ? styles.globalBadge : styles.localBadge}`}
              >
                {post.is_global ? '🌐 Global' : '📍 Local'}
              </span>

              <div className={styles.postMenuWrapper} ref={postMenuRef}>
                <button
                  type="button"
                  className={styles.postMenuButton}
                  onClick={() => setPostMenuOpen((prev) => !prev)}
                  aria-label="Post options"
                >
                  ⋯
                </button>

                {postMenuOpen && (
                  <div className={styles.postMenuDropdown}>
                    {post.author_id === user?.id ? (
                      <>
                        <button type="button" className={styles.postMenuItem} onClick={handleEditPost}>Edit Post</button>
                        <button type="button" className={styles.postMenuItem} onClick={handleShare}>Share Post</button>
                        <button
                          type="button"
                          className={`${styles.postMenuItem} ${styles.postMenuItemDanger}`}
                          onClick={handleDeletePost}
                        >
                          Delete Post
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.postMenuItem}
                          onClick={() => { setPostMenuOpen(false); handleSave(); }}
                        >
                          {saved ? 'Unsave Post' : 'Save Post'}
                        </button>
                        <button type="button" className={styles.postMenuItem} onClick={handleShare}>Share Post</button>
                        <button
                          type="button"
                          className={`${styles.postMenuItem} ${styles.postMenuItemDanger}`}
                          onClick={() => {
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

          <h1 className={styles.postTitle}>{post.title}</h1>
          <div className={styles.postBody}>{post.description}</div>

          {postPhotos.length > 0 && (
            <div
              className={styles.mediaCarousel}
              onTouchStart={handleCarouselTouchStart}
              onTouchEnd={handleCarouselTouchEnd}
              onMouseMove={resetCarouselChromeTimer}
            >
              <img
                src={postPhotos[currentPhotoIndex]}
                alt={`Post image ${currentPhotoIndex + 1}`}
                className={styles.mediaCarouselImage}
                onClick={() => openLightbox(postPhotos, currentPhotoIndex)}
              />

              {postPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.mediaCarouselNav} ${styles.mediaCarouselNavPrev} ${styles.mediaCarouselChrome} ${
                      carouselChromeVisible ? styles.mediaCarouselChromeVisible : styles.mediaCarouselChromeHidden
                    }`}
                    onClick={showPreviousPhoto}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={`${styles.mediaCarouselNav} ${styles.mediaCarouselNavNext} ${styles.mediaCarouselChrome} ${
                      carouselChromeVisible ? styles.mediaCarouselChromeVisible : styles.mediaCarouselChromeHidden
                    }`}
                    onClick={showNextPhoto}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div
                    className={`${styles.mediaCarouselDots} ${styles.mediaCarouselChrome} ${
                      carouselChromeVisible ? styles.mediaCarouselChromeVisible : styles.mediaCarouselChromeHidden
                    }`}
                  >
                    {postPhotos.map((_, index) => (
                      <button
                        key={`dot-${index}`}
                        type="button"
                        className={`${styles.mediaCarouselDot} ${index === currentPhotoIndex ? styles.mediaCarouselDotActive : ''}`}
                        onClick={() => {
                          resetCarouselChromeTimer();
                          setCurrentPhotoIndex(index);
                        }}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

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
            {post.author_id !== user?.id && (
              <button
                className={`${styles.actionBtn} ${saved ? styles.actionBtnActive : ''}`}
                onClick={handleSave}
              >
                {saved ? '🔖' : '🏷️'} Save
              </button>
            )}
            <button className={styles.actionBtn} onClick={handleShare}>
              ↗ Share
            </button>
          </div>

          <div className={styles.metaRow}>
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
                  <div className={styles.avatarWrapper} data-avatar-menu-root="true">
                    <button
                      type="button"
                      className={thread.parent.author_id !== user?.id ? styles.avatarTrigger : styles.avatarTriggerDisabled}
                      onClick={(event) => {
                        openAvatarMenu(event,
                          thread.parent.author
                            ? { id: thread.parent.author_id, full_name: thread.parent.author.full_name }
                            : null
                        );
                      }}
                      aria-label="User options"
                    >
                      <Avatar
                        name={thread.parent.author?.full_name || '?'}
                        photoUrl={thread.parent.author?.profile_photo}
                        trustLevel={thread.parent.author?.trust_level}
                        size="small"
                      />
                    </button>
                  </div>
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
                    <div className={styles.avatarWrapper} data-avatar-menu-root="true">
                      <button
                        type="button"
                        className={reply.author_id !== user?.id ? styles.avatarTrigger : styles.avatarTriggerDisabled}
                        onClick={(event) => {
                          openAvatarMenu(event,
                            reply.author
                              ? { id: reply.author_id, full_name: reply.author.full_name }
                              : null
                          );
                        }}
                        aria-label="User options"
                      >
                        <Avatar
                          name={reply.author?.full_name || '?'}
                          photoUrl={reply.author?.profile_photo}
                          trustLevel={reply.author?.trust_level}
                          size="small"
                        />
                      </button>
                    </div>
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

        {avatarMenuOpen && (
          <div
            ref={avatarDropdownRef}
            className={`${styles.avatarDropdown} ${styles.avatarDropdownAnchored}`}
            data-avatar-menu-root="true"
          >
            <button
              className={styles.avatarDropdownItem}
              onClick={() => {
                const targetId = avatarMenuUser?.id;
                setAvatarMenuOpen(false);
                if (targetId) {
                  router.push(`/users/${targetId}`);
                }
              }}
            >
              View Profile
            </button>
            <button
              className={styles.avatarDropdownItem}
              onClick={() => {
                setAvatarMenuOpen(false);
                handleAvatarChat();
              }}
            >
              Chat
            </button>
          </div>
        )}

        {lightboxPhotos.length > 0 && (
          <div className={styles.lightboxOverlay} onClick={closeLightbox} role="presentation">
            <div
              className={styles.lightboxContent}
              onClick={(event) => event.stopPropagation()}
              onMouseMove={resetLightboxChromeTimer}
              onTouchStart={resetLightboxChromeTimer}
            >
              <div
                className={`${styles.lightboxTopRight} ${styles.lightboxChrome} ${
                  lightboxChromeVisible ? styles.lightboxChromeVisible : styles.lightboxChromeHidden
                }`}
              >
                {lightboxPhotos.length > 1 && (
                  <div className={styles.lightboxCounter}>{lightboxIndex + 1} / {lightboxPhotos.length}</div>
                )}
                <button
                  type="button"
                  className={styles.lightboxClose}
                  onClick={closeLightbox}
                  aria-label="Close image viewer"
                >
                  ✕
                </button>
              </div>

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
                  {Math.round(DETAIL_LIGHTBOX_ZOOM_LEVELS[lightboxZoomLevel] * 100)}%
                </span>
                <button
                  type="button"
                  className={styles.lightboxZoomBtn}
                  onClick={zoomInLightbox}
                  disabled={lightboxZoomLevel === DETAIL_LIGHTBOX_ZOOM_LEVELS.length - 1}
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
