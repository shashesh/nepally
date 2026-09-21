import React from 'react';
import Image from 'next/image';
import { VisuallyHidden } from '@mantine/core';
import {
  formatListingPrice,
  formatRelativeTime,
  getDaysUntilSoftExpiry,
  isListingExpiringSoon,
  LISTING_STATUS_LABELS,
  pluralize,
  type MarketplaceListing,
} from '@nepally/shared';
import { SummaryRow, SummaryRowMeta } from '../ui';
import styles from './ListingSummaryRow.module.css';

export interface ListingSummaryRowProps {
  listing: MarketplaceListing;
  /**
   * The owner's view: status, view/save/contact counts and the expiry
   * warning. `now` should come from `useNow()`, like EventSummaryRow's — so
   * every row agrees on what's stale, and tests can fix it.
   */
  owner?: { now: Date };
}

/** "Expires in N days", or a nudge to refresh once there are none left. */
function formatExpiryWarning(refreshedAt: string, now: Date): string {
  const daysLeft = getDaysUntilSoftExpiry(refreshedAt, now);
  return daysLeft === 0 ? 'Refresh to stay visible in search' : `Expires in ${pluralize(daysLeft, 'day')}`;
}

/**
 * One listing in a list of summaries — a user's own listings, a public
 * profile. Built on SummaryRow, matching PostSummaryRow and EventSummaryRow:
 * the title is the only link, and its `::after` stretches over the row. The
 * thumbnail sits in `leading` (under the overlay); the owner's status chip
 * sits in `badge` (beside the link, outside it) — the public view passes no
 * badge at all.
 */
export function ListingSummaryRow({ listing, owner }: ListingSummaryRowProps) {
  const price = formatListingPrice(listing.price);
  const categoryName = listing.category?.name ?? 'Marketplace';
  const photo = listing.photos?.[0];

  return (
    <SummaryRow
      href={`/marketplace/listing/${listing.id}`}
      title={listing.title}
      leading={
        <div className={styles.thumb}>
          {photo ? (
            <Image src={photo} alt="" fill sizes="64px" className={styles.thumbImage} />
          ) : (
            <span aria-hidden="true">{listing.category?.emoji ?? '📦'}</span>
          )}
        </div>
      }
      badge={
        owner && (
          <span className={styles.statusChip} data-status={listing.status}>
            <VisuallyHidden>Status: </VisuallyHidden>
            {LISTING_STATUS_LABELS[listing.status]}
          </span>
        )
      }
    >
      <SummaryRowMeta variant="detail">
        {price && <span>{price}</span>}
        <span>{categoryName}</span>
      </SummaryRowMeta>

      {owner ? (
        <>
          <SummaryRowMeta>
            <span>{pluralize(listing.views_count ?? 0, 'view')}</span>
            <span>{pluralize(listing.saves_count ?? 0, 'save')}</span>
            <span>{pluralize(listing.contacts_count ?? 0, 'contact')}</span>
          </SummaryRowMeta>

          {isListingExpiringSoon(listing, owner.now) && (
            <SummaryRowMeta>
              <span className={styles.expiry} data-tone="warning">
                {formatExpiryWarning(listing.refreshed_at, owner.now)}
              </span>
            </SummaryRowMeta>
          )}
        </>
      ) : (
        <SummaryRowMeta>
          <time dateTime={listing.created_at}>{formatRelativeTime(new Date(listing.created_at))}</time>
        </SummaryRowMeta>
      )}
    </SummaryRow>
  );
}
