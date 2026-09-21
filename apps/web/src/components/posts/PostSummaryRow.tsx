import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { formatRelativeTime, type Post } from '@nepally/shared';
import { ScopeBadge } from '../ui';
import styles from './PostSummaryRow.module.css';

export interface PostSummaryRowProps {
  post: Pick<Post, 'id' | 'title' | 'description' | 'is_global' | 'created_at' | 'likes_count' | 'comments_count'>;
  /** Sits beside the link, never inside it — e.g. an ActionMenu. */
  menu?: ReactNode;
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

/**
 * One post in a list of summaries — profile posts, saved posts, a public
 * profile. The title is the only link, and its `::after` stretches over the
 * row, so an optional menu can sit beside it without being nested inside it.
 */
export function PostSummaryRow({ post, menu }: PostSummaryRowProps) {
  const likes = post.likes_count ?? 0;
  const comments = post.comments_count ?? 0;

  return (
    <article className={styles.root}>
      <div className={styles.body}>
        <div className={styles.top}>
          <Link href={`/posts/${post.id}`} className={styles.stretchedLink}>
            {post.title}
          </Link>
          <ScopeBadge isGlobal={post.is_global} />
        </div>

        {post.description && <p className={styles.description}>{post.description}</p>}

        <div className={styles.meta}>
          <span>{formatRelativeTime(new Date(post.created_at))}</span>
          <span>{pluralize(likes, 'like')}</span>
          <span>{pluralize(comments, 'comment')}</span>
        </div>
      </div>

      {menu && <div className={styles.menu}>{menu}</div>}
    </article>
  );
}
