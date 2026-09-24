import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPromotionCheckout,
  getListingById,
  PROMOTION_TIERS,
  TrustLevel,
  type MarketplaceListing,
} from '@nepally/shared';
import { usePromoteWizard } from './usePromoteWizard';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
const NOW = new Date('2026-09-23T12:00:00.000Z');

vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getListingById: vi.fn(),
  createPromotionCheckout: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
vi.mock('./useNow', () => ({ useNow: () => NOW }));

const mockGetListing = getListingById as ReturnType<typeof vi.fn>;
const mockCheckout = createPromotionCheckout as ReturnType<typeof vi.fn>;

const OWNER = { id: 'owner-1', trust_level: TrustLevel.VERIFIED };
const FEATURED = PROMOTION_TIERS[0];
const LISTING = { id: 'listing-1', owner_id: 'owner-1', status: 'active', title: 'Momo catering' } as MarketplaceListing;

async function loaded(viewer = OWNER, redirect = vi.fn()) {
  const hook = renderHook(() => usePromoteWizard('listing-1', viewer, redirect));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('usePromoteWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetListing.mockResolvedValue({ data: LISTING });
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'token-1' } } });
    mockCheckout.mockResolvedValue({ data: { checkoutUrl: 'https://checkout.stripe.test/s1', promotionId: 'p1' } });
  });

  it('loads the listing and finds nothing blocking its owner', async () => {
    const { result } = await loaded();

    expect(mockGetListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    expect(result.current.listing).toEqual(LISTING);
    expect(result.current.blocker).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.notFound).toBe(false);
  });

  it('reports a failed read, in our copy, apart from a listing that is gone', async () => {
    mockGetListing.mockResolvedValueOnce({ error: new Error('new row violates row-level security policy') });
    const failed = await loaded();
    expect(failed.result.current.error).toBe("Couldn't load this listing.");
    expect(failed.result.current.notFound).toBe(false);
    expect(failed.result.current.listing).toBeNull();

    mockGetListing.mockResolvedValueOnce({ error: new Error('Listing not found'), notFound: true });
    const gone = await loaded();
    expect(gone.result.current.notFound).toBe(true);
    expect(gone.result.current.error).toBeNull();
  });

  it('reloads after a failed read', async () => {
    mockGetListing.mockResolvedValueOnce({ error: new Error('network down') });
    const { result } = await loaded();

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.listing).toEqual(LISTING));
    expect(result.current.error).toBeNull();
  });

  it('blocks a member who does not own the listing', async () => {
    const { result } = await loaded({ id: 'someone-else', trust_level: TrustLevel.VERIFIED });

    expect(result.current.blocker).toBe('not_owner');
  });

  it('will not leave step 1 without a tier, and never goes below it', async () => {
    const { result } = await loaded();

    act(() => result.current.next());
    expect(result.current.step).toBe(1);
    act(() => result.current.back());
    expect(result.current.step).toBe(1);

    act(() => result.current.setTier(FEATURED));
    act(() => result.current.next());
    expect(result.current.step).toBe(2);
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.step).toBe(3);
    act(() => result.current.back());
    expect(result.current.step).toBe(2);
  });

  it('clamps the duration and prices it by the day', async () => {
    const { result } = await loaded();
    act(() => result.current.setTier(FEATURED));

    act(() => result.current.setDays(''));
    expect(result.current.days).toBe(1);
    act(() => result.current.setDays(500));
    expect(result.current.days).toBe(90);
    act(() => result.current.setDays(0));
    expect(result.current.days).toBe(1);
    act(() => result.current.setDays('10'));
    expect(result.current.days).toBe(10);

    expect(result.current.totalCents).toBe(FEATURED.daily_cost_cents * 10);
    expect(result.current.startDate).toEqual(NOW);
    expect(result.current.endDate).toEqual(new Date('2026-10-03T12:00:00.000Z'));
  });

  it('asks the member to sign in again without a session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = await loaded();
    act(() => result.current.setTier(FEATURED));

    await act(async () => {
      await result.current.pay();
    });

    expect(result.current.payError).toBe('Please sign in again to continue.');
    expect(result.current.paying).toBe(false);
    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it('shows a checkout error in our copy, never the raw error, and frees the button', async () => {
    mockCheckout.mockResolvedValue({ error: new Error('new row violates row-level security policy') });
    const { result } = await loaded();
    act(() => result.current.setTier(FEATURED));

    await act(async () => {
      await result.current.pay();
    });

    expect(result.current.payError).toBe("Couldn't start checkout. Please try again.");
    expect(result.current.paying).toBe(false);
  });

  it('rechecks the listing at Pay, and refuses one deactivated since the wizard opened', async () => {
    const { result } = await loaded();
    act(() => result.current.setTier(FEATURED));
    mockGetListing.mockResolvedValue({ data: { ...LISTING, status: 'inactive' } });

    await act(async () => {
      await result.current.pay();
    });

    expect(mockCheckout).not.toHaveBeenCalled();
    expect(result.current.blocker).toBe('inactive');
    expect(result.current.paying).toBe(false);
  });

  it('does not start checkout when the recheck fails', async () => {
    const { result } = await loaded();
    act(() => result.current.setTier(FEATURED));
    mockGetListing.mockResolvedValue({ error: new Error('network down') });

    await act(async () => {
      await result.current.pay();
    });

    expect(mockCheckout).not.toHaveBeenCalled();
    expect(result.current.payError).toBe("Couldn't check this listing. Please try again.");
    expect(result.current.listing).toEqual(LISTING);
    expect(result.current.paying).toBe(false);
  });

  it('shows not found when the listing was deleted since the wizard opened', async () => {
    const { result } = await loaded();
    act(() => result.current.setTier(FEATURED));
    mockGetListing.mockResolvedValue({ error: new Error('Listing not found'), notFound: true });

    await act(async () => {
      await result.current.pay();
    });

    expect(mockCheckout).not.toHaveBeenCalled();
    expect(result.current.notFound).toBe(true);
    expect(result.current.listing).toBeNull();
  });

  it('says something went wrong when checkout returns no URL', async () => {
    mockCheckout.mockResolvedValue({ data: { promotionId: 'p1' } });
    const redirect = vi.fn();
    const { result } = await loaded(OWNER, redirect);
    act(() => result.current.setTier(FEATURED));

    await act(async () => {
      await result.current.pay();
    });

    expect(result.current.payError).toBe('Something went wrong. Please try again.');
    expect(result.current.paying).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('says something went wrong when checkout throws', async () => {
    mockCheckout.mockRejectedValue(new Error('boom'));
    const { result } = await loaded();
    act(() => result.current.setTier(FEATURED));

    await act(async () => {
      await result.current.pay();
    });

    expect(result.current.payError).toBe('Something went wrong. Please try again.');
    expect(result.current.paying).toBe(false);
  });

  it('sends the member to checkout and stays busy while the browser leaves', async () => {
    const redirect = vi.fn();
    const { result } = await loaded(OWNER, redirect);
    act(() => result.current.setTier(FEATURED));
    act(() => result.current.setDays(5));

    await act(async () => {
      await result.current.pay();
    });

    expect(mockCheckout).toHaveBeenCalledWith(
      expect.any(String),
      'token-1',
      expect.any(String),
      { listing_id: 'listing-1', promotion_type: FEATURED.type, duration_days: 5 },
      'web'
    );
    expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.test/s1');
    expect(result.current.paying).toBe(true);

    await act(async () => {
      await result.current.pay();
    });
    expect(mockCheckout).toHaveBeenCalledTimes(1);
  });

  it('starts one checkout for two clicks in the same moment', async () => {
    const { result } = await loaded();
    act(() => result.current.setTier(FEATURED));

    await act(async () => {
      await Promise.all([result.current.pay(), result.current.pay()]);
    });

    expect(mockCheckout).toHaveBeenCalledTimes(1);
  });
});
