import React, { type ReactNode } from 'react';
import Link from 'next/link';
import styles from './SummaryRow.module.css';

export interface SummaryRowProps {
  /** The row's only link. Its `::after` covers the row. */
  href: string;
  title: string;
  /** Beside the title, e.g. a ScopeBadge or a status chip. It never shrinks. */
  badge?: ReactNode;
  /** Before the text, e.g. a thumbnail. Outside the link. */
  leading?: ReactNode;
  /** Beside the row, above the link's overlay, e.g. an ActionMenu. A falsy value renders no slot. */
  menu?: ReactNode;
  /** The lines under the title. */
  children?: ReactNode;
}

/**
 * Shell for one row in a list of summaries — posts, events, listings. The
 * title is the only link, and its `::after` stretches over the row so an
 * optional menu can sit beside it without being nested inside it. A row
 * built on this shell should only add what makes it different: its body
 * content (via `children`, typically one or two `SummaryRowMeta` lines) and
 * any row-specific styling, such as a description clamp.
 */
export function SummaryRow({ href, title, badge, leading, menu, children }: SummaryRowProps) {
  return (
    <article className={styles.root}>
      {leading}
      <div className={styles.body}>
        <div className={styles.top}>
          <Link href={href} className={styles.stretchedLink}>
            {title}
          </Link>
          {badge ? <span className={styles.scope}>{badge}</span> : null}
        </div>

        {children}
      </div>

      {menu ? <div className={styles.menu}>{menu}</div> : null}
    </article>
  );
}

export interface SummaryRowMetaProps {
  children: ReactNode;
  /** `detail` is the body-size line under a title; `meta` is the smaller, quieter one. Default `meta`. */
  variant?: 'detail' | 'meta';
}

/** One line of items separated by a dot that screen readers skip. */
export function SummaryRowMeta({ children, variant = 'meta' }: SummaryRowMetaProps) {
  return <div className={variant === 'detail' ? styles.detail : styles.meta}>{children}</div>;
}
