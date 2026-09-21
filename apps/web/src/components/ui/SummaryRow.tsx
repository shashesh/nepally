import React, { type ReactNode } from 'react';
import Link from 'next/link';
import styles from './SummaryRow.module.css';

export interface SummaryRowProps {
  /** The row's only link. Its `::after` covers the row. */
  href: string;
  title: string;
  /**
   * Beside the title, e.g. a ScopeBadge or a status chip. It never shrinks.
   * Below the link's overlay: an interactive element here is covered and
   * can't be clicked, and a positioned element paints above the overlay and
   * swallows clicks meant for the link, leaving a dead spot. Keep this
   * content static and unpositioned.
   */
  badge?: ReactNode;
  /**
   * Before the text, e.g. a thumbnail. Outside the link, and — like `badge`
   * and `children` — below the link's overlay, so it isn't independently
   * clickable; clicking it opens the row's link. It comes before the link in
   * document order, so even positioned content here (e.g. a `next/image`
   * with `fill`) still paints under the overlay — the one slot where that's
   * safe.
   */
  leading?: ReactNode;
  /** Beside the row, above the link's overlay, e.g. an ActionMenu. A falsy value renders no slot. */
  menu?: ReactNode;
  /**
   * The lines under the title, typically one or two `SummaryRowMeta` rows.
   * Below the link's overlay: an interactive element here is covered and
   * can't be clicked, and a positioned element paints above the overlay and
   * swallows clicks meant for the link, leaving a dead spot. Keep this
   * content static and unpositioned.
   */
  children?: ReactNode;
}

/**
 * Shell for one row in a list of summaries — posts, events, listings. The
 * title is the only link, and its `::after` stretches over the row so an
 * optional menu can sit beside it without being nested inside it. Only
 * `menu` is meant to sit above the overlay. A row built on this shell
 * should only add what makes it different: its body content (via
 * `children`, typically one or two `SummaryRowMeta` lines) and any
 * row-specific styling, such as a description clamp.
 */
export function SummaryRow({ href, title, badge, leading, menu, children }: SummaryRowProps) {
  return (
    <article className={styles.root}>
      {leading ? <div className={styles.leading}>{leading}</div> : null}
      <div className={styles.body}>
        <div className={styles.top}>
          <Link href={href} className={styles.stretchedLink}>
            {title}
          </Link>
          {badge ? <span className={styles.badge}>{badge}</span> : null}
        </div>

        {children}
      </div>

      {menu ? <div className={styles.menu}>{menu}</div> : null}
    </article>
  );
}

export interface SummaryRowMetaProps {
  /**
   * Each item must be its own element (e.g. `<span>`, `<time>`) — bare text
   * is one text node, so the dot separator has nothing to attach to and
   * won't render.
   */
  children: ReactNode;
  /** `detail` is the body-size line under a title; `meta` is the smaller, quieter one. Default `meta`. */
  variant?: 'detail' | 'meta';
}

/** One line of items separated by a dot that screen readers skip. */
export function SummaryRowMeta({ children, variant = 'meta' }: SummaryRowMetaProps) {
  return (
    <div className={styles.line} data-variant={variant}>
      {children}
    </div>
  );
}
