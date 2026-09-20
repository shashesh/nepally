import React from 'react';
import Link from 'next/link';
import { Button } from '@mantine/core';
import Avatar from '../Avatar';
import styles from './PostComposer.module.css';

export interface PostComposerProps {
  fullName: string | null;
  photoUrl?: string | null;
  /** Level 0 cannot post yet, so the row points at verification instead. */
  trustLevel: number;
}

/** The prompt at the top of the feed. It never composes in place; it links out. */
export function PostComposer({ fullName, photoUrl, trustLevel }: PostComposerProps) {
  const canPost = trustLevel >= 1;
  const firstName = fullName?.trim().split(' ')[0] || 'there';
  const href = canPost ? '/posts/create' : '/profile';

  return (
    <div className={styles.root}>
      <Avatar name={fullName || '?'} photoUrl={photoUrl} trustLevel={trustLevel} size="medium" />

      <Link href={href} className={styles.prompt} aria-label="Start a new post">
        What&apos;s on your mind, {firstName}?
      </Link>

      <Button component={Link} href={href} variant={canPost ? 'filled' : 'default'} size="sm">
        {canPost ? 'Create Post' : 'Verify to Post'}
      </Button>
    </div>
  );
}
