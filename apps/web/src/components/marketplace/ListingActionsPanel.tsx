import React from 'react';
import Link from 'next/link';
import { Button, Loader } from '@mantine/core';
import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import type { MarketplaceListing } from '@nepally/shared';
import styles from './ListingActionsPanel.module.css';

export interface ListingActionsPanelProps {
  listing: MarketplaceListing;
  isOwner: boolean;
  isSaved: boolean;
  saving: boolean;
  /** A conversation with the seller is being opened. */
  contacting: boolean;
  onContact: () => void;
  onToggleSave: () => void;
}

/**
 * The price and what the viewer can do with the listing, rendered once in
 * the detail page's "Listing actions" aside.
 */
export function ListingActionsPanel({
  listing,
  isOwner,
  isSaved,
  saving,
  contacting,
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
          {/* Busy the same way as Save below, for the same reason. */}
          <Button
            onClick={() => {
              if (!contacting) onContact();
            }}
            aria-disabled={contacting || undefined}
            data-disabled={contacting || undefined}
            leftSection={contacting ? <Loader size={16} /> : undefined}
          >
            Contact Seller
          </Button>
          {/* One stable name, with aria-pressed carrying the state: renaming
              the button to "Saved" while also setting aria-pressed is the
              contradiction APG warns about. The bookmark fills in, so the
              state is still visible without the name moving.

              While the write is in flight it takes aria-disabled and
              data-disabled, never Mantine's `loading`, which sets native
              `disabled` and so drops focus to <body> from the very control
              the member just pressed. */}
          <Button
            variant={isSaved ? 'filled' : 'outline'}
            onClick={() => {
              if (!saving) onToggleSave();
            }}
            aria-disabled={saving || undefined}
            data-disabled={saving || undefined}
            aria-pressed={isSaved}
            leftSection={
              saving ? (
                <Loader size={16} />
              ) : isSaved ? (
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
