import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { MarketplaceListing } from '@nepally/shared';
import { ListingCard } from './ListingCard';
import styles from './ListingStrip.module.css';

interface ListingStripProps {
  title: string;
  titleIcon?: string;
  listings: MarketplaceListing[];
  showAllHref?: string;
  maxItems?: number;
}

export function ListingStrip({
  title,
  titleIcon,
  listings,
  showAllHref,
  maxItems = 10,
}: ListingStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrowState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrowState();
  }, [updateArrowState, listings]);

  const handleScrollBy = (delta: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Hide strip entirely if empty
  if (listings.length === 0) return null;

  const visible = listings.slice(0, maxItems);
  const showAllCard = listings.length >= maxItems;

  return (
    <section className={styles.strip} aria-label={title}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {titleIcon && <span aria-hidden="true">{titleIcon}</span>} {title}
        </h2>
        {showAllHref && (
          <Link href={showAllHref} className={styles.viewAllLink}>
            View All →
          </Link>
        )}
      </div>
      <div className={styles.scrollerWrapper}>
        {canScrollLeft && (
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowLeft}`}
            onClick={() => handleScrollBy(-320)}
            aria-label={`Scroll ${title} left`}
          >
            ‹
          </button>
        )}
        <div
          ref={scrollerRef}
          className={styles.scroller}
          onScroll={updateArrowState}
        >
          {visible.map((listing) => (
            <div key={listing.id} className={styles.scrollerItem}>
              <ListingCard listing={listing} />
            </div>
          ))}
          {showAllCard && showAllHref && (
            <Link
              href={showAllHref}
              className={`${styles.scrollerItem} ${styles.showAllCard}`}
              aria-label={`Show all ${title} listings`}
            >
              <span className={styles.showAllArrow}>→</span>
              <span className={styles.showAllText}>Show All</span>
            </Link>
          )}
        </div>
        {canScrollRight && (
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowRight}`}
            onClick={() => handleScrollBy(320)}
            aria-label={`Scroll ${title} right`}
          >
            ›
          </button>
        )}
      </div>
    </section>
  );
}
