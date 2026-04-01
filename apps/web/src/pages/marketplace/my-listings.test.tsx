import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getListingsByOwner } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type MockButtonProps = { children?: React.ReactNode; size?: string; onClick?: () => void };
type MockImageProps = { src: string; alt: string };

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
  default: ({ src, alt }: MockImageProps) => React.createElement('img', { src, alt }),
}));
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Button: ({ children, ...rest }: MockButtonProps) =>
      React.createElement('button', rest, children),
  };
});
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

const MOCK_CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  color: '#FF6B35',
  sort_order: 1,
  created_at: new Date().toISOString(),
};

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    owner_id: 'user-1',
    metro_area_id: 'metro-1',
    category_id: 'cat-1',
    listing_type: 'business',
    status: 'active',
    title: 'My Restaurant',
    description: 'A great restaurant.',
    photos: [],
    price: '$15',
    business_name: 'My Restaurant LLC',
    views_count: 50,
    saves_count: 10,
    contacts_count: 5,
    refreshed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: MOCK_CATEGORY,
    owner: { id: 'user-1', full_name: 'Test User', trust_level: 1, profile_photo: null },
    ...overrides,
  };
}

vi.mock('@nepally/shared', () => ({
  getListingsByOwner: vi.fn(async () => ({ data: [] })),
  deactivateListing: vi.fn(async () => ({ error: null })),
  reactivateListing: vi.fn(async () => ({ error: null })),
  deleteListing: vi.fn(async () => ({ error: null })),
  refreshListing: vi.fn(async () => ({ error: null })),
  LISTING_SOFT_EXPIRY_DAYS: 90,
}));

import MyListingsPage from './my-listings.page';

const mockGetListingsByOwner = getListingsByOwner as ReturnType<typeof vi.fn>;

describe('MyListingsPage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ replace: mockReplace, query: {} });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(MyListingsPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('renders "My Listings" title', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText('My Listings')).toBeDefined();
    });
  });

  it('renders Create Listing link', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText('Create Listing')).toBeDefined();
    });
  });

  it('renders listing title', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText('My Restaurant')).toBeDefined();
    });
  });

  it('renders status badge capitalized', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeDefined();
    });
  });

  it('renders stats', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText('50 views')).toBeDefined();
      expect(screen.getByText('10 saves')).toBeDefined();
      expect(screen.getByText('5 contacts')).toBeDefined();
    });
  });

  it('shows empty state when no listings', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText("You haven't created any listings yet")).toBeDefined();
    });
  });

  it('renders action buttons for active listing', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText(/Edit/)).toBeDefined();
      expect(screen.getByText(/Refresh/)).toBeDefined();
      expect(screen.getByText(/Deactivate/)).toBeDefined();
      expect(screen.getByText(/Delete/)).toBeDefined();
    });
  });

  it('shows Reactivate for inactive listings', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'inactive' })] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText(/Reactivate/)).toBeDefined();
    });
  });

  it('shows back link to marketplace', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [] });
    render(React.createElement(MyListingsPage));
    await waitFor(() => {
      expect(screen.getByText(/Back to Marketplace/)).toBeDefined();
    });
  });
});
