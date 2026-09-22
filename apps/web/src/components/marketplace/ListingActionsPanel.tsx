import React from 'react';
import Link from 'next/link';
import { Button } from '@mantine/core';
import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import type { MarketplaceListing } from '@nepally/shared';
import styles from './ListingActionsPanel.module.css';

export interface ListingActionsPanelProps {
  listing: MarketplaceListing;
  isOwner: boolean;
  isSaved: boolean;
  saving: boolean;
  onContact: () => void;
  onToggleSave: () => void;
}

/**
 * The price and what the viewer can do with the listing. The detail page
 * renders it in two places — inline on narrow screens and in the aside on
 * wide ones — with CSS showing one at a time, so it lives here rather than
 * being written twice.
 */
export function ListingActionsPanel({
  listing,
  isOwner,
  isSaved,
  saving,
  onContact,
  onToggleSave,
}: ListingActionsPanelProps) {
  return (
    <>
      {listing.price && <p className={styles.price}>{listing.price}</p>}
      {isOwner ? (
        <>
          <Button component={Link} href={`/marketplace/create?edit=${listing.id}`} variant="outline">
            Edit Listing
          </Button>
          <Button component={Link} href={`/marketplace/listing/promote/${listing.id}`}>
            Promote
          </Button>
        </>
      ) : (
        <>
          <Button onClick={onContact}>Contact Seller</Button>
          {/* One stable name, with aria-pressed carrying the state: renaming
              the button to "Saved" while also setting aria-pressed is the
              contradiction APG warns about. The bookmark fills in, so the
              state is still visible without the name moving. */}
          <Button
            variant={isSaved ? 'filled' : 'outline'}
            onClick={onToggleSave}
            loading={saving}
            aria-pressed={isSaved}
            leftSection={
              isSaved ? (
                <IconBookmarkFilled size={16} aria-hidden="true" />
              ) : (
                <IconBookmark size={16} aria-hidden="true" />
              )
            }
          >
            Save listing
          </Button>
        </>
      )}
    </>
  );
}
