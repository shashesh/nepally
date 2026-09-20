import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@mantine/core';
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
  createReport,
  buildSingleLevelCommentThreads,
  formatRelativeTime,
  logClientEvent,
} from '@nepally/shared';
import type { Post, PostComment } from '@nepally/shared';
import Avatar from '../../components/Avatar';
import {
  ActionMenu,
  EmptyState,
  ErrorState,
  ImageLightbox,
  LoadingState,
  PhotoCarousel,
  ScopeBadge,
  TagChip,
  notify,
  useConfirm,
  type ActionMenuItem,
} from '../../components/ui';
import { UserMenuTrigger } from '../../components/users/UserMenuTrigger';
import { CommentComposer } from '../../components/posts/CommentComposer';
import { CommentThread } from '../../components/posts/CommentThread';
import { PostActions } from '../../components/posts/PostActions';
import ReportPostModal from '../../components/ReportPostModal';
import styles from '../../styles/PostDetail.module.css';


export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const routePostId = typeof id === 'string' ? id : null;
  const { user } = useAuth();
  const confirm = useConfirm();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null);
  // Route id whose post request has finished; any other id is still loading.
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null);
  const loading = !routePostId || loadedPostId !== routePostId;
  // On a different post, drop the previous post's comments right away rather
  // than showing them under the new post until its own comments arrive.
  const [commentsStatus, setCommentsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [commentsReloadToken, setCommentsReloadToken] = useState(0);
  const [commentsPostId, setCommentsPostId] = useState(routePostId);
  if (commentsPostId !== routePostId) {
    setCommentsPostId(routePostId);
    setComments([]);
    setCommentsStatus('loading');
  }
  const [submitting, setSubmitting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  /** Bumped by anything that edits comments locally, retiring in-flight loads. */
  const commentsGenerationRef = useRef(0);
  /** One like and one save in flight at a time: overlapping rollbacks would
   *  apply stale deltas and leave the count wrong. */
  const likePendingRef = useRef(false);
  const savePendingRef = useRef(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
    // A comment posted while this is in flight must survive it: the response
    // would otherwise replace the list, and an error would hide what was just
    // added. Editing comments locally bumps the generation, retiring this load.
    const generation = commentsGenerationRef.current;
    getPostComments(supabase, routePostId).then((result) => {
      if (cancelled || generation !== commentsGenerationRef.current) return;
      if (result.error) {
        setCommentsStatus('error');
        return;
      }
      setComments(result.data ?? []);
      setCommentsStatus('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [routePostId, commentsReloadToken]);

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

  async function handleLike() {
    if (!user || !post || likePendingRef.current) return;

    likePendingRef.current = true;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((count) => count + (wasLiked ? -1 : 1));

    try {
      const { error } = wasLiked ? await unlikePost(supabase, post.id) : await likePost(supabase, post.id);
      if (error) {
        // Put the heart back rather than showing a like the server rejected.
        setLiked(wasLiked);
        setLikesCount((count) => count + (wasLiked ? 1 : -1));
        notify.error(wasLiked ? 'Could not remove your like.' : 'Could not like this post.');
      }
    } finally {
      likePendingRef.current = false;
    }
  }

  async function handleSave() {
    if (!user || !post || savePendingRef.current) return;

    savePendingRef.current = true;
    const wasSaved = saved;
    setSaved(!wasSaved);

    try {
      const { error } = wasSaved ? await unsavePost(supabase, post.id) : await savePost(supabase, post.id);
      if (error) {
        // Same reasoning as the like: do not leave the button claiming a state
        // the server never took.
        setSaved(wasSaved);
        notify.error(wasSaved ? 'Failed to unsave post.' : 'Failed to save post.');
        return;
      }

      notify.success(wasSaved ? 'Post unsaved.' : 'Post saved.');
    } finally {
      savePendingRef.current = false;
    }
  }

  async function handleComment(text: string) {
    if (!user || !post) return;

    setSubmitting(true);
    const result = await createComment(supabase, post.id, text, replyTarget?.id ?? undefined);
    setSubmitting(false);

    if (result.error || !result.data) {
      notify.error('Could not post your comment. Please try again.');
      // Throwing tells CommentComposer to keep the text for another attempt.
      throw new Error('createComment failed');
    }

    commentsGenerationRef.current += 1;
    setComments((previous) => [...previous, result.data!]);
    setReplyTarget(null);
    // A comment posted after a failed load must be visible, not hidden behind
    // the error state that the failed load left behind.
    setCommentsStatus('ready');
  }

  async function handleDeleteComment(commentId: string) {
    // CommentThread already asked; this only reports what went wrong.
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
      notify.error(result.error.message || 'Failed to delete comment. Please try again.');
      return;
    }

    commentsGenerationRef.current += 1;
    setComments((prev) => prev.filter((comment) => comment.id !== commentId && comment.parent_comment_id !== commentId));
  }

  async function handleAvatarChat(targetId: string, targetName: string) {
    if (!user || targetId === user.id) return;

    const result = await getOrCreateConversation(supabase, user.id, user.full_name, targetId, targetName);

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

      notify.success('Thanks. Your report has been submitted for review.');
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
      notify.success('Link copied to clipboard');
    }
  }

  function handleEditPost() {
    if (!post) return;
    router.push(`/posts/create?edit=${post.id}`);
  }

  async function handleDeletePost() {
    if (!post) return;
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

    router.push('/feed');
  }

  const commentThreads = buildSingleLevelCommentThreads(comments);
  const isOwnPost = post?.author_id === user?.id;
  const postMenuItems: ActionMenuItem[] = isOwnPost
    ? [
        { key: 'edit', label: 'Edit Post', onClick: handleEditPost },
        { key: 'share', label: 'Share Post', onClick: () => void handleShare() },
        { key: 'delete', label: 'Delete Post', onClick: () => void handleDeletePost(), danger: true },
      ]
    : [
        { key: 'save', label: saved ? 'Unsave Post' : 'Save Post', onClick: () => void handleSave() },
        { key: 'share', label: 'Share Post', onClick: () => void handleShare() },
        { key: 'report', label: 'Report Post', onClick: () => setReportModalOpen(true), danger: true },
      ];
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
    return <LoadingState variant="detail" label="Loading post…" />;
  }

  if (!post) {
    return (
      <EmptyState
        title="Post not found"
        description="This post may have been deleted."
        action={
          <Button component={Link} href="/feed">
            Back to Feed
          </Button>
        }
      />
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
            {post.author && !isOwnPost ? (
              <UserMenuTrigger
                userId={post.author_id}
                name={post.author.full_name}
                photoUrl={post.author.profile_photo}
                trustLevel={post.author.trust_level}
                onChat={handleAvatarChat}
              />
            ) : (
              // Your own post, or one whose author row is gone: nothing to open.
              <Avatar
                name={post.author?.full_name || 'Anonymous'}
                photoUrl={post.author?.profile_photo}
                trustLevel={post.author?.trust_level}
                size="medium"
              />
            )}
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                {post.author?.full_name || 'Anonymous'}
              </div>
              <div className={styles.postMeta}>{formatRelativeTime(new Date(post.created_at))}</div>
            </div>

            <div className={styles.postHeaderActions}>
              <ScopeBadge isGlobal={post.is_global} />

              <ActionMenu label="Post options" items={postMenuItems} />
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

          <PostActions
            likeCount={likesCount}
            commentCount={comments.length}
            liked={liked}
            saved={saved}
            onLike={() => void handleLike()}
            onComment={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}
            onSave={isOwnPost ? undefined : () => void handleSave()}
            onShare={() => void handleShare()}
          />

          <div className={styles.metaRow}>
            {post.tags?.map((tag) => (
              <TagChip key={tag.id} slug={tag.slug} label={tag.name} />
            ))}
            {post.location_city && (
              <span className={styles.metaLocation}>
                {post.location_city}, {post.location_state}
              </span>
            )}
          </div>

        </div>

        <div className={styles.commentsSection} id="comments">
          <h2 className={styles.commentsTitle}>
            Comments ({comments.length})
          </h2>

          {user && (
            <CommentComposer
              replyingToName={replyTarget?.authorName}
              onCancelReply={() => setReplyTarget(null)}
              onSubmit={handleComment}
              submitting={submitting}
            />
          )}

          {commentsStatus === 'loading' ? (
            <LoadingState label="Loading comments…" />
          ) : commentsStatus === 'error' ? (
            <ErrorState
              title="Couldn't load comments"
              message="Something went wrong fetching this post's comments."
              onRetry={() => {
                // A fresh load is wanted now, even after a local edit.
                commentsGenerationRef.current += 1;
                setCommentsReloadToken((token) => token + 1);
              }}
              retryLabel="Retry"
            />
          ) : commentThreads.length === 0 ? (
            <EmptyState title="No comments yet" description="Be the first to comment!" />
          ) : (
            commentThreads.map((thread) => (
              <CommentThread
                key={thread.parent.id}
                thread={thread}
                currentUserId={user?.id}
                onReply={(parentId, authorName) => setReplyTarget({ id: parentId, authorName })}
                onDelete={handleDeleteComment}
                onChat={handleAvatarChat}
              />
            ))
          )}
        </div>

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
