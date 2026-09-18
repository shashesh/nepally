import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getTopicLinks } from './navItems';
import styles from './TopicPills.module.css';

/** Phone-only topic filter row for the feed (the rail holds topics on wider screens). */
export function TopicPills() {
  const router = useRouter();
  const active = typeof router.query.tags === 'string' ? router.query.tags : null;

  return (
    <nav aria-label="Topics" className={styles.root}>
      <Link href="/feed" className={styles.pill} aria-current={active ? undefined : 'page'}>
        All
      </Link>
      {getTopicLinks().map((topic) => (
        <Link key={topic.slug} href={topic.href} className={styles.pill} aria-current={active === topic.slug ? 'page' : undefined}>
          {topic.label}
        </Link>
      ))}
    </nav>
  );
}
