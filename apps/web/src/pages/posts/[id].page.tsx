import React, { useEffect, useState, useRef, useCallback, FormEvent } from 'react';
import { ActionIcon, Badge, Button, Center, Text, UnstyledButton } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
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
  createReport,
  buildSingleLevelCommentThreads,
  formatRelativeTime,
  logClientEvent,
  TAG_EMOJI,
} from '@nepally/shared';
import type { Post, PostComment } from '@nepally/shared';
import Avatar from '../../components/Avatar';
import { ImageLightbox, PhotoCarousel } from '../../components/ui';
import ReportPostModal from '../../components/ReportPostModal';
import styles from '../../styles/PostDetail.module.css';


type AvatarMenuUser = {
  id: string;
  full_name: string;
};

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const routePostId = typeof id === 'string' ? id : null;
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  // Route id whose post request has finished; any other id is still loading.
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null);
  const loading = !routePostId || loadedPostId !== routePostId;
  // On a different post, drop the previous post's comments right away rather
  // than showing them under the new post until its own comments arrive.
  const [commentsPostId, setCommentsPostId] = useState(routePostId);
  if (commentsPostId !== routePostId) {
    setCommentsPostId(routePostId);
    setComments([]);
  }
  const [submitting, setSubmitting] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarMenuUser, setAvatarMenuUser] = useState<AvatarMenuUser | null>(null);
  const [avatarMenuPosition, setAvatarMenuPosition] = useState({ top: 0, left: 0 });
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const postMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!routePostId) return;

    let cancelled = false;
    getPostById(supabase, routePostId).then((result) => {
      if (cancelled) return;
      // A missing post clears the previous one, so the page shows "Post not found"
      // instead of the last post under the new URL.
      setPost(result.data ?? null);
      setLikesCount(result.data?.likes_count || 0);
      setLoadedPostId(routePostId);
    });
    getPostComments(supabase, routePostId).then((result) => {
      if (cancelled) return;
      setComments(result.data ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [routePostId]);

  useEffect(() => {
    if (user && post) {
      getUserLikedPostIds(supabase, user.id).then((result) => {
        if (result.data) {
          setLiked(result.data.includes(post.id));
        }
      });
    }
  }, [user, post]);

  useEffect(() => {
    if (user && post) {
      getUserSavedPostIds(supabase, user.id).then((result) => {
        if (result.data) {
          setSaved(result.data.includes(post.id));
        }
      });
    }
  }, [user, post]);

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

  async function handleSave() {
    if (!user || !post) return;
    const wasSaved = saved;

    if (wasSaved) {
      setSaved(false);
      const { error } = await unsavePost(supabase, post.id);
      notifications.show({ message: error ? 'Failed to unsave post.' : 'Post unsaved.', autoClose: 2500 });
    } else {
      setSaved(true);
      const { error } = await savePost(supabase, post.id);
      notifications.show({ message: error ? 'Failed to save post.' : 'Post saved.', autoClose: 2500 });
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

  async function submitReport(values: { reason: string; description?: string }) {
    if (!post || !user?.id) {
      return { error: 'Please sign in to report posts.' };
    }

    setReportSubmitting(true);
    try {
      const result = await createReport(supabase, {
        reported_by: user.id,
        target_type: 'post',
        target_id: post.id,
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
      setReportModalOpen(false);
      return {};
    } finally {
      setReportSubmitting(false);
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

  if (loading) {
    return <Center p="xl"><Text c="dimmed">Loading...</Text></Center>;
  }

  if (!post) {
    return (
      <Center p="xl">
        <div>
          <h2>Post not found</h2>
          <Link href="/feed">Back to Feed</Link>
        </div>
      </Center>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} - Nepally</title>
      </Head>
      <div className={styles.postPage}>
        <Link href="/feed" className={styles.backLink}>
          ← Back to Feed
        </Link>

        <div className={styles.postDetail}>
          <div className={styles.postHeader}>
            <div className={styles.avatarWrapper} data-avatar-menu-root="true">
              <UnstyledButton
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
              </UnstyledButton>
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                {post.author?.full_name || 'Anonymous'}
              </div>
              <div className={styles.postMeta}>{formatRelativeTime(new Date(post.created_at))}</div>
            </div>

            <div className={styles.postHeaderActions}>
              <Badge variant="light" color={post.is_global ? 'orange' : 'blue'}>
                {post.is_global ? '🌐 Global' : '📍 Local'}
              </Badge>

              <div className={styles.postMenuWrapper} ref={postMenuRef}>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setPostMenuOpen((prev) => !prev)} aria-label="Post options">
                  ⋯
                </ActionIcon>

                {postMenuOpen && (
                  <div className={styles.postMenuDropdown}>
                    {post.author_id === user?.id ? (
                      <>
                        <UnstyledButton className={styles.postMenuItem} onClick={handleEditPost}>Edit Post</UnstyledButton>
                        <UnstyledButton className={styles.postMenuItem} onClick={handleShare}>Share Post</UnstyledButton>
                        <UnstyledButton
                          className={`${styles.postMenuItem} ${styles.postMenuItemDanger}`}
                          onClick={handleDeletePost}
                        >
                          Delete Post
                        </UnstyledButton>
                      </>
                    ) : (
                      <>
                        <UnstyledButton
                          className={styles.postMenuItem}
                          onClick={() => { setPostMenuOpen(false); handleSave(); }}
                        >
                          {saved ? 'Unsave Post' : 'Save Post'}
                        </UnstyledButton>
                        <UnstyledButton className={styles.postMenuItem} onClick={handleShare}>Share Post</UnstyledButton>
                        <UnstyledButton
                          className={`${styles.postMenuItem} ${styles.postMenuItemDanger}`}
                          onClick={() => {
                            setPostMenuOpen(false);
                            setReportModalOpen(true);
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

          <h1 className={styles.postTitle}>{post.title}</h1>
          <div className={styles.postBody}>{post.description}</div>

          {postPhotos.length > 0 && (
            <PhotoCarousel
              photos={postPhotos}
              alt="Post image"
              onPhotoClick={(index) => openLightbox(postPhotos, index)}
            />
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
                  <Button variant="subtle" size="compact-sm" onClick={() => setReplyTargetId(null)}>
                    Cancel
                  </Button>
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
                <Button type="submit" disabled={!commentText.trim()} loading={submitting}>
                  Post
                </Button>
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
                    <UnstyledButton
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
                    </UnstyledButton>
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
                      <UnstyledButton
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
                      </UnstyledButton>
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
            <UnstyledButton
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
            </UnstyledButton>
            <UnstyledButton
              className={styles.avatarDropdownItem}
              onClick={() => {
                setAvatarMenuOpen(false);
                handleAvatarChat();
              }}
            >
              Chat
            </UnstyledButton>
          </div>
        )}

        <ReportPostModal
          opened={reportModalOpen}
          onClose={() => {
            if (!reportSubmitting) {
              setReportModalOpen(false);
            }
          }}
          onSubmit={submitReport}
          submitting={reportSubmitting}
        />

        <ImageLightbox
          photos={lightboxPhotos}
          startIndex={lightboxIndex}
          opened={lightboxPhotos.length > 0}
          onClose={closeLightbox}
        />
      </div>
    </>
  );
}
