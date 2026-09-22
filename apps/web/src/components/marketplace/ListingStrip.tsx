import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ActionIcon } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { MarketplaceListing } from '@nepally/shared';
import { ListingCard } from './ListingCard';
import styles from './ListingStrip.module.css';

/** One arrow press moves a little more than one card width (260px + gap). */
const SCROLL_STEP_PX = 320;

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
          <ActionIcon
            variant="default"
            radius="xl"
            size="lg"
            className={`${styles.arrow} ${styles.arrowLeft}`}
            onClick={() => handleScrollBy(-SCROLL_STEP_PX)}
            aria-label={`Scroll ${title} left`}
          >
            <IconChevronLeft size={18} aria-hidden="true" />
          </ActionIcon>
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
          <ActionIcon
            variant="default"
            radius="xl"
            size="lg"
            className={`${styles.arrow} ${styles.arrowRight}`}
            onClick={() => handleScrollBy(SCROLL_STEP_PX)}
            aria-label={`Scroll ${title} right`}
          >
            <IconChevronRight size={18} aria-hidden="true" />
          </ActionIcon>
        )}
      </div>
    </section>
  );
}
