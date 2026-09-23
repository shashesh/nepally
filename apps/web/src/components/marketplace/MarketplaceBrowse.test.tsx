import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MarketplaceListing } from '@nepally/shared';
import { parseMarketplaceQuery } from '../../lib/marketplaceQuery';
import type { MarketplaceFeedState } from '../../hooks/useMarketplaceFeed';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

const mocks = vi.hoisted(() => ({
  useMarketplaceFeed: vi.fn(),
  useCachedCategories: vi.fn(),
}));

vi.mock('../../hooks/useMarketplaceFeed', () => ({
  useMarketplaceFeed: mocks.useMarketplaceFeed,
}));
vi.mock('../../hooks/useCachedCategories', () => ({
  useCachedCategories: mocks.useCachedCategories,
}));

import { MarketplaceBrowse } from './MarketplaceBrowse';

/** jsdom has no IntersectionObserver, and the sentinel attaches one. */
class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  FakeIntersectionObserver;

function listing(id: string, title = `Listing ${id}`): MarketplaceListing {
  return {
    id,
    title,
    photos: [],
    views_count: 1,
    price: null,
    category: { id: 'c', name: 'Other', slug: 'other', emoji: '📦' },
    owner: { id: 'o', full_name: 'A B', trust_level: 0, profile_photo: null },
  } as unknown as MarketplaceListing;
}

function feed(overrides: Partial<MarketplaceFeedState> = {}): MarketplaceFeedState {
  return {
    featured: [],
    recent: [],
    trending: [],
    sponsored: [],
    grid: [],
    loading: false,
    error: null,
    loadingMore: false,
    loadMoreError: null,
    hasMore: false,
    reload: vi.fn(),
    loadMore: vi.fn(),
    retryLoadMore: vi.fn(),
    ...overrides,
  };
}

function renderBrowse(
  props: Partial<React.ComponentProps<typeof MarketplaceBrowse>> = {}
) {
  return render(
    <MarketplaceBrowse
      metroId="metro-1"
      query={parseMarketplaceQuery({})}
      title="Marketplace"
      onFilterChange={vi.fn()}
      {...props}
    />
  );
}

describe('MarketplaceBrowse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCachedCategories.mockReturnValue([
      { id: 'c1', name: 'Food & Restaurants', slug: 'food-restaurants', emoji: '🍜' },
    ]);
    mocks.useMarketplaceFeed.mockReturnValue(feed());
  });

  it('titles the page with an h1', () => {
    renderBrowse({ title: 'Marketplace' });
    expect(screen.getByRole('heading', { level: 1, name: 'Marketplace' })).toBeDefined();
  });

  it('shows the listings it was given', () => {
    mocks.useMarketplaceFeed.mockReturnValue(feed({ grid: [listing('g1', 'Himalayan Kitchen')] }));
    renderBrowse();
    expect(screen.getByRole('heading', { name: 'Himalayan Kitchen' })).toBeDefined();
  });

  // recon 1: a failure used to render as "No listings match your filters".
  it('shows a failure as an error with a retry, not as an empty list', () => {
    const reload = vi.fn();
    mocks.useMarketplaceFeed.mockReturnValue(feed({ error: 'network down', reload }));

    renderBrowse();

    expect(screen.getByText('network down')).toBeDefined();
    expect(screen.queryByText(/No listings/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalled();
  });

  it('shows the empty state when the load succeeded with nothing in it', () => {
    renderBrowse();
    expect(screen.getByText(/No listings/i)).toBeDefined();
  });

  // getListingsByMetro derives hasMore from the raw window, before it drops
  // rows of another category, so a full window can arrive filtered to nothing.
  // Calling that empty would strand a category that does have listings.
  it('keeps paging when a window filtered down to nothing but more remain', () => {
    const loadMore = vi.fn();
    mocks.useMarketplaceFeed.mockReturnValue(feed({ grid: [], hasMore: true, loadMore }));

    renderBrowse({ query: parseMarketplaceQuery({ category: 'food-restaurants' }) });

    expect(screen.queryByText(/No listings/i)).toBeNull();
  });

  it('still says a category is empty once there is nothing more to fetch', () => {
    mocks.useMarketplaceFeed.mockReturnValue(feed({ grid: [], hasMore: false }));

    renderBrowse({ query: parseMarketplaceQuery({ category: 'food-restaurants' }) });

    expect(screen.getByText('No listings in this category yet')).toBeDefined();
  });

  it('does not call a still-loading page empty', () => {
    mocks.useMarketplaceFeed.mockReturnValue(feed({ grid: [], loadingMore: true }));

    renderBrowse();

    expect(screen.queryByText(/No listings/i)).toBeNull();
  });

  it('reports a failed page with its own retry', () => {
    const retryLoadMore = vi.fn();
    mocks.useMarketplaceFeed.mockReturnValue(
      feed({ grid: [listing('g1')], loadMoreError: 'page 2 failed', retryLoadMore })
    );

    renderBrowse();

    expect(screen.getByText('page 2 failed')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retryLoadMore).toHaveBeenCalled();
  });

  it('names the grid section after the active category', () => {
    renderBrowse({ query: parseMarketplaceQuery({ category: 'food-restaurants' }) });
    expect(
      screen.getByRole('region', { name: 'Food & Restaurants' })
    ).toBeDefined();
  });

  it('names the grid section "All Listings" when nothing narrows it', () => {
    renderBrowse();
    expect(screen.getByRole('region', { name: 'All Listings' })).toBeDefined();
  });

  it('names the grid section after the search term', () => {
    renderBrowse({ query: parseMarketplaceQuery({ q: 'momo' }) });
    expect(screen.getByRole('region', { name: 'Search: momo' })).toBeDefined();
  });

  it('lets the caller override the grid section name', () => {
    renderBrowse({
      query: parseMarketplaceQuery({ category: 'food-restaurants' }),
      gridHeading: 'All Listings',
    });
    expect(screen.getByRole('region', { name: 'All Listings' })).toBeDefined();
  });

  it('shows the discovery strips only when nothing narrows the view', () => {
    mocks.useMarketplaceFeed.mockReturnValue(
      feed({ trending: [listing('t1')], recent: [listing('r1')] })
    );
    const { unmount } = renderBrowse();
    expect(screen.getByRole('region', { name: /Trending/ })).toBeDefined();
    unmount();

    renderBrowse({ query: parseMarketplaceQuery({ q: 'momo' }) });
    expect(screen.queryByRole('region', { name: /Trending/ })).toBeNull();
  });

  it('names the sponsored strip and shows what it was given', () => {
    mocks.useMarketplaceFeed.mockReturnValue(
      feed({ sponsored: [listing('s1', 'Boosted Kitchen')] })
    );
    renderBrowse();

    const strip = screen.getByRole('region', { name: /Sponsored/ });
    expect(strip).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Boosted Kitchen' })).toBeDefined();
  });

  it('hides the sponsored strip once the view is narrowed', () => {
    mocks.useMarketplaceFeed.mockReturnValue(
      feed({ sponsored: [listing('s1', 'Boosted Kitchen')] })
    );
    renderBrowse({ query: parseMarketplaceQuery({ q: 'momo' }) });

    expect(screen.queryByRole('region', { name: /Sponsored/ })).toBeNull();
  });

  it('puts the listings in a list', () => {
    mocks.useMarketplaceFeed.mockReturnValue(feed({ grid: [listing('g1'), listing('g2')] }));
    renderBrowse();
    const grid = screen.getByRole('region', { name: 'All Listings' });
    expect(grid.querySelectorAll('li')).toHaveLength(2);
  });

  it('never nests a button inside a link', () => {
    mocks.useMarketplaceFeed.mockReturnValue(feed({ grid: [listing('g1')] }));
    const { container } = renderBrowse({
      actions: <a href="/marketplace/create">Create Listing</a>,
    });
    expect(container.querySelector('a button')).toBeNull();
    expect(container.querySelector('button a')).toBeNull();
  });

  it('renders a back link when given one', () => {
    renderBrowse({ backHref: '/marketplace', backLabel: 'Back to Marketplace' });
    expect(
      screen.getByRole('link', { name: 'Back to Marketplace' }).getAttribute('href')
    ).toBe('/marketplace');
  });

  it('shows a busy loading state before the first results land', () => {
    mocks.useMarketplaceFeed.mockReturnValue(feed({ loading: true }));
    renderBrowse();

    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Loading listings…')).toBeDefined();
    expect(screen.queryByText(/No listings/i)).toBeNull();
  });
});
