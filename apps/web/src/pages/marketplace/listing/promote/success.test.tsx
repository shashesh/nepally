import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '../../../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPromotionById, type ListingPromotion } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('../../../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: MockHeadProps) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));
vi.mock('../../../../lib/supabase', () => ({ supabase: {} }));

vi.mock('@nepally/shared', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getPromotionById: vi.fn(async () => ({ data: null })),
  };
});

import PromoteSuccessPage from './success.page';

const mockGetPromotionById = getPromotionById as ReturnType<typeof vi.fn>;

const MOCK_PROMOTION: ListingPromotion = {
  id: 'promo-1',
  listing_id: 'listing-1',
  user_id: 'user-1',
  promotion_type: 'featured_listing',
  status: 'pending',
  duration_days: 7,
  daily_cost_cents: 100,
  total_cost_cents: 700,
  start_date: null,
  end_date: null,
  stripe_checkout_session_id: 'cs_test',
  stripe_payment_intent_id: null,
  views_at_start: null,
  created_at: '2026-09-22T00:00:00Z',
  updated_at: '2026-09-22T00:00:00Z',
};

/** Long enough to exhaust every poll attempt and its retry delay. */
const ALL_ATTEMPTS_MS = 60_000;

async function runOutThePoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ALL_ATTEMPTS_MS);
  });
}

describe('PromoteSuccessPage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mocks.useRouter.mockReturnValue({
      replace: mockReplace,
      query: { promotion_id: 'promo-1' },
      isReady: true,
      asPath: '/marketplace/listing/promote/success?promotion_id=promo-1',
    });
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockGetPromotionById.mockResolvedValue({ data: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('links to the listing once the promotion goes active', async () => {
    mockGetPromotionById.mockResolvedValue({
      data: { ...MOCK_PROMOTION, status: 'active' },
    });

    render(React.createElement(PromoteSuccessPage));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /boost active/i })).toBeDefined();
    });
    expect(
      screen.getByRole('link', { name: /view listing/i }).getAttribute('href')
    ).toBe('/marketplace/listing/listing-1');
  });

  it('offers a way back to My Listings when every poll fails', async () => {
    mockGetPromotionById.mockResolvedValue({ error: new Error('network down') });

    render(React.createElement(PromoteSuccessPage));
    await runOutThePoll();

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /my listings/i }).getAttribute('href')
      ).toBe('/marketplace/my-listings');
    });
  });

  it('says the promotion could not be confirmed when every poll fails', async () => {
    mockGetPromotionById.mockResolvedValue({ error: new Error('network down') });

    render(React.createElement(PromoteSuccessPage));
    await runOutThePoll();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/couldn't confirm/i);
    });
  });

  it('polls again when the member presses Try again', async () => {
    mockGetPromotionById.mockResolvedValue({ error: new Error('network down') });

    render(React.createElement(PromoteSuccessPage));
    await runOutThePoll();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
    });

    const callsBeforeRetry = mockGetPromotionById.mock.calls.length;
    mockGetPromotionById.mockResolvedValue({
      data: { ...MOCK_PROMOTION, status: 'active' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /boost active/i })).toBeDefined();
    });
    expect(mockGetPromotionById.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });

  it('drops the previous promotion when promotion_id changes', async () => {
    mockGetPromotionById.mockResolvedValue({
      data: { ...MOCK_PROMOTION, status: 'active' },
    });

    const { rerender } = render(React.createElement(PromoteSuccessPage));
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /view listing/i }).getAttribute('href')
      ).toBe('/marketplace/listing/listing-1');
    });

    // A second promotion is opened on the same mounted page. Nothing from the
    // first one may survive: its link points at the wrong listing.
    mocks.useRouter.mockReturnValue({
      replace: mockReplace,
      query: { promotion_id: 'promo-2' },
      isReady: true,
      asPath: '/marketplace/listing/promote/success?promotion_id=promo-2',
    });
    mockGetPromotionById.mockResolvedValue({ data: null });

    await act(async () => {
      rerender(React.createElement(PromoteSuccessPage));
    });

    expect(screen.queryByRole('link', { name: /view listing/i })).toBeNull();
    expect(screen.getByRole('heading', { name: /processing payment/i })).toBeDefined();
  });

  it('shows a labelled loader while the payment is processing', async () => {
    render(React.createElement(PromoteSuccessPage));

    expect(screen.getByRole('heading', { name: /processing payment/i })).toBeDefined();
    expect(screen.getByLabelText('Processing payment')).toBeDefined();
    expect(screen.queryByText('Processing...')).toBeNull();
  });

  it('redirects to login when signed out', async () => {
    mocks.useAuth.mockReturnValue({ user: null });

    render(React.createElement(PromoteSuccessPage));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('stops polling once the promotion is active', async () => {
    mockGetPromotionById.mockResolvedValue({
      data: { ...MOCK_PROMOTION, status: 'active' },
    });

    render(React.createElement(PromoteSuccessPage));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /boost active/i })).toBeDefined();
    });

    const callsWhenActive = mockGetPromotionById.mock.calls.length;
    await runOutThePoll();

    expect(mockGetPromotionById.mock.calls.length).toBe(callsWhenActive);
  });
});
