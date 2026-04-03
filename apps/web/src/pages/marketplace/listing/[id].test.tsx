import React from 'react';
import { render, screen, waitFor } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getListingById, getUserSavedListingIds, incrementListingViews } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type MockImageProps = { src: string; alt: string };
type MockButtonProps = { children?: React.ReactNode; variant?: string; onClick?: () => void; loading?: boolean };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('../../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
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
    Button: ({ children, onClick, variant, loading }: MockButtonProps) =>
      React.createElement('button', { onClick, disabled: loading }, children),
  };
});
vi.mock('../../../lib/supabase', () => ({ supabase: {} }));

const MOCK_CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  color: '#FF6B35',
  sort_order: 1,
  created_at: new Date().toISOString(),
};

const MOCK_LISTING = {
  id: 'listing-1',
  owner_id: 'user-2',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'business' as const,
  status: 'active' as const,
  title: 'Himalayan Kitchen',
  description: 'Authentic Nepali food and drinks.',
  photos: [],
  price: '$15-25',
  business_name: 'Himalayan Kitchen LLC',
  address: '123 Main St',
  phone: '555-1234',
  email: 'info@himalayan.com',
  website_url: 'https://himalayan.com',
  item_condition: null,
  business_hours: { monday: { open: '9:00', close: '17:00' } },
  is_global: false,
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
  getListingById: vi.fn(async () => ({ data: null })),
  saveListing: vi.fn(async () => ({ error: null })),
  unsaveListing: vi.fn(async () => ({ error: null })),
  getUserSavedListingIds: vi.fn(async () => ({ data: [] })),
  incrementListingViews: vi.fn(async () => {}),
  incrementListingContacts: vi.fn(async () => {}),
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
  ITEM_CONDITION_LABELS: { new: 'New', used: 'Used' },
  BUSINESS_HOURS_DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
}));

import ListingDetailPage from './[id].page';

const mockGetListingById = getListingById as ReturnType<typeof vi.fn>;
const mockGetUserSavedListingIds = getUserSavedListingIds as ReturnType<typeof vi.fn>;

describe('ListingDetailPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: { id: 'listing-1' },
      isReady: true,
    });
    mockGetListingById.mockResolvedValue({ data: MOCK_LISTING });
    mockGetUserSavedListingIds.mockResolvedValue({ data: [] });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('renders listing title', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeDefined();
    });
  });

  it('renders listing description', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Authentic Nepali food and drinks.')).toBeDefined();
    });
  });

  it('renders listing price', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('$15-25')).toBeDefined();
    });
  });

  it('renders business details', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Business Details')).toBeDefined();
      expect(screen.getByText('Himalayan Kitchen LLC')).toBeDefined();
      expect(screen.getByText('123 Main St')).toBeDefined();
    });
  });

  it('renders owner info', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Asha Kumar')).toBeDefined();
      expect(screen.getByText('Posted by')).toBeDefined();
    });
  });

  it('renders stats', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('10 views')).toBeDefined();
      expect(screen.getByText('3 saves')).toBeDefined();
    });
  });

  it('increments views on mount', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(incrementListingViews).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
  });

  it('shows "Listing not found" when listing is null', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingById.mockResolvedValue({ data: null });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Listing not found.')).toBeDefined();
    });
  });

  it('shows Contact and Save buttons when not owner', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeDefined();
      expect(screen.getByText('Save')).toBeDefined();
    });
  });

  it('shows Edit button when user is the owner', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'user-2', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeDefined();
    });
  });

  it('shows back link to marketplace', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText(/Back to Marketplace/)).toBeDefined();
    });
  });

  it('renders business hours', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Hours:')).toBeDefined();
      expect(screen.getByText('Monday')).toBeDefined();
      expect(screen.getByText('9:00 - 17:00')).toBeDefined();
    });
  });
});
