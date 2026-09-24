import React from 'react';
import { ActionIcon, UnstyledButton, VisuallyHidden } from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkFilled,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconShare3,
} from '@tabler/icons-react';
import styles from './PostActions.module.css';

export interface PostActionsProps {
  likeCount: number;
  commentCount: number;
  liked?: boolean;
  saved?: boolean;
  /** Given: the count becomes a button. Omitted: it stays text. */
  onLike?: () => void;
  onComment?: () => void;
  /** Omitted on your own posts, which cannot be saved. */
  onSave?: () => void;
  onShare: () => void;
  /** The feed card's "View Details" cue. Post detail is already the details. */
  showViewDetails?: boolean;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * The row under a post. A count is a button only where something can act on
 * it — the feed can neither like nor comment in place, and a dead button lies.
 */
export function PostActions({
  likeCount,
  commentCount,
  liked = false,
  saved = false,
  onLike,
  onComment,
  onSave,
  onShare,
  showViewDetails = false,
}: PostActionsProps) {
  const likeIcon = liked ? <IconHeartFilled size={20} aria-hidden="true" /> : <IconHeart size={20} aria-hidden="true" />;
  const likeLabel = plural(likeCount, 'like');
  const commentLabel = plural(commentCount, 'comment');

  return (
    <div className={styles.root}>
      <div className={styles.stats}>
        {onLike ? (
          <UnstyledButton className={styles.statButton} onClick={onLike} aria-pressed={liked} aria-label={likeLabel}>
            {likeIcon}
            <span aria-hidden="true">{likeCount}</span>
          </UnstyledButton>
        ) : (
          <span className={styles.stat}>
            {likeIcon}
            <span aria-hidden="true">{likeCount}</span>
            <VisuallyHidden>{likeLabel}</VisuallyHidden>
          </span>
        )}

        {onComment ? (
          <UnstyledButton className={styles.statButton} onClick={onComment} aria-label={commentLabel}>
            <IconMessageCircle size={20} aria-hidden="true" />
            <span aria-hidden="true">{commentCount}</span>
          </UnstyledButton>
        ) : (
          <span className={styles.stat}>
            <IconMessageCircle size={20} aria-hidden="true" />
            <span aria-hidden="true">{commentCount}</span>
            <VisuallyHidden>{commentLabel}</VisuallyHidden>
          </span>
        )}

        {onSave && (
          <UnstyledButton
            className={styles.statButton}
            onClick={onSave}
            aria-pressed={saved}
            aria-label="Save post"
          >
            {saved ? <IconBookmarkFilled size={20} aria-hidden="true" /> : <IconBookmark size={20} aria-hidden="true" />}
          </UnstyledButton>
        )}

        <ActionIcon variant="subtle" color="gray" aria-label="Share post" onClick={onShare}>
          <IconShare3 size={20} aria-hidden="true" />
        </ActionIcon>
      </div>

      {showViewDetails && (
        /* The card's stretched link already opens the post; this is a cue, not a second link. */
        <span className={styles.viewDetails} aria-hidden="true">
          View Details &rarr;
        </span>
      )}
    </div>
  );
}
