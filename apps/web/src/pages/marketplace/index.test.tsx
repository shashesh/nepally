import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string; 'aria-label'?: string };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  getListingsByMetro: vi.fn(),
  getFeaturedListings: vi.fn(),
  getTrendingListings: vi.fn(),
  getStickyBusinessListings: vi.fn(),
  useCachedCategories: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useCachedCategories', () => ({ useCachedCategories: mocks.useCachedCategories }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: MockHeadProps) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className, 'aria-label': ariaLabel }: MockLinkProps) =>
    React.createElement('a', { href, className, 'aria-label': ariaLabel }, children),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

// Real Mantine throughout: the page's controls are exercised as rendered.

const MOCK_CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  icon: 'restaurant',
  color: '#FF6B35',
  sort_order: 1,
  description: null,
  created_at: new Date().toISOString(),
};

const MOCK_LISTING = {
  id: 'listing-1',
  owner_id: 'user-2',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'business',
  status: 'active',
  title: 'Himalayan Kitchen',
  description: 'Authentic Nepali food.',
  photos: [],
  price: '$15-25',
  business_name: 'Himalayan Kitchen',
  address: null,
  phone: null,
  email: null,
  website_url: null,
  item_condition: null,
  business_hours: null,
  views_count: 10,
  saves_count: 3,
  contacts_count: 1,
  is_featured: false,
  trending_score: 24,
  is_global: false,
  refreshed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: MOCK_CATEGORY,
  owner: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
};

vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getListingsByMetro: mocks.getListingsByMetro,
  getFeaturedListings: mocks.getFeaturedListings,
  getTrendingListings: mocks.getTrendingListings,
  getStickyBusinessListings: mocks.getStickyBusinessListings,
}));

// Must import AFTER vi.mock
import MarketplaceIndexPage from './index.page';

const AUTHED_USER = { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' };

function buildRouter(query: Record<string, string> = {}) {
  return {
    query,
    replace: vi.fn(),
    push: vi.fn(),
    pathname: '/marketplace',
    isReady: true,
  };
}

describe('MarketplaceIndexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCachedCategories.mockReturnValue([MOCK_CATEGORY]);
    mocks.getListingsByMetro.mockResolvedValue({ data: [MOCK_LISTING] });
    mocks.getFeaturedListings.mockResolvedValue({
      data: [{ ...MOCK_LISTING, id: 'feat-1', title: 'Featured Listing', is_featured: true }],
    });
    mocks.getTrendingListings.mockResolvedValue({
      data: [{ ...MOCK_LISTING, id: 'trend-1', title: 'Trending Listing' }],
    });
    mocks.getStickyBusinessListings.mockResolvedValue({ data: [] });
  });

  it('redirects to /login when not logged in', async () => {
    const router = buildRouter();
    mocks.useAuth.mockReturnValue({ user: null });
    mocks.useRouter.mockReturnValue(router);
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });

  it('renders marketplace title', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeDefined();
    });
  });

  it('home state: renders 3 strips + All Listings grid', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Featured' })).toBeDefined();
      expect(screen.getByRole('region', { name: 'Recently Added' })).toBeDefined();
      expect(screen.getByRole('region', { name: 'Trending' })).toBeDefined();
      expect(screen.getByText('All Listings')).toBeDefined();
    });
  });

  it('home state: fetches featured/recent/trending/grid', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(mocks.getFeaturedListings).toHaveBeenCalled();
      expect(mocks.getTrendingListings).toHaveBeenCalled();
      expect(mocks.getListingsByMetro).toHaveBeenCalled();
    });
  });

  // decision 1: ?category= used to leave the heading reading "All Listings",
  // so a category reached that way looked like the whole marketplace.
  it('filtered state (category): names the category and hides the strips', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ category: 'food-restaurants' }));
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Food & Restaurants' })).toBeDefined();
    });
    expect(screen.queryByRole('region', { name: 'Recently Added' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Trending' })).toBeNull();
  });

  it('filtered state (sort!=newest): hides strips', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ sort: 'price_asc' }));
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => expect(screen.getByText('All Listings')).toBeDefined());
    expect(screen.queryByRole('region', { name: 'Recently Added' })).toBeNull();
  });

  it('view=featured: renders Featured Listings heading and calls getFeaturedListings', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ view: 'featured' }));
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByText('Featured Listings')).toBeDefined();
      expect(mocks.getFeaturedListings).toHaveBeenCalled();
    });
  });

  it('view=trending: renders Trending Listings heading and calls getTrendingListings', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ view: 'trending' }));
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByText('Trending Listings')).toBeDefined();
      expect(mocks.getTrendingListings).toHaveBeenCalled();
    });
  });

  it('FilterBar change pushes URL with updated query', async () => {
    const router = buildRouter();
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(router);
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => expect(screen.getByLabelText('Category')).toBeDefined());
    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    await act(async () => {
      fireEvent.change(categorySelect, { target: { value: 'food-restaurants' } });
    });
    expect(router.push).toHaveBeenCalledWith(
      { pathname: '/marketplace', query: { category: 'food-restaurants' } },
      undefined,
      { shallow: true }
    );
  });

  it('shows Create Listing button for Level 1 user', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByText('Create Listing')).toBeDefined();
    });
  });

  it('shows skeletons until the home sections have loaded', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceIndexPage));
    expect(screen.getAllByTestId('loading-row').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Trending' })).toBeDefined();
    });
    expect(screen.queryAllByTestId('loading-row')).toHaveLength(0);
  });

  it('shows skeletons again while a newly applied filter loads, then the filtered grid', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    const { rerender } = render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Trending' })).toBeDefined();
    });
    expect(screen.queryAllByTestId('loading-row')).toHaveLength(0);

    let resolveFiltered: (value: { data: (typeof MOCK_LISTING)[] }) => void = () => {};
    mocks.getListingsByMetro.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFiltered = resolve;
        })
    );
    mocks.useRouter.mockReturnValue(buildRouter({ category: 'food-restaurants' }));
    rerender(React.createElement(MarketplaceIndexPage));
    expect(screen.getAllByTestId('loading-row').length).toBeGreaterThan(0);

    await act(async () => {
      resolveFiltered({ data: [{ ...MOCK_LISTING, id: 'food-1', title: 'Filtered Momo' }] });
    });
    expect(screen.getByText('Filtered Momo')).toBeDefined();
    expect(screen.queryAllByTestId('loading-row')).toHaveLength(0);
  });

  it('an empty category says so, rather than blaming the filters', async () => {
    mocks.getListingsByMetro.mockResolvedValue({ data: [] });
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ category: 'food-restaurants' }));
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByText('No listings in this category yet')).toBeDefined();
    });
  });

  it('an empty search says so', async () => {
    mocks.getListingsByMetro.mockResolvedValue({ data: [] });
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ q: 'momo' }));
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByText('No listings match your search')).toBeDefined();
    });
  });

  // recon 1: a failed fetch used to be indistinguishable from an empty result.
  it('a failed load is an error with a retry, not an empty list', async () => {
    mocks.getListingsByMetro.mockResolvedValue({ error: new Error('new row violates row-level security policy') });
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ category: 'food-restaurants' }));
    render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => {
      expect(screen.getByText("Couldn't load listings")).toBeDefined();
      expect(screen.queryByText(/row-level security/)).toBeNull();
    });
    expect(screen.queryByText(/No listings/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });

  it('never nests a button inside a link in the header', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    const { container } = render(React.createElement(MarketplaceIndexPage));
    await waitFor(() => expect(screen.getByText('All Listings')).toBeDefined());

    expect(container.querySelector('a button')).toBeNull();
    expect(container.querySelector('button a')).toBeNull();
  });
});
