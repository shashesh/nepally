import React from 'react';
import { ActionIcon, VisuallyHidden } from '@mantine/core';
import { IconHeart, IconHeartFilled, IconMessageCircle, IconShare3 } from '@tabler/icons-react';
import styles from './PostActions.module.css';

export interface PostActionsProps {
  likeCount: number;
  commentCount: number;
  /** Fills the heart. Liking happens on the post page, not here. */
  liked?: boolean;
  onShare: () => void;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * The row under a post: counts and share. The counts are text, not buttons —
 * nothing on the feed can like or comment yet, and a dead button lies.
 */
export function PostActions({ likeCount, commentCount, liked = false, onShare }: PostActionsProps) {
  return (
    <div className={styles.root}>
      <div className={styles.stats}>
        <span className={styles.stat}>
          {liked ? <IconHeartFilled size={20} aria-hidden="true" /> : <IconHeart size={20} aria-hidden="true" />}
          <span aria-hidden="true">{likeCount}</span>
          <VisuallyHidden>{plural(likeCount, 'like')}</VisuallyHidden>
        </span>

        <span className={styles.stat}>
          <IconMessageCircle size={20} aria-hidden="true" />
          <span aria-hidden="true">{commentCount}</span>
          <VisuallyHidden>{plural(commentCount, 'comment')}</VisuallyHidden>
        </span>

        <ActionIcon variant="subtle" color="gray" aria-label="Share post" onClick={onShare}>
          <IconShare3 size={20} aria-hidden="true" />
        </ActionIcon>
      </div>

      {/* The card's stretched link already opens the post; this is a cue, not a second link. */}
      <span className={styles.viewDetails} aria-hidden="true">
        View Details &rarr;
      </span>
    </div>
  );
}
