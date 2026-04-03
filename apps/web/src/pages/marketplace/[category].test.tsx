import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getListingsByMetro } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type MockSkeletonProps = { height?: number; radius?: string };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
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
      React.createElement('div', { 'data-testid': 'skeleton', style: { height } }),
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
  views_count: 10,
  saves_count: 3,
  contacts_count: 1,
  refreshed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: MOCK_CATEGORY,
  owner: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
};

vi.mock('@nepally/shared', () => ({
  getListingsByMetro: vi.fn(async () => ({ data: [MOCK_LISTING] })),
  MARKETPLACE_CATEGORIES: [
    { slug: 'food-restaurants', name: 'Food & Restaurants', emoji: '🍜', icon: 'restaurant', color: '#FF6B35' },
    { slug: 'professional-services', name: 'Professional Services', emoji: '💼', icon: 'briefcase', color: '#2196F3' },
  ],
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
}));

import MarketplaceCategoryPage from './[category].page';

const mockGetListingsByMetro = getListingsByMetro as ReturnType<typeof vi.fn>;

describe('MarketplaceCategoryPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: { category: 'food-restaurants' },
      isReady: true,
    });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('renders category page title', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText(/Food & Restaurants/)).toBeDefined();
    });
  });

  it('renders listings', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeDefined();
    });
  });

  it('calls getListingsByMetro with category slug', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(mockGetListingsByMetro).toHaveBeenCalledWith(
        expect.anything(),
        'metro-1',
        expect.objectContaining({ categorySlug: 'food-restaurants' })
      );
    });
  });

  it('shows empty state when no listings', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByMetro.mockResolvedValue({ data: [] });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText('No listings in this category yet')).toBeDefined();
    });
  });

  it('shows search input', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search in Food & Restaurants/)).toBeDefined();
    });
  });

  it('shows back link to marketplace', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText(/Back to Marketplace/)).toBeDefined();
    });
  });

  it('handles search mode with slug "__search__" equivalent', async () => {
    mocks.useRouter.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: { category: 'search', q: 'momo' },
      isReady: true,
    });
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplaceCategoryPage));
    await waitFor(() => {
      expect(screen.getByText(/Search: momo/)).toBeDefined();
    });
  });
});
