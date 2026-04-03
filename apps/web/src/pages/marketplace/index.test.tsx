import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCategories, getListingsByMetro } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

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
  getCategories: vi.fn(async () => ({ data: [MOCK_CATEGORY] })),
  getListingsByMetro: vi.fn(async () => ({ data: [MOCK_LISTING] })),
  MARKETPLACE_CATEGORIES: [
    { slug: 'food-restaurants', name: 'Food & Restaurants', emoji: '🍜', icon: 'restaurant', color: '#FF6B35' },
    { slug: 'professional-services', name: 'Professional Services', emoji: '💼', icon: 'briefcase', color: '#2196F3' },
  ],
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
}));

// Must import AFTER vi.mock
import MarketplacePage from './index.page';

describe('MarketplacePage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ replace: mockReplace, push: mockPush });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(MarketplacePage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('renders marketplace title', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplacePage));
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeDefined();
    });
  });

  it('shows category grid', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplacePage));
    await waitFor(() => {
      expect(screen.getByText('Food & Restaurants')).toBeDefined();
    });
  });

  it('shows recent listings', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplacePage));
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeDefined();
    });
  });

  it('shows Create Listing button for Level 1 user', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplacePage));
    await waitFor(() => {
      expect(screen.getByText('Create Listing')).toBeDefined();
    });
  });

  it('shows search input', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(MarketplacePage));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeDefined();
    });
  });
});
