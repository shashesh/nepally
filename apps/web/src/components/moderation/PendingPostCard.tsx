import React, { useId } from 'react';
import Link from 'next/link';
import { Anchor, Text, Title } from '@mantine/core';
import { formatPublicName, formatRelativeTime } from '@nepally/shared';
import type { Post } from '@nepally/shared';
import { TagChip } from '../ui';
import { ModerationActionButton, type ModerationCardBusy } from './ModerationActionButton';
import styles from './moderationCard.module.css';

const DESCRIPTION_PREVIEW_CHARS = 280;

export interface PendingPostCardProps extends ModerationCardBusy {
  post: Post;
  now: Date;
  onApprove: () => void;
  onRemove: () => void;
}

function preview(text: string): string {
  return text.length > DESCRIPTION_PREVIEW_CHARS ? `${text.slice(0, DESCRIPTION_PREVIEW_CHARS)}…` : text;
}

/** A post waiting for review: an Emergency submission or an auto-hidden reported post. */
export function PendingPostCard({ post, now, busyAction, locked, onApprove, onRemove }: PendingPostCardProps) {
  const headingId = useId();
  const author = post.author?.full_name ? formatPublicName(post.author.full_name) : 'Unknown author';
  const busy = { busyAction, locked };

  return (
    <article className={styles.card} data-kind="pending" tabIndex={-1} aria-labelledby={headingId}>
      <Title order={3} id={headingId} className={styles.title}>
        <Anchor component={Link} href={`/posts/${post.id}`} className={styles.titleLink}>
          {post.title}
        </Anchor>
      </Title>
      <Text className={styles.meta}>
        {`by ${author} · ${post.location_city}, ${post.location_state} · ${formatRelativeTime(new Date(post.created_at), now)}`}
      </Text>
      <Text className={styles.body}>{preview(post.description)}</Text>
      {post.tags && post.tags.length > 0 ? (
        <div className={styles.tags}>
          {post.tags.map((tag) => (
            <TagChip key={tag.id} slug={tag.slug} label={tag.name} />
          ))}
        </div>
      ) : null}
      <div className={styles.actions}>
        <ModerationActionButton action="approve" onPress={onApprove} {...busy}>
          Approve
        </ModerationActionButton>
        <ModerationActionButton action="remove" onPress={onRemove} variant="outline" color="red" {...busy}>
          Remove
        </ModerationActionButton>
      </div>
    </article>
  );
}
