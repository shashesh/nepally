import { describe, expect, it } from 'vitest';
import { isVerifiedSeller } from './seller';
import { TrustLevel } from '../../constants/trustLevels';
import type { MarketplaceListing } from '../../types/marketplace';

type OwnerOf = MarketplaceListing['owner'];

function listingWithOwner(owner: OwnerOf): Pick<MarketplaceListing, 'owner'> {
  return { owner };
}

function owner(trustLevel: number): OwnerOf {
  return {
    id: 'owner-1',
    full_name: 'Bikal Shrestha',
    trust_level: trustLevel,
    profile_photo: null,
  };
}

describe('isVerifiedSeller', () => {
  it('is true for a verified seller', () => {
    expect(isVerifiedSeller(listingWithOwner(owner(TrustLevel.VERIFIED)))).toBe(true);
  });

  it('is true for a contributor, who is above verified', () => {
    expect(isVerifiedSeller(listingWithOwner(owner(TrustLevel.CONTRIBUTOR)))).toBe(true);
  });

  it('is false for a new member', () => {
    expect(isVerifiedSeller(listingWithOwner(owner(TrustLevel.NEW)))).toBe(false);
  });

  it('is false when the listing carries no owner', () => {
    expect(isVerifiedSeller(listingWithOwner(undefined))).toBe(false);
  });

  it('is false when the owner has no trust level', () => {
    expect(
      isVerifiedSeller(
        listingWithOwner({
          id: 'owner-1',
          full_name: 'Bikal Shrestha',
          trust_level: undefined as unknown as number,
          profile_photo: null,
        })
      )
    ).toBe(false);
  });
});
