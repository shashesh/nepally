import { LISTING_SOFT_EXPIRY_DAYS, LISTING_EXPIRY_WARNING_DAYS } from '../../constants/marketplace';
import type { MarketplaceListing } from '../../types/marketplace';
import { pluralize } from '../../utils/text';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days since a listing's `refreshed_at`, rounded down.
 *
 * `now` is a parameter (not read from the clock) so callers stay pure — React
 * components should capture it once, e.g. `useState(() => new Date())`.
 * A `refreshed_at` later than `now` (client clock skew, or a listing refreshed
 * after `now` was captured) clamps to 0 rather than going negative.
 */
export function getDaysSinceRefresh(refreshedAt: string, now: Date): number {
  const elapsedMs = now.getTime() - new Date(refreshedAt).getTime();
  return Math.max(0, Math.floor(elapsedMs / MS_PER_DAY));
}

/**
 * Days left before a listing reaches `LISTING_SOFT_EXPIRY_DAYS` since its last
 * refresh (after which it is deprioritised in search). Never negative.
 */
export function getDaysUntilSoftExpiry(refreshedAt: string, now: Date): number {
  return Math.max(0, LISTING_SOFT_EXPIRY_DAYS - getDaysSinceRefresh(refreshedAt, now));
}

/**
 * True when an active listing is within `LISTING_EXPIRY_WARNING_DAYS` of soft
 * expiry — the point at which its owner should be warned to refresh it.
 */
export function isListingExpiringSoon(
  listing: Pick<MarketplaceListing, 'status' | 'refreshed_at'>,
  now: Date
): boolean {
  return (
    listing.status === 'active' &&
    getDaysUntilSoftExpiry(listing.refreshed_at, now) <= LISTING_EXPIRY_WARNING_DAYS
  );
}

/**
 * The owner's expiry notice for a listing, or null when none is due.
 * Once soft expiry has already passed (0 days left), the notice nudges the
 * owner to refresh rather than repeating "Expires in 0 days" forever.
 */
export function getListingExpiryNotice(
  listing: Pick<MarketplaceListing, 'status' | 'refreshed_at'>,
  now: Date
): string | null {
  if (!isListingExpiringSoon(listing, now)) return null;

  const daysLeft = getDaysUntilSoftExpiry(listing.refreshed_at, now);
  return daysLeft === 0 ? 'Refresh to stay visible in search' : `Expires in ${pluralize(daysLeft, 'day')}`;
}
