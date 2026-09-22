import { TrustLevel } from '../../constants/trustLevels';
import type { MarketplaceListing } from '../../types/marketplace';

/**
 * Whether a listing's owner is a verified seller.
 *
 * Web's ListingCard, mobile's ListingCard and mobile's ListingGridCard each
 * carried their own `(listing.owner?.trust_level ?? 0) >= 1` before this.
 */
export function isVerifiedSeller(listing: Pick<MarketplaceListing, 'owner'>): boolean {
  return (listing.owner?.trust_level ?? TrustLevel.NEW) >= TrustLevel.VERIFIED;
}
