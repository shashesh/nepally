import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type MockSkeletonProps = { height?: number; radius?: string };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  getListingsByMetro: vi.fn(),
  getFeaturedListings: vi.fn(),
  useCachedCategories: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useCachedCategories', () => ({ useCachedCategories: mocks.useCachedCategories }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: MockHeadProps) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement('img', { src: props.src as string, alt: props.alt as string }),
}));
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Skeleton: ({ height }: MockSkeletonProps) =>
      React.createElement('div', { 'data-testid': 'skeleton', 'data-height': height }),
    Select: ({
      value,
      onChange,
      disabled,
      'aria-label': ariaLabel,
      data,
    }: {
      value: string;
      onChange: (v: string | null) => void;
      disabled?: boolean;
      'aria-label'?: string;
      data: { value: string; label: string }[];
    }) =>
      React.createElement(
        'select',
        {
          'aria-label': ariaLabel,
          value,
          disabled,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
        },
        data.map((opt) =>
          React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
        )
      ),
  };
});
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

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

vi.mock('@nepally/shared', () => ({
  getListingsByMetro: mocks.getListingsByMetro,
  getFeaturedListings: mocks.getFeaturedListings,
  MARKETPLACE_CATEGORIES: [
    { slug: 'food-restaurants', name: 'Food & Restaurants', emoji: '🍜', icon: 'restaurant', color: '#FF6B35' },
    { slug: 'professional-services', name: 'Professional Services', emoji: '💼', icon: 'briefcase', color: '#2196F3' },
  ],
}));

vi.mock('../../components/marketplace/ListingStrip', () => ({
  ListingStrip: ({ title, listings }: { title: string; listings: { id: string }[] }) =>
    React.createElement(
      'div',
      { 'data-testid': `strip-${title.toLowerCase()}` },
      `strip:${title}:${listings.length}`
    ),
}));

import MarketplaceCategoryPage from './[category].page';

const AUTHED_USER = { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' };

function buildRouter(query: Record<string, string> = { category: 'food-restaurants' }) {
  return {
    replace: vi.fn(),
    push: vi.fn(),
    query,
    pathname: '/marketplace/[category]',
    isReady: true,
  };
}

describe('MarketplaceCategoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getListingsByMetro.mockResolvedValue({ data: [MOCK_LISTING] });
    mocks.getFeaturedListings.mockResolvedValue({ data: [] });
    mocks.useCachedCategories.mockReturnValue([MOCK_CATEGORY]);
  });

  it('redirects to /login when not logged in', async () => {
    const router = buildRouter();
    mocks.useAuth.mockReturnValue({ user: null });
    mocks.useRouter.mockReturnValue(router);
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
  });

  it('renders category page title', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Food & Restaurants/ })).toBeDefined();
    });
  });

  it('renders listings', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeDefined();
    });
  });

  it('calls getListingsByMetro with category slug and default sort', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(mocks.getListingsByMetro).toHaveBeenCalledWith(
        expect.anything(),
        'metro-1',
        expect.objectContaining({ categorySlug: 'food-restaurants', sortBy: 'newest' })
      );
    });
  });

  it('shows empty state when no listings', async () => {
    mocks.getListingsByMetro.mockResolvedValue({ data: [] });
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText('No listings in this category yet')).toBeDefined();
    });
  });

  it('FilterBar has category pre-selected and locked', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => expect(screen.getByLabelText('Category')).toBeDefined());
    const select = screen.getByLabelText('Category') as HTMLSelectElement;
    expect(select.value).toBe('food-restaurants');
    expect(select.disabled).toBe(true);
  });

  it('shows back link to marketplace', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText(/Back to Marketplace/)).toBeDefined();
    });
  });

  it('handles search mode (slug=search)', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ category: 'search', q: 'momo' }));
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Search: momo/ })).toBeDefined();
    });
    // In search mode, category select is NOT locked
    const select = screen.getByLabelText('Category') as HTMLSelectElement;
    expect(select.disabled).toBe(false);
  });

  it('passes sort param from query to getListingsByMetro', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ category: 'food-restaurants', sort: 'price_asc' }));
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(mocks.getListingsByMetro).toHaveBeenCalledWith(
        expect.anything(),
        'metro-1',
        expect.objectContaining({ sortBy: 'price_asc' })
      );
    });
  });

  it('changing sort updates URL query', async () => {
    const router = buildRouter();
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(router);
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => expect(screen.getByLabelText('Sort')).toBeDefined());
    const sortSelect = screen.getByLabelText('Sort') as HTMLSelectElement;
    await act(async () => {
      fireEvent.change(sortSelect, { target: { value: 'price_asc' } });
    });
    expect(router.push).toHaveBeenCalledWith(
      { pathname: '/marketplace/[category]', query: { category: 'food-restaurants', sort: 'price_asc' } },
      undefined,
      { shallow: true }
    );
  });

  it('renders ListingStrip when getFeaturedListings returns listings', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    mocks.getFeaturedListings.mockResolvedValue({ data: [MOCK_LISTING] });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText('strip:Featured:1')).toBeDefined();
    });
    expect(mocks.getFeaturedListings).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ categorySlug: 'food-restaurants', limit: 10 })
    );
  });

  it('does not render featured strip in search mode', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter({ category: 'search', q: 'momo' }));
    mocks.getFeaturedListings.mockResolvedValue({ data: [MOCK_LISTING] });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Search: momo/ })).toBeDefined();
    });
    expect(screen.queryByText(/strip:Featured/)).toBeNull();
    expect(mocks.getFeaturedListings).not.toHaveBeenCalled();
  });

  it('does not render featured strip when getFeaturedListings returns empty', async () => {
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mocks.useRouter.mockReturnValue(buildRouter());
    mocks.getFeaturedListings.mockResolvedValue({ data: [] });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeDefined();
    });
    expect(screen.queryByText(/strip:Featured/)).toBeNull();
  });
});
