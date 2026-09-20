import React from 'react';
import Link from 'next/link';
import type { Post } from '@nepally/shared';
import Avatar from '../Avatar';
import { UserMenuTrigger } from '../users/UserMenuTrigger';
import { ActionMenu, PhotoCarousel, type ActionMenuItem } from '../ui';
import { PostActions } from './PostActions';
import { PostMeta } from './PostMeta';
import styles from './PostCard.module.css';

/** The feed shows at most three photos per post. */
const MAX_PHOTOS = 3;

export interface PostCardProps {
  post: Post;
  liked: boolean;
  saved?: boolean;
  onTagClick: (slug: string) => void;
  currentUserId?: string;
  onAvatarChat?: (authorId: string, authorName: string) => void;
  onOpenLightbox: (photos: string[], startIndex: number) => void;
  onSharePost: (post: Post) => Promise<void> | void;
  onDeletePost: (post: Post) => Promise<void> | void;
  onEditPost: (post: Post) => void;
  onReportPost: (postId: string) => void;
  onSaveToggle?: () => void;
  /** Shown beside "Local" on metro posts. */
  metroLabel?: string;
}

/**
 * One post in the feed. The title is the only link and it stretches over the
 * whole card, so every control beside it works without stopping propagation.
 */
export function PostCard({
  post,
  liked,
  saved,
  onTagClick,
  currentUserId,
  onAvatarChat,
  onOpenLightbox,
  onSharePost,
  onDeletePost,
  onEditPost,
  onReportPost,
  onSaveToggle,
  metroLabel,
}: PostCardProps) {
  const isOwnPost = currentUserId === post.author_id;
  const photoUrls = (post.photos || []).filter(Boolean).slice(0, MAX_PHOTOS);
  const authorName = post.author?.full_name || 'Anonymous';

  const items: ActionMenuItem[] = isOwnPost
    ? [
        { key: 'edit', label: 'Edit Post', onClick: () => onEditPost(post) },
        { key: 'share', label: 'Share Post', onClick: () => void onSharePost(post) },
        { key: 'delete', label: 'Delete Post', onClick: () => void onDeletePost(post), danger: true },
      ]
    : [
        ...(onSaveToggle
          ? [{ key: 'save', label: saved ? 'Unsave Post' : 'Save Post', onClick: onSaveToggle }]
          : []),
        { key: 'share', label: 'Share Post', onClick: () => void onSharePost(post) },
        { key: 'report', label: 'Report Post', onClick: () => onReportPost(post.id), danger: true },
      ];

  return (
    <article className={styles.root}>
      <div className={styles.header}>
        {isOwnPost ? (
          <Avatar
            name={authorName}
            photoUrl={post.author?.profile_photo}
            trustLevel={post.author?.trust_level}
            size="medium"
          />
        ) : (
          <UserMenuTrigger
            userId={post.author_id}
            name={authorName}
            photoUrl={post.author?.profile_photo}
            trustLevel={post.author?.trust_level}
            onChat={onAvatarChat}
          />
        )}

        <PostMeta post={post} metroLabel={metroLabel} onTagClick={onTagClick} />

        <div className={styles.headerEnd}>
          <ActionMenu label="Post options" items={items} />
        </div>
      </div>

      <h2 className={styles.title}>
        <Link href={`/posts/${post.id}`} className={styles.stretchedLink}>
          {post.title}
        </Link>
      </h2>
      <p className={styles.description}>{post.description}</p>

      {photoUrls.length > 0 && (
        <div className={styles.media}>
          <PhotoCarousel
            photos={photoUrls}
            alt="Post image"
            onPhotoClick={(index) => onOpenLightbox(photoUrls, index)}
          />
        </div>
      )}

      <div className={styles.actions}>
        <PostActions
          likeCount={post.likes_count || 0}
          commentCount={post.comments_count || 0}
          liked={liked}
          onShare={() => void onSharePost(post)}
        />
      </div>
    </article>
  );
}
