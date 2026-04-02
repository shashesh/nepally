import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { type MarketplaceListing, LISTING_TYPE_LABELS } from '@nepally/shared';
import styles from '../../pages/marketplace/marketplace.module.css';

const CATEGORY_THEME_CLASS_BY_SLUG: Record<string, string> = {
  'food-restaurants': styles.categoryThemeFoodRestaurants,
  'professional-services': styles.categoryThemeProfessionalServices,
  'immigration-legal': styles.categoryThemeImmigrationLegal,
  'remittance-finance': styles.categoryThemeRemittanceFinance,
  other: styles.categoryThemeOther,
};

interface ListingCardProps {
  listing: MarketplaceListing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const categoryThemeClass =
    CATEGORY_THEME_CLASS_BY_SLUG[listing.category?.slug ?? ''] ?? styles.categoryThemeOther;

  return (
    <Link
      href={`/marketplace/listing/${listing.id}`}
      className={`${styles.listingCard} ${categoryThemeClass}`}
    >
      {listing.photos.length > 0 ? (
        <Image
          src={listing.photos[0]}
          alt={listing.title}
          className={styles.listingPhoto}
          width={120}
          height={120}
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
