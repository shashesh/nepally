import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { type MarketplaceListing, LISTING_TYPE_LABELS } from '@nepally/shared';
import styles from '../../pages/marketplace/marketplace.module.css';

interface ListingCardProps {
  listing: MarketplaceListing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const categoryColor = listing.category?.color ?? '#9E9E9E';
  const categoryBgColor = categoryColor + '20';

  return (
    <Link
      href={`/marketplace/listing/${listing.id}`}
      className={styles.listingCard}
      style={{
        '--category-color': categoryColor,
        '--category-bg': categoryBgColor,
      } as React.CSSProperties}
    >
      {listing.photos.length > 0 ? (
        <Image
          src={listing.photos[0]}
          alt={listing.title}
          className={styles.listingPhoto}
          fill
        />
      ) : (
        <div className={styles.listingPhotoPlaceholder}>
          {listing.category?.emoji ?? '📦'}
        </div>
      )}
      <div className={styles.listingContent}>
        <div>
          <div className={styles.listingTitle}>{listing.title}</div>
          <div className={styles.listingMeta}>
            <span
              className={styles.badge}
            >
              {listing.category?.emoji} {listing.category?.name}
            </span>
            <span className={styles.badgeType}>
              {LISTING_TYPE_LABELS[listing.listing_type]}
            </span>
          </div>
        </div>
        {listing.price && (
          <div className={styles.listingPrice}>{listing.price}</div>
        )}
        <div className={styles.listingStats}>
          <span>{listing.views_count} views</span>
          <span>{listing.saves_count} saves</span>
        </div>
      </div>
    </Link>
  );
}
