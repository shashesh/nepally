import { TrustLevel } from '../../constants/trustLevels';
import type { MarketplaceListing } from '../../types/marketplace';

/** Why a member can't promote a listing. */
export type PromotionBlocker = 'not_owner' | 'inactive' | 'unverified';

export interface PromotionViewer {
  id: string;
  trust_level?: number | null;
}

/**
 * Why this viewer can't promote this listing, or null when they can.
 *
 * Checked in order, so a stranger's listing is refused as not theirs before
 * its status or the viewer's trust level is mentioned — the same order the
 * checkout edge function checks in. The edge function stays the authority;
 * this lets the wizard refuse before the member works through three steps.
 * An inactive listing is refused because a promotion on a listing nobody can
 * see would be paid for and reach no one.
 */
export function getPromotionBlocker(
  listing: Pick<MarketplaceListing, 'owner_id' | 'status'>,
  viewer: PromotionViewer
): PromotionBlocker | null {
  if (listing.owner_id !== viewer.id) return 'not_owner';
  if (listing.status !== 'active') return 'inactive';
  if ((viewer.trust_level ?? TrustLevel.NEW) < TrustLevel.VERIFIED) return 'unverified';
  return null;
}

export const PROMOTION_BLOCKER_MESSAGES: Record<PromotionBlocker, { title: string; message: string }> = {
  not_owner: {
    title: 'You can only promote your own listings',
    message: 'This listing belongs to another member.',
  },
  inactive: {
    title: 'Reactivate this listing to promote it',
    message: 'Inactive listings are hidden from the marketplace, so a promotion would reach no one.',
  },
  unverified: {
    title: 'Verify your account to promote listings',
    message: 'Only verified members (Level 1 and above) can create promotions.',
  },
};
