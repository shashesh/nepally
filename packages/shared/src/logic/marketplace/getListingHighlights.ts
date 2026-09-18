import type { MarketplaceListing } from '../../types/marketplace';
import { isBusinessOpenNow } from './isBusinessOpenNow';
import { getDaysSinceRefresh } from './listingAge';

export interface HighlightChip {
  key: string;
  icon: string;
  label: string;
  value: string;
}

function formatPostedAgo(refreshedAt: string, now: Date): string {
  const days = getDaysSinceRefresh(refreshedAt, now);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted 1d ago';
  return `Posted ${days}d ago`;
}

function shortenAddress(address: string): string {
  const comma = address.indexOf(',');
  return comma === -1 ? address : address.slice(0, comma);
}

export function getListingHighlights(
  listing: MarketplaceListing,
  now: Date
): HighlightChip[] {
  const chips: HighlightChip[] = [];

  if (listing.listing_type === 'business') {
    const status = isBusinessOpenNow(listing.business_hours, now);
    if (listing.business_hours) {
      chips.push({
        key: 'open_now',
        icon: '🕒',
        label: status.isOpen ? 'Open now' : 'Closed',
        value: status.nextChangeLabel ?? (status.isOpen ? 'Open now' : 'Closed'),
      });
    }
    if (listing.address) {
      chips.push({
        key: 'address',
        icon: '📍',
        label: 'Location',
        value: shortenAddress(listing.address),
      });
    }
    if (listing.phone) {
      chips.push({
        key: 'phone',
        icon: '📞',
        label: 'Phone',
        value: listing.phone,
      });
    }
    return chips;
  }

  // individual
  if (listing.item_condition) {
    chips.push({
      key: 'condition',
      icon: '✨',
      label: 'Condition',
      value: listing.item_condition === 'new' ? 'New' : 'Used',
    });
  }
  if (listing.category?.name) {
    chips.push({
      key: 'category',
      icon: listing.category.emoji ?? '🏷️',
      label: 'Category',
      value: listing.category.name,
    });
  }
  chips.push({
    key: 'posted',
    icon: '🗓️',
    label: 'Posted',
    value: formatPostedAgo(listing.refreshed_at, now),
  });
  return chips;
}
