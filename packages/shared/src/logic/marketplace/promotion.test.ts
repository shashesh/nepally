import { describe, expect, it } from 'vitest';
import { TrustLevel } from '../../constants/trustLevels';
import { getPromotionBlocker, PROMOTION_BLOCKER_MESSAGES } from './promotion';

const OWNER = { id: 'owner-1', trust_level: TrustLevel.VERIFIED };
const ACTIVE = { owner_id: 'owner-1', status: 'active' as const };

describe('getPromotionBlocker', () => {
  it('lets a verified owner promote an active listing', () => {
    expect(getPromotionBlocker(ACTIVE, OWNER)).toBeNull();
  });

  it('refuses another member’s listing before anything else', () => {
    const stranger = { id: 'someone-else', trust_level: TrustLevel.NEW };

    expect(getPromotionBlocker({ owner_id: 'owner-1', status: 'inactive' }, stranger)).toBe('not_owner');
  });

  it('refuses an inactive listing, which nobody can see', () => {
    expect(getPromotionBlocker({ owner_id: 'owner-1', status: 'inactive' }, OWNER)).toBe('inactive');
  });

  it('refuses a removed listing as inactive', () => {
    expect(getPromotionBlocker({ owner_id: 'owner-1', status: 'removed' }, OWNER)).toBe('inactive');
  });

  it('refuses an unverified owner', () => {
    expect(getPromotionBlocker(ACTIVE, { id: 'owner-1', trust_level: TrustLevel.NEW })).toBe('unverified');
  });

  it('treats a missing trust level as unverified', () => {
    expect(getPromotionBlocker(ACTIVE, { id: 'owner-1', trust_level: null })).toBe('unverified');
    expect(getPromotionBlocker(ACTIVE, { id: 'owner-1' })).toBe('unverified');
  });

  it('has a title and message for every blocker', () => {
    for (const blocker of ['not_owner', 'inactive', 'unverified'] as const) {
      expect(PROMOTION_BLOCKER_MESSAGES[blocker].title).not.toBe('');
      expect(PROMOTION_BLOCKER_MESSAGES[blocker].message).not.toBe('');
    }
  });
});
