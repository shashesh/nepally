import { renderHook, act } from '@testing-library/react-native';
import {
  getFeaturedListings,
  getListingsByMetro,
  getStickyBusinessListings,
  getTrendingListings,
} from '@nepally/shared';
import type { ListingFilters, ListingsResult, MarketplaceListing } from '@nepally/shared';
import { useMarketplaceFeed, type MarketplaceFeedFilters } from './useMarketplaceFeed';

jest.mock('../config/supabase', () => ({ supabase: {} }));

jest.mock('@nepally/shared', () => ({
  userMessage: jest.requireActual('@nepally/shared').userMessage,
  getListingsByMetro: jest.fn(),
  getFeaturedListings: jest.fn(),
  getTrendingListings: jest.fn(),
  getStickyBusinessListings: jest.fn(),
}));

const mockGetListingsByMetro = getListingsByMetro as jest.MockedFunction<typeof getListingsByMetro>;
const mockGetFeaturedListings = getFeaturedListings as jest.MockedFunction<typeof getFeaturedListings>;
const mockGetTrendingListings = getTrendingListings as jest.MockedFunction<typeof getTrendingListings>;
const mockGetStickyBusinessListings = getStickyBusinessListings as jest.MockedFunction<
  typeof getStickyBusinessListings
>;

function makeListing(id: string): MarketplaceListing {
  return {
    id,
    owner_id: 'owner',
    metro_area_id: 'm1',
    category_id: 'c1',
    listing_type: 'individual',
    status: 'active',
    title: `Listing ${id}`,
    description: '',
    photos: [],
    price: null,
    business_name: null,
    address: null,
    business_hours: null,
    item_condition: null,
    phone: null,
    email: null,
    website_url: null,
    is_global: false,
    views_count: 0,
    saves_count: 0,
    contacts_count: 0,
    trending_score: 0,
    refreshed_at: '2026-09-01T00:00:00.000Z',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  };
}

function makeListings(prefix: string, count: number): MarketplaceListing[] {
  return Array.from({ length: count }, (_, index) => makeListing(`${prefix}${index}`));
}

function page(rows: MarketplaceListing[], limit = 20): ListingsResult {
  return { data: rows, hasMore: rows.length === limit };
}

/** Grid pages (limit 20) come from a queue; the newest strip (limit 10) from `recent`. */
function mockSources({
  grid = [page(makeListings('g', 20))],
  recent = page(makeListings('r', 3), 10),
  featured = page(makeListings('f', 2), 10),
  trending = page(makeListings('t', 2), 10),
  sponsored = [makeListing('s0')],
}: {
  grid?: ListingsResult[];
  recent?: ListingsResult;
  featured?: ListingsResult;
  trending?: ListingsResult;
  sponsored?: MarketplaceListing[];
} = {}) {
  const gridQueue = [...grid];
  mockGetListingsByMetro.mockImplementation(async (_c: unknown, _m: string, filters?: ListingFilters) =>
    filters?.limit === 10 ? recent : (gridQueue.shift() ?? page([]))
  );
  mockGetFeaturedListings.mockResolvedValue(featured);
  mockGetTrendingListings.mockResolvedValue(trending);
  mockGetStickyBusinessListings.mockResolvedValue({
    data: sponsored.map((listing) => ({ id: `p-${listing.id}`, promotion_type: 'sticky_business', listing })),
  });
}

function gridCalls(): ListingFilters[] {
  return mockGetListingsByMetro.mock.calls
    .map((call) => call[2] ?? {})
    .filter((filters) => filters.limit === 20);
}

async function settle() {
  await act(async () => {});
  await act(async () => {});
}

const UNFILTERED: MarketplaceFeedFilters = { categorySlug: '', searchQuery: '' };

async function renderFeed(metroId = 'm1', filters: MarketplaceFeedFilters = UNFILTERED) {
  const hook = renderHook(
    ({ metro, feedFilters }: { metro: string; feedFilters: MarketplaceFeedFilters }) =>
      useMarketplaceFeed(metro, feedFilters),
    { initialProps: { metro: metroId, feedFilters: filters } }
  );
  await settle();
  return hook;
}

describe('useMarketplaceFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // userMessage logs the raw error through logClientEvent (console.error).
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('what it loads', () => {
    it('loads the grid and all four strips when nothing narrows the view', async () => {
      mockSources();
      const { result } = await renderFeed();

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.grid).toHaveLength(20);
      expect(result.current.recent.map((l) => l.id)).toEqual(['r0', 'r1', 'r2']);
      expect(result.current.featured.map((l) => l.id)).toEqual(['f0', 'f1']);
      expect(result.current.trending.map((l) => l.id)).toEqual(['t0', 't1']);
      expect(result.current.sponsored.map((l) => l.id)).toEqual(['s0']);
      expect(result.current.hasMore).toBe(true);
      expect(gridCalls()).toEqual([expect.objectContaining({ sortBy: 'newest', limit: 20, offset: 0 })]);
      expect(mockGetStickyBusinessListings).toHaveBeenCalledWith(expect.anything(), 'm1', { limit: 5 });
    });

    it('loads the category grid and its featured strip, and no other strip, for a category', async () => {
      mockSources();
      const { result } = await renderFeed('m1', { categorySlug: 'clothing', searchQuery: '' });

      expect(gridCalls()).toEqual([expect.objectContaining({ categorySlug: 'clothing', offset: 0 })]);
      expect(mockGetFeaturedListings).toHaveBeenCalledWith(expect.anything(), 'm1', {
        limit: 10,
        categorySlug: 'clothing',
      });
      expect(mockGetTrendingListings).not.toHaveBeenCalled();
      expect(mockGetStickyBusinessListings).not.toHaveBeenCalled();
      expect(result.current.recent).toEqual([]);
      expect(result.current.featured).toHaveLength(2);
    });

    it('loads only the grid for a search', async () => {
      mockSources();
      const { result } = await renderFeed('m1', { categorySlug: '', searchQuery: 'jacket' });

      expect(gridCalls()).toEqual([expect.objectContaining({ searchQuery: 'jacket', offset: 0 })]);
      expect(mockGetFeaturedListings).not.toHaveBeenCalled();
      expect(result.current.featured).toEqual([]);
      expect(result.current.sponsored).toEqual([]);
    });

    it('loads nothing without a metro', async () => {
      mockSources();
      const { result } = await renderFeed('');

      expect(result.current.loading).toBe(false);
      expect(result.current.hasMore).toBe(false);
      expect(mockGetListingsByMetro).not.toHaveBeenCalled();
    });
  });

  describe('failures', () => {
    it('treats a failed grid as the page failing and clears the strips', async () => {
      mockSources({ grid: [{ error: new Error('boom') }] });
      const { result } = await renderFeed();

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Couldn't load listings.");
      expect(result.current.grid).toEqual([]);
      expect(result.current.featured).toEqual([]);
      expect(result.current.sponsored).toEqual([]);
    });

    it('leaves a failed strip empty and still shows the grid', async () => {
      mockSources({ trending: { error: new Error('boom') } });
      const { result } = await renderFeed();

      expect(result.current.error).toBeNull();
      expect(result.current.trending).toEqual([]);
      expect(result.current.grid).toHaveLength(20);
    });

    it('starts over from loading on reload after a failure', async () => {
      mockSources({ grid: [{ error: new Error('boom') }, page(makeListings('g', 5))] });
      const { result } = await renderFeed();
      expect(result.current.error).not.toBeNull();

      act(() => result.current.reload());
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      await settle();

      expect(result.current.loading).toBe(false);
      expect(result.current.grid).toHaveLength(5);
    });
  });

  describe('changing what is shown', () => {
    it('resets to loading with no rows when the filter changes', async () => {
      mockSources();
      const { result, rerender } = await renderFeed();
      expect(result.current.grid).toHaveLength(20);

      mockSources({ grid: [page(makeListings('c', 4))] });
      rerender({ metro: 'm1', feedFilters: { categorySlug: 'clothing', searchQuery: '' } });

      expect(result.current.loading).toBe(true);
      expect(result.current.grid).toEqual([]);
      await settle();
      expect(result.current.grid.map((l) => l.id)).toEqual(['c0', 'c1', 'c2', 'c3']);
    });

    it('drops a response that lands after the metro changed', async () => {
      let resolveSlow: (value: ListingsResult) => void = () => {};
      mockSources();
      mockGetListingsByMetro.mockImplementationOnce(
        () => new Promise<ListingsResult>((resolve) => (resolveSlow = resolve))
      );
      const { result, rerender } = await renderFeed('m1');

      mockSources({ grid: [page(makeListings('new', 3))] });
      rerender({ metro: 'm2', feedFilters: UNFILTERED });
      await settle();
      expect(result.current.grid.map((l) => l.id)).toEqual(['new0', 'new1', 'new2']);

      await act(async () => resolveSlow(page(makeListings('old', 20))));
      expect(result.current.grid.map((l) => l.id)).toEqual(['new0', 'new1', 'new2']);
    });
  });

  describe('paging', () => {
    it('asks for the next page by rows consumed and skips ids already shown', async () => {
      const second = [...makeListings('g', 2), ...makeListings('h', 18)];
      mockSources({ grid: [page(makeListings('g', 20)), page(second)] });
      const { result } = await renderFeed();

      act(() => result.current.loadMore());
      await settle();

      expect(gridCalls()[1]).toEqual(expect.objectContaining({ offset: 20 }));
      expect(result.current.grid).toHaveLength(38);
      expect(new Set(result.current.grid.map((l) => l.id)).size).toBe(38);
    });

    it('does not ask twice while a page is loading', async () => {
      mockSources({ grid: [page(makeListings('g', 20)), page(makeListings('h', 20))] });
      const { result } = await renderFeed();

      act(() => {
        result.current.loadMore();
        result.current.loadMore();
      });
      await settle();

      expect(gridCalls()).toHaveLength(2);
    });

    it('stops paging after a failed page until it is retried', async () => {
      mockSources({
        grid: [page(makeListings('g', 20)), { error: new Error('boom') }, page(makeListings('h', 5))],
      });
      const { result } = await renderFeed();

      act(() => result.current.loadMore());
      await settle();
      expect(result.current.loadMoreError).toBe("Couldn't load more listings.");
      expect(result.current.hasMore).toBe(false);

      act(() => result.current.loadMore());
      await settle();
      expect(gridCalls()).toHaveLength(2);

      act(() => result.current.retryLoadMore());
      await settle();
      expect(gridCalls()[2]).toEqual(expect.objectContaining({ offset: 20 }));
      expect(result.current.loadMoreError).toBeNull();
      expect(result.current.grid).toHaveLength(25);
    });
  });

  describe('refreshing', () => {
    it('keeps the rows on screen during a pull-to-refresh, then replaces them', async () => {
      mockSources({ grid: [page(makeListings('g', 20)), page(makeListings('fresh', 2))] });
      const { result } = await renderFeed();

      act(() => result.current.refresh());
      expect(result.current.refreshing).toBe(true);
      expect(result.current.grid).toHaveLength(20);
      await settle();

      expect(result.current.refreshing).toBe(false);
      expect(result.current.grid.map((l) => l.id)).toEqual(['fresh0', 'fresh1']);
    });

    it('revalidates quietly: new rows go on top and pages already loaded stay', async () => {
      const newest = [makeListing('brand-new'), ...makeListings('g', 19)];
      mockSources({
        grid: [page(makeListings('g', 20)), page(makeListings('h', 20)), page(newest)],
      });
      const { result } = await renderFeed();
      act(() => result.current.loadMore());
      await settle();
      expect(result.current.grid).toHaveLength(40);

      act(() => result.current.revalidate());
      expect(result.current.loading).toBe(false);
      expect(result.current.refreshing).toBe(false);
      await settle();

      expect(result.current.grid).toHaveLength(41);
      expect(result.current.grid[0].id).toBe('brand-new');
      expect(result.current.grid[40].id).toBe('h19');
    });

    it('keeps the rows and says so when a pull-to-refresh fails', async () => {
      mockSources({ grid: [page(makeListings('g', 20)), { error: new Error('boom') }] });
      const { result } = await renderFeed();

      act(() => result.current.refresh());
      await settle();

      expect(result.current.refreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.refreshError).toBe("Couldn't refresh listings.");
      expect(result.current.grid).toHaveLength(20);
      expect(result.current.recent).toHaveLength(3);
    });

    it('clears the refresh failure once a load succeeds', async () => {
      mockSources({
        grid: [page(makeListings('g', 20)), { error: new Error('boom') }, page(makeListings('n', 2))],
      });
      const { result } = await renderFeed();
      act(() => result.current.refresh());
      await settle();
      expect(result.current.refreshError).not.toBeNull();

      act(() => result.current.refresh());
      await settle();

      expect(result.current.refreshError).toBeNull();
      expect(result.current.grid.map((l) => l.id)).toEqual(['n0', 'n1']);
    });

    it('treats a failed pull-to-refresh with nothing on screen as the page failing', async () => {
      mockSources({ grid: [page([]), { error: new Error('boom') }] });
      const { result } = await renderFeed();

      act(() => result.current.refresh());
      await settle();

      expect(result.current.error).toBe("Couldn't load listings.");
      expect(result.current.refreshError).toBeNull();
    });

    it('loads from scratch after the filter flips away and back while a revalidation is pending', async () => {
      mockSources({ grid: [page(makeListings('g', 20)), page(makeListings('g', 20))] });
      const { result, rerender } = await renderFeed();

      act(() => result.current.revalidate());
      rerender({ metro: 'm1', feedFilters: { categorySlug: 'clothing', searchQuery: '' } });
      mockSources({ grid: [page(makeListings('a', 20)), page(makeListings('b', 20))] });
      rerender({ metro: 'm1', feedFilters: UNFILTERED });
      await settle();

      act(() => result.current.loadMore());
      await settle();

      // A fresh first load leaves the next page at 20; a misread quiet refresh would ask for 0 again.
      expect(gridCalls().at(-1)).toEqual(expect.objectContaining({ offset: 20 }));
    });

    it('keeps what is on screen when a quiet revalidation fails', async () => {
      mockSources({ grid: [page(makeListings('g', 20)), { error: new Error('boom') }] });
      const { result } = await renderFeed();

      act(() => result.current.revalidate());
      await settle();

      expect(result.current.error).toBeNull();
      expect(result.current.grid).toHaveLength(20);
    });
  });
});
