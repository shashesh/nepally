import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { type MarketplaceListing } from '@nepally/shared';
import styles from '../../pages/marketplace/marketplace.module.css';

const CATEGORY_THEME_CLASS_BY_SLUG: Record<string, string> = {
  'food-restaurants': styles.categoryThemeFoodRestaurants,
  'professional-services': styles.categoryThemeProfessionalServices,
  'immigration-legal': styles.categoryThemeImmigrationLegal,
  'remittance-finance': styles.categoryThemeRemittanceFinance,
  'grocery-specialty': styles.categoryThemeGrocerySpecialty,
  'health-wellness': styles.categoryThemeHealthWellness,
  'education-tutoring': styles.categoryThemeEducationTutoring,
  transportation: styles.categoryThemeTransportation,
  'home-services': styles.categoryThemeHomeServices,
  'beauty-wellness': styles.categoryThemeBeautyWellness,
  'cultural-services': styles.categoryThemeCulturalServices,
  other: styles.categoryThemeOther,
};

interface ListingCardProps {
  listing: MarketplaceListing;
  /** Show a "Sponsored" badge overlay */
  sponsored?: boolean;
}

export function ListingCard({ listing, sponsored }: ListingCardProps) {
  const categoryThemeClass =
    CATEGORY_THEME_CLASS_BY_SLUG[listing.category?.slug ?? ''] ?? styles.categoryThemeOther;
  const isVerifiedSeller = (listing.owner?.trust_level ?? 0) >= 1;
  const hasPhoto = listing.photos.length > 0;

  return (
    <Link
      href={`/marketplace/listing/${listing.id}`}
      className={`${styles.featuredCard} ${categoryThemeClass}`}
    >
      {hasPhoto ? (
        <Image
          src={listing.photos[0]}
          alt={listing.title}
          className={styles.cardImage}
          width={400}
          height={200}
        />
      ) : (
        <div className={styles.cardImagePlaceholder}>
          <span className={styles.cardImagePlaceholderEmoji}>
            {listing.category?.emoji ?? '📦'}
          </span>
        </div>
      )}
      {sponsored && (
        <span className={styles.sponsoredBadge}>Sponsored</span>
      )}
      <div className={styles.cardBody}>
        <div className={styles.cardCategoryChip}>
          {listing.category?.emoji} {listing.category?.name ?? 'Other'}
        </div>
        <div className={styles.cardTitle}>{listing.title}</div>
        {listing.price && (
          <div className={styles.cardPrice}>Starting at {listing.price}</div>
        )}
        <div className={styles.cardMetaLine}>
          {isVerifiedSeller && (
            <>
              <span className={styles.verifiedStar}>★</span>
              <span>Verified Seller</span>
              <span className={styles.metaDot}>·</span>
            </>
          )}
          <span>{listing.views_count} views</span>
        </div>
        <span className={styles.contactSellerBtn}>Contact Seller</span>
      </div>
    </Link>
  );
}
