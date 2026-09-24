import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getListingsByMetro,
  getFeaturedListings,
  getTrendingListings,
  getStickyBusinessListings,
  type MarketplaceListing,
} from '@nepally/shared';
import { parseMarketplaceQuery } from '../lib/marketplaceQuery';
import { useMarketplaceFeed } from './useMarketplaceFeed';

vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getListingsByMetro: vi.fn(),
  getFeaturedListings: vi.fn(),
  getTrendingListings: vi.fn(),
  getStickyBusinessListings: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

const RLS_TEXT = 'new row violates row-level security policy';
const LOAD_FAILED = "Couldn't load listings.";
const LOAD_MORE_FAILED = "Couldn't load more listings.";

const mockGetListings = getListingsByMetro as ReturnType<typeof vi.fn>;
const mockGetFeatured = getFeaturedListings as ReturnType<typeof vi.fn>;
const mockGetTrending = getTrendingListings as ReturnType<typeof vi.fn>;
const mockGetSticky = getStickyBusinessListings as ReturnType<typeof vi.fn>;

function listing(id: string): MarketplaceListing {
  return { id, title: `Listing ${id}`, photos: [] } as unknown as MarketplaceListing;
}

function page(ids: string[], hasMore = false) {
  return { data: ids.map(listing), hasMore };
}

const UNFILTERED = parseMarketplaceQuery({});
const FILTERED = parseMarketplaceQuery({ category: 'food-restaurants' });

describe('useMarketplaceFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetListings.mockResolvedValue(page([]));
    mockGetFeatured.mockResolvedValue(page([]));
    mockGetTrending.mockResolvedValue(page([]));
    mockGetSticky.mockResolvedValue({ data: [] });
  });

  it('loads the strips and the grid when nothing narrows the marketplace', async () => {
    mockGetFeatured.mockResolvedValue(page(['f1']));
    mockGetTrending.mockResolvedValue(page(['t1']));
    mockGetSticky.mockResolvedValue({ data: [{ id: 'p1', promotion_type: 'sponsored_feed', listing: listing('s1') }] });
    // Told apart by their limit, not by call order: the strip asks for 10,
    // the grid for 20.
    mockGetListings.mockImplementation((_supabase, _metro, options) =>
      Promise.resolve(options?.limit === 10 ? page(['r1']) : page(['g1']))
    );

    const { result } = renderHook(() => useMarketplaceFeed('metro-1', UNFILTERED));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.featured.map((l) => l.id)).toEqual(['f1']);
    expect(result.current.trending.map((l) => l.id)).toEqual(['t1']);
    expect(result.current.sponsored.map((l) => l.id)).toEqual(['s1']);
    expect(result.current.recent.map((l) => l.id)).toEqual(['r1']);
    expect(result.current.grid.map((l) => l.id)).toEqual(['g1']);
    expect(result.current.error).toBeNull();
  });

  it('does not ask for the strips when the marketplace is narrowed', async () => {
    const { result } = renderHook(() => useMarketplaceFeed('metro-1', parseMarketplaceQuery({ q: 'momo' })));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetTrending).not.toHaveBeenCalled();
    expect(mockGetSticky).not.toHaveBeenCalled();
  });

  it('clears the rows and reports the failure when the grid fails', async () => {
    mockGetListings.mockResolvedValue({ error: new Error(RLS_TEXT) });

    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(LOAD_FAILED);
    expect(result.current.grid).toEqual([]);
  });

  // recon 1: the old page left the previous metro's rows on screen, looking loaded.
  it('does not keep the previous metro rows when the next load fails', async () => {
    mockGetListings.mockResolvedValue(page(['g1']));
    const { result, rerender } = renderHook(
      ({ metro }) => useMarketplaceFeed(metro, FILTERED),
      { initialProps: { metro: 'metro-1' } }
    );
    await waitFor(() => expect(result.current.grid.map((l) => l.id)).toEqual(['g1']));

    mockGetListings.mockResolvedValue({ error: new Error(RLS_TEXT) });
    rerender({ metro: 'metro-2' });

    await waitFor(() => expect(result.current.error).toBe(LOAD_FAILED));
    expect(result.current.grid).toEqual([]);
  });

  it('clears the strips too when an unfiltered load fails', async () => {
    mockGetFeatured.mockResolvedValue(page(['f1']));
    mockGetListings.mockResolvedValue(page(['g1']));
    const { result, rerender } = renderHook(
      ({ metro }) => useMarketplaceFeed(metro, UNFILTERED),
      { initialProps: { metro: 'metro-1' } }
    );
    await waitFor(() => expect(result.current.featured.map((l) => l.id)).toEqual(['f1']));

    mockGetListings.mockResolvedValue({ error: new Error(RLS_TEXT) });
    rerender({ metro: 'metro-2' });

    await waitFor(() => expect(result.current.error).toBe(LOAD_FAILED));
    expect(result.current.featured).toEqual([]);
    expect(result.current.grid).toEqual([]);
  });

  it('stops offering more after a failed first load', async () => {
    mockGetListings.mockResolvedValue({ error: new Error(RLS_TEXT) });

    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });

  // recon 2: the old page only set hasMore=false, so a failure looked like the end.
  it('reports a failed load-more without dropping the rows already shown', async () => {
    mockGetListings.mockResolvedValueOnce(page(['g1'], true));
    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    mockGetListings.mockResolvedValueOnce({ error: new Error(RLS_TEXT) });
    act(() => { result.current.loadMore(); });

    await waitFor(() => expect(result.current.loadMoreError).toBe(LOAD_MORE_FAILED));
    expect(result.current.grid.map((l) => l.id)).toEqual(['g1']);
    expect(result.current.hasMore).toBe(false);
  });

  it('clears the load-more failure and pages again on retry', async () => {
    mockGetListings.mockResolvedValueOnce(page(['g1'], true));
    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    mockGetListings.mockResolvedValueOnce({ error: new Error(RLS_TEXT) });
    act(() => { result.current.loadMore(); });
    await waitFor(() => expect(result.current.loadMoreError).toBe(LOAD_MORE_FAILED));

    mockGetListings.mockResolvedValueOnce(page(['g2']));
    act(() => { result.current.retryLoadMore(); });

    await waitFor(() => expect(result.current.grid.map((l) => l.id)).toEqual(['g1', 'g2']));
    expect(result.current.loadMoreError).toBeNull();
  });

  it('never shows the same listing twice across pages', async () => {
    mockGetListings.mockResolvedValueOnce(page(['g1', 'g2'], true));
    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    mockGetListings.mockResolvedValueOnce(page(['g2', 'g3']));
    act(() => { result.current.loadMore(); });

    await waitFor(() => expect(result.current.grid.map((l) => l.id)).toEqual(['g1', 'g2', 'g3']));
  });

  it('starts over when the query changes', async () => {
    mockGetListings.mockResolvedValue(page(['g1']));
    const { result, rerender } = renderHook(
      ({ query }) => useMarketplaceFeed('metro-1', query),
      { initialProps: { query: FILTERED } }
    );
    await waitFor(() => expect(result.current.grid.map((l) => l.id)).toEqual(['g1']));

    mockGetListings.mockResolvedValue(page(['g9']));
    rerender({ query: parseMarketplaceQuery({ category: 'other' }) });

    await waitFor(() => expect(result.current.grid.map((l) => l.id)).toEqual(['g9']));
  });

  it('drops a page that lands after the query changed', async () => {
    let resolveStale: ((value: unknown) => void) | undefined;
    mockGetListings.mockImplementationOnce(
      () => new Promise((resolve) => { resolveStale = resolve; })
    );

    const { result, rerender } = renderHook(
      ({ query }) => useMarketplaceFeed('metro-1', query),
      { initialProps: { query: FILTERED } }
    );

    mockGetListings.mockResolvedValue(page(['fresh']));
    rerender({ query: parseMarketplaceQuery({ category: 'other' }) });
    await waitFor(() => expect(result.current.grid.map((l) => l.id)).toEqual(['fresh']));

    // The abandoned request for the first category finally answers.
    await act(async () => {
      resolveStale?.(page(['stale']));
    });

    expect(result.current.grid.map((l) => l.id)).toEqual(['fresh']);
  });

  // The raw page is filtered client-side for a category slug, so the next
  // offset must count the rows the API consumed, not the rows on screen.
  it('pages by the API window, not by how many rows survived filtering', async () => {
    mockGetListings.mockResolvedValueOnce(page(['g1', 'g2'], true));
    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    mockGetListings.mockResolvedValueOnce(page(['g3'], false));
    act(() => { result.current.loadMore(); });
    await waitFor(() => expect(result.current.grid).toHaveLength(3));

    // Two rows are on screen, but the API consumed a full window of 20.
    expect(mockGetListings).toHaveBeenLastCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ offset: 20 })
    );
  });

  it('keeps asking for the next window when a page filters down to nothing', async () => {
    // A full raw window whose rows all belong to another category.
    mockGetListings.mockResolvedValueOnce(page([], true));
    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Nothing is on screen, but there is more to fetch.
    expect(result.current.grid).toHaveLength(0);
    expect(result.current.hasMore).toBe(true);

    mockGetListings.mockResolvedValueOnce(page(['g9'], false));
    act(() => { result.current.loadMore(); });

    await waitFor(() => expect(result.current.grid.map((l) => l.id)).toEqual(['g9']));
    expect(mockGetListings).toHaveBeenLastCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ offset: 20 })
    );
  });

  // PR 7 found the same fault in useEventFeed.
  it('drops a page in flight when the metro is cleared', async () => {
    mockGetListings.mockResolvedValueOnce(page(['g1'], true));
    const { result, rerender } = renderHook(
      ({ metro }) => useMarketplaceFeed(metro, FILTERED),
      { initialProps: { metro: 'metro-1' as string | null } }
    );
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    let landLate: ((value: unknown) => void) | undefined;
    mockGetListings.mockImplementationOnce(
      () => new Promise((resolve) => { landLate = resolve; })
    );
    act(() => { result.current.loadMore(); });

    rerender({ metro: null });
    await act(async () => {
      landLate?.(page(['stale-1', 'stale-2']));
    });

    expect(result.current.grid).toHaveLength(0);
  });

  it('asks for nothing until a metro is known', async () => {
    const { result } = renderHook(() => useMarketplaceFeed(null, UNFILTERED));

    await act(async () => {});
    expect(mockGetListings).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('reloads on demand', async () => {
    mockGetListings.mockResolvedValue(page(['g1']));
    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetListings.mockResolvedValue(page(['g2']));
    act(() => { result.current.reload(); });

    await waitFor(() => expect(result.current.grid.map((l) => l.id)).toEqual(['g2']));
  });

  it('scopes the featured strip to the active category', async () => {
    mockGetFeatured.mockResolvedValue(page(['cf1']));

    const { result } = renderHook(() => useMarketplaceFeed('metro-1', FILTERED));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetFeatured).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ categorySlug: 'food-restaurants' })
    );
    expect(result.current.featured.map((l) => l.id)).toEqual(['cf1']);
  });

  it('asks for no featured strip in search mode', async () => {
    const { result } = renderHook(() =>
      useMarketplaceFeed('metro-1', parseMarketplaceQuery({ category: 'search', q: 'momo' }))
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetFeatured).not.toHaveBeenCalled();
  });
});
