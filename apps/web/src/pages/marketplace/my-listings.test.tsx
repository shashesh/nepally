import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getListingsByOwner, type MarketplaceListing } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

const NOW = new Date('2026-09-23T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useNow', () => ({ useNow: () => NOW }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getListingsByOwner: vi.fn(),
  deactivateListing: vi.fn(async () => ({})),
}));

/** jsdom has no IntersectionObserver, and the paging sentinel attaches one. */
class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver;

import MyListingsPage from './my-listings.page';

const mockGetListingsByOwner = getListingsByOwner as ReturnType<typeof vi.fn>;
const AUTHED_USER = { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' };

function makeListing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
  return {
    id: 'listing-1',
    owner_id: 'u1',
    status: 'active',
    title: 'My Restaurant',
    photos: [],
    price: '$15',
    views_count: 50,
    saves_count: 10,
    contacts_count: 5,
    refreshed_at: NOW.toISOString(),
    created_at: NOW.toISOString(),
    category: { id: 'cat-1', name: 'Food & Restaurants', slug: 'food-restaurants', emoji: '🍜' },
    ...overrides,
  } as unknown as MarketplaceListing;
}

describe('MyListingsPage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ replace: mockReplace, query: {} });
    mocks.useAuth.mockReturnValue({ user: AUTHED_USER });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()], hasMore: false });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(<MyListingsPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('titles the page, links back to the marketplace, and offers a new listing', async () => {
    render(<MyListingsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'My Listings' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Marketplace' }).getAttribute('href')).toBe('/marketplace');
    expect(screen.getByRole('link', { name: 'Create listing' }).getAttribute('href')).toBe('/marketplace/create');
    await screen.findByRole('link', { name: 'My Restaurant' });
  });

  it('shows a loading state until the listings arrive', async () => {
    render(<MyListingsPage />);

    expect(screen.getByText('Loading your listings…')).toBeDefined();
    await screen.findByRole('link', { name: 'My Restaurant' });
    expect(screen.queryByText('Loading your listings…')).toBeNull();
  });

  it('lists each listing with its link, status, counts and menu', async () => {
    render(<MyListingsPage />);

    const link = await screen.findByRole('link', { name: 'My Restaurant' });
    expect(link.getAttribute('href')).toBe('/marketplace/listing/listing-1');
    const row = link.closest('article') as HTMLElement;
    expect(within(row).getByText('Active')).toBeDefined();
    expect(within(row).getByText('50 views')).toBeDefined();
    expect(within(row).getByRole('button', { name: 'Actions for My Restaurant' })).toBeDefined();
  });

  it('says "1 day", not "1 days", when a listing is a day from soft expiry', async () => {
    mockGetListingsByOwner.mockResolvedValue({
      data: [makeListing({ refreshed_at: new Date(NOW.getTime() - 89 * DAY_MS).toISOString() })],
      hasMore: false,
    });
    render(<MyListingsPage />);

    expect(await screen.findByText('Expires in 1 day')).toBeDefined();
  });

  it('shows the empty state with a way to create a first listing', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [], hasMore: false });
    render(<MyListingsPage />);

    expect(await screen.findByRole('heading', { name: "You haven't listed anything yet" })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Create your first listing' }).getAttribute('href')).toBe(
      '/marketplace/create'
    );
  });

  it('shows a failed load with a retry that works', async () => {
    mockGetListingsByOwner.mockResolvedValueOnce({ error: new Error('network down') });
    render(<MyListingsPage />);

    expect(await screen.findByText('network down')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'My Restaurant' })).toBeDefined();
  });

  it('runs a row action from its menu and updates the row in place', async () => {
    render(<MyListingsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Actions for My Restaurant' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog', { name: 'Deactivate this listing?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    const row = screen.getByRole('link', { name: 'My Restaurant' }).closest('article') as HTMLElement;
    await waitFor(() => expect(within(row).getByText('Inactive')).toBeDefined());
    expect(mockGetListingsByOwner).toHaveBeenCalledTimes(1);
  });
});
