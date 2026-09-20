import React from 'react';
import { UnstyledButton } from '@mantine/core';
import { formatRelativeTime, type Post } from '@nepally/shared';
import { ScopeBadge, TagChip } from '../ui';
import styles from './PostMeta.module.css';

export interface PostMetaProps {
  post: Post;
  /** Shown beside "Local" on metro posts. */
  metroLabel?: string;
  /** Omit on surfaces that cannot filter, such as post detail. */
  onTagClick?: (slug: string) => void;
}

/** Author, age, tags and scope — the line above a post's title. */
export function PostMeta({ post, metroLabel, onTagClick }: PostMetaProps) {
  const tags = post.tags ?? [];

  return (
    <div className={styles.root}>
      <div className={styles.identity}>
        <span className={styles.author}>{post.author?.full_name || 'Anonymous'}</span>
        <time className={styles.timestamp} dateTime={post.created_at}>
          {formatRelativeTime(new Date(post.created_at))}
        </time>
      </div>

      {tags.length > 0 && (
        <ul className={styles.tags}>
          {tags.map((tag) => (
            <li key={tag.id}>
              {onTagClick ? (
                <UnstyledButton
                  type="button"
                  className={styles.tagButton}
                  aria-label={`Filter by ${tag.name}`}
                  onClick={() => onTagClick(tag.slug)}
                >
                  <TagChip slug={tag.slug} label={tag.name} />
                </UnstyledButton>
              ) : (
                <TagChip slug={tag.slug} label={tag.name} />
              )}
            </li>
          ))}
        </ul>
      )}

      <ScopeBadge isGlobal={post.is_global} metroLabel={metroLabel} />
    </div>
  );
}
