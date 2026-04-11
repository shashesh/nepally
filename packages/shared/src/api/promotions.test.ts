import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getActivePromotionForListing,
  getPromotionsByUser,
  getPromotionById,
  getSponsoredFeedListings,
  getStickyBusinessListings,
  createPromotionCheckout,
  getPromotionAnalytics,
} from './promotions';

const MOCK_PROMOTION = {
  id: 'promo-1',
  listing_id: 'listing-1',
  user_id: 'user-1',
  promotion_type: 'featured_listing',
  status: 'active',
  duration_days: 7,
  daily_cost_cents: 199,
  total_cost_cents: 1393,
  start_date: '2026-04-01T00:00:00Z',
  end_date: '2026-04-08T00:00:00Z',
  stripe_checkout_session_id: 'cs_test_123',
  stripe_payment_intent_id: null,
  views_at_start: 10,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

const MOCK_SPONSORED = {
  id: 'promo-2',
  promotion_type: 'sponsored_feed',
  listing: {
    id: 'listing-2',
    title: 'Sponsored Biz',
    metro_area_id: 'metro-1',
    status: 'active',
  },
};

// ─── getActivePromotionForListing ──────────────────────────────────────────

describe('getActivePromotionForListing', () => {
  it('returns active promotion for listing', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_PROMOTION, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getActivePromotionForListing(supabase, 'listing-1');
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe('promo-1');
    expect(supabase.from).toHaveBeenCalledWith('listing_promotions');
  });

  it('returns undefined data when no active promotion', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getActivePromotionForListing(supabase, 'listing-1');
    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('returns error on supabase failure', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getActivePromotionForListing(supabase, 'listing-1');
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('DB error');
  });
});

// ─── getPromotionsByUser ───────────────────────────────────────────────────

describe('getPromotionsByUser', () => {
  it('returns promotions sorted by created_at desc', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [MOCK_PROMOTION], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getPromotionsByUser(supabase, 'user-1');
    expect(result.data).toHaveLength(1);
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when no promotions', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getPromotionsByUser(supabase, 'user-1');
    expect(result.data).toEqual([]);
  });
});

// ─── getPromotionById ──────────────────────────────────────────────────────

describe('getPromotionById', () => {
  it('returns promotion by ID', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_PROMOTION, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getPromotionById(supabase, 'promo-1');
    expect(result.data?.id).toBe('promo-1');
  });

  it('returns error when not found', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getPromotionById(supabase, 'promo-999');
    expect(result.error).toBeDefined();
  });
});

// ─── getSponsoredFeedListings ──────────────────────────────────────────────

describe('getSponsoredFeedListings', () => {
  it('returns sponsored listings filtered by metro area', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [MOCK_SPONSORED], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSponsoredFeedListings(supabase, 'metro-1', { limit: 5 });
    expect(result.data).toHaveLength(1);
  });

  it('filters out listings from other metro areas', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [MOCK_SPONSORED], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSponsoredFeedListings(supabase, 'metro-OTHER');
    expect(result.data).toHaveLength(0);
  });

  it('returns empty array on error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getSponsoredFeedListings(supabase, 'metro-1');
    expect(result.error).toBeDefined();
  });
});

// ─── getStickyBusinessListings ─────────────────────────────────────────────

describe('getStickyBusinessListings', () => {
  it('queries for sticky_business promotion type', async () => {
    const stickyItem = { ...MOCK_SPONSORED, promotion_type: 'sticky_business' };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [stickyItem], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await getStickyBusinessListings(supabase, 'metro-1');
    expect(result.data).toHaveLength(1);
  });
});

// ─── createPromotionCheckout ───────────────────────────────────────────────

describe('createPromotionCheckout', () => {
  it('calls edge function and returns checkout data', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        promotionId: 'promo-new',
        checkoutUrl: 'https://checkout.stripe.com/test',
      }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await createPromotionCheckout(
      'https://my-project.supabase.co',
      'auth-token-123',
      'anon-key-123',
      {
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        promotion_type: 'featured_listing',
        duration_days: 7,
      },
      'web'
    );

    expect(result.data?.checkoutUrl).toBe('https://checkout.stripe.com/test');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://my-project.supabase.co/functions/v1/create-promotion-checkout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ apikey: 'anon-key-123' }),
      })
    );
  });

  it('returns error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Bad request' }),
    });

    const result = await createPromotionCheckout(
      'https://my-project.supabase.co',
      'token',
      'anon-key',
      {
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        promotion_type: 'featured_listing',
        duration_days: 7,
      },
      'mobile'
    );

    expect(result.error?.message).toBe('Bad request');
  });

  it('returns error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await createPromotionCheckout(
      'https://my-project.supabase.co',
      'token',
      'anon-key',
      {
        listing_id: '123e4567-e89b-12d3-a456-426614174000',
        promotion_type: 'featured_listing',
        duration_days: 7,
      },
      'web'
    );

    expect(result.error?.message).toBe('Network error');
  });
});

// ─── getPromotionAnalytics ─────────────────────────────────────────────────

describe('getPromotionAnalytics', () => {
  it('returns analytics with views delta', async () => {
    const promoChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...MOCK_PROMOTION, views_at_start: 10, listing_id: 'listing-1' },
        error: null,
      }),
    };
    const listingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { views_count: 25 },
        error: null,
      }),
    };

    let callCount = 0;
    const supabase = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? promoChain : listingChain;
      }),
    } as unknown as SupabaseClient;

    const result = await getPromotionAnalytics(supabase, 'promo-1');
    expect(result.data?.views_delta).toBe(15);
    expect(result.data?.current_views).toBe(25);
  });

  it('returns 0 delta when views_at_start is null', async () => {
    const promoChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...MOCK_PROMOTION, views_at_start: null, listing_id: 'listing-1' },
        error: null,
      }),
    };
    const listingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { views_count: 25 },
        error: null,
      }),
    };

    let callCount = 0;
    const supabase = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? promoChain : listingChain;
      }),
    } as unknown as SupabaseClient;

    const result = await getPromotionAnalytics(supabase, 'promo-1');
    expect(result.data?.views_delta).toBe(0);
  });
});
