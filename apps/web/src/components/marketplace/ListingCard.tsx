import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@mantine/core';
import {
  MARKETPLACE_CATEGORIES,
  isVerifiedSeller,
  type MarketplaceListing,
} from '@nepally/shared';
import styles from './ListingCard.module.css';

/** The categories that still exist, and so have `--category-<slug>` tokens. */
const THEMED_SLUGS = new Set(MARKETPLACE_CATEGORIES.map((category) => category.slug));

/**
 * Migration 016 consolidated twelve categories into five, but listings created
 * before it can still carry a retired slug. Anything unthemed reads as `other`.
 */
function themeSlug(slug: string | undefined): string {
  return slug && THEMED_SLUGS.has(slug) ? slug : 'other';
}

interface ListingCardProps {
  listing: MarketplaceListing;
  /** Show a "Sponsored" badge overlay */
  sponsored?: boolean;
}

export function ListingCard({ listing, sponsored }: ListingCardProps) {
  const slug = themeSlug(listing.category?.slug);
  const verified = isVerifiedSeller(listing);
  const hasPhoto = listing.photos.length > 0;

  return (
    <article className={styles.card} data-category={slug}>
      <div className={styles.cover}>
        {hasPhoto ? (
          <Image
            src={listing.photos[0]}
            alt=""
            className={styles.coverImage}
            fill
            sizes="(max-width: 48em) 100vw, 400px"
          />
        ) : (
          <div
            className={styles.coverPlaceholder}
            aria-hidden="true"
            data-testid="cover-placeholder"
          >
            {listing.category?.emoji ?? '📦'}
          </div>
        )}
        {sponsored && (
          <Badge variant="default" size="sm" radius="xl" className={styles.sponsored}>
            Sponsored
          </Badge>
        )}
      </div>

      <div className={styles.body}>
        {/* Coloured by the article's data-category, so the slug lives once. */}
        <span className={styles.categoryChip}>
          <span aria-hidden="true">{listing.category?.emoji}</span>{' '}
          {listing.category?.name ?? 'Other'}
        </span>

        <h3 className={styles.title}>
          <Link
            href={`/marketplace/listing/${listing.id}`}
            className={styles.stretchedLink}
          >
            {listing.title}
          </Link>
        </h3>

        {listing.price && <p className={styles.price}>Starting at {listing.price}</p>}

        <p className={styles.meta}>
          {verified && (
            <>
              <span aria-hidden="true" data-testid="verified-mark">
                ★
              </span>
              <span>Verified Seller</span>
              <span className={styles.metaDot} aria-hidden="true">
                ·
              </span>
            </>
          )}
          <span>{listing.views_count} views</span>
        </p>
      </div>
    </article>
  );
}
