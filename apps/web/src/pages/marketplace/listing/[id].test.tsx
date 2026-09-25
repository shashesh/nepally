import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getListingById,
  getOrCreateConversation,
  getUserSavedListingIds,
  incrementListingContacts,
  incrementListingViews,
} from '@nepally/shared';

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
// Real Mantine: the page's buttons are exercised as rendered.
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

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<typeof import('@nepally/shared')>('@nepally/shared');
  return {
    ...actual,
    getListingById: vi.fn(async () => ({ data: null })),
    saveListing: vi.fn(async () => ({ error: null })),
    unsaveListing: vi.fn(async () => ({ error: null })),
    getUserSavedListingIds: vi.fn(async () => ({ data: [] })),
    incrementListingViews: vi.fn(async () => {}),
    incrementListingContacts: vi.fn(async () => {}),
    getOrCreateConversation: vi.fn(async () => ({ data: { conversationId: 'conv-1' } })),
    LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
    ITEM_CONDITION_LABELS: { new: 'New', used: 'Used' },
    BUSINESS_HOURS_DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    getListingHighlights: vi.fn(() => [
      { key: 'phone', icon: '📞', label: 'Phone', value: '555-1234' },
    ]),
    isBusinessOpenNow: vi.fn(() => ({ isOpen: true, nextChangeLabel: 'Closes 5p' })),
    getDaysSinceRefresh: actual.getDaysSinceRefresh,
  };
});

import ListingDetailPage from './[id].page';

const mockGetListingById = getListingById as ReturnType<typeof vi.fn>;
const mockGetUserSavedListingIds = getUserSavedListingIds as ReturnType<typeof vi.fn>;
const DAY_MS = 24 * 60 * 60 * 1000;

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

  // Before the router parses the URL there is no id, and the page must not
  // decide the listing is missing on that basis.
  it('waits for the router before saying the listing is not found', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mocks.useRouter.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      query: {},
      isReady: false,
    });

    render(React.createElement(ListingDetailPage));

    expect(screen.queryByText('Listing not found')).toBeNull();
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    expect(mockGetListingById).not.toHaveBeenCalled();
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
      expect(screen.getAllByText('Himalayan Kitchen').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders listing description', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Authentic Nepali food and drinks.')).toBeDefined();
    });
  });

  it('renders listing price once, in the actions panel', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    const actions = await screen.findByRole('complementary', { name: 'Listing actions' });
    expect(within(actions).getByText('$15-25')).toBeDefined();
    expect(screen.getAllByText('$15-25')).toHaveLength(1);
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

  it('says a missing listing is not found, and offers a way back', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingById.mockResolvedValue({ error: new Error('Listing not found'), notFound: true });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Listing not found' })).toBeDefined();
    });
    expect(
      screen.getByRole('link', { name: 'Back to Marketplace' }).getAttribute('href')
    ).toBe('/marketplace');
  });

  // recon 6: a failed read used to render as "Listing not found."
  it('shows a failed read as an error with a retry, not as not-found', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingById.mockResolvedValue({ error: new Error('new row violates row-level security policy') });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText("Couldn't load this listing")).toBeDefined();
      expect(screen.queryByText(/row-level security/)).toBeNull();
    });
    expect(screen.queryByText('Listing not found')).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });

  it('renders the actions once, in one Listing actions panel, for a non-owner', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    const actions = await screen.findByRole('complementary', { name: 'Listing actions' });

    expect(screen.getAllByRole('complementary', { name: 'Listing actions' })).toHaveLength(1);
    expect(within(actions).getByRole('button', { name: 'Contact Seller' })).toBeDefined();
    expect(within(actions).getByRole('button', { name: 'Save listing' })).toBeDefined();
    expect(screen.getAllByRole('button', { name: 'Contact Seller' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Save listing' })).toHaveLength(1);
  });

  // The button used to push /messages?to=<owner>, which nothing read, so the
  // member landed on their inbox with no conversation.
  it('Contact Seller opens a conversation with the seller', async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: 'u1', full_name: 'Bikal Shrestha', trust_level: 1, metro_area_id: 'metro-1' },
    });
    render(React.createElement(ListingDetailPage));
    const contact = await screen.findByRole('button', { name: 'Contact Seller' });

    fireEvent.click(contact);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/messages/conv-1'));
    expect(incrementListingContacts).toHaveBeenCalledWith({}, 'listing-1');
    expect(getOrCreateConversation).toHaveBeenCalledWith({}, 'u1', 'Bikal Shrestha', 'user-2', 'Asha Kumar');
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('?to='));
  });

  it('counts one contact for a double press, and shows Contact Seller busy meanwhile', async () => {
    mocks.useAuth.mockReturnValue({
      user: { id: 'u1', full_name: 'Bikal Shrestha', trust_level: 1, metro_area_id: 'metro-1' },
    });
    let finishCount!: (value: { error?: Error }) => void;
    vi.mocked(incrementListingContacts).mockReturnValueOnce(
      new Promise<{ error?: Error }>((resolve) => {
        finishCount = resolve;
      })
    );
    render(React.createElement(ListingDetailPage));
    const contact = await screen.findByRole('button', { name: 'Contact Seller' });

    fireEvent.click(contact);
    fireEvent.click(contact);

    const busy = await screen.findByRole('button', { name: 'Contact Seller' });
    expect(busy.getAttribute('aria-disabled')).toBe('true');
    expect(incrementListingContacts).toHaveBeenCalledTimes(1);

    finishCount({});
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/messages/conv-1'));
    expect(getOrCreateConversation).toHaveBeenCalledTimes(1);
  });

  it('shows one Edit Listing link when user is the owner', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'user-2', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    const edit = await screen.findByRole('link', { name: 'Edit Listing' });
    expect(edit.getAttribute('href')).toBe('/marketplace/create?edit=listing-1');
  });

  it('renders business hours', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Hours')).toBeDefined();
      expect(screen.getByText('Monday')).toBeDefined();
      expect(screen.getByText('9:00 - 17:00')).toBeDefined();
    });
  });

  it('renders breadcrumb links to the marketplace and the category', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Marketplace' }).getAttribute('href')
      ).toBe('/marketplace');
    });
    expect(
      screen.getByRole('link', { name: 'Food & Restaurants' }).getAttribute('href')
    ).toBe('/marketplace/food-restaurants');
  });

  it('marks the current crumb and keeps the separators out of the reading order', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' });

    const current = within(nav).getByText(MOCK_LISTING.title);
    expect(current.getAttribute('aria-current')).toBe('page');
    const separators = within(nav).getAllByText('›');
    expect(separators.length).toBeGreaterThan(0);
    for (const separator of separators) {
      expect(separator.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('descends from h1 to h2 with no skipped level', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeDefined());

    const levels = screen
      .getAllByRole('heading')
      .map((h) => Number(h.tagName.slice(1)))
      .filter((n) => Number.isFinite(n));
    expect(levels[0]).toBe(1);
    expect(levels.every((n) => n <= 2)).toBe(true);
  });

  it('never nests a button inside a link', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    const { container } = render(React.createElement(ListingDetailPage));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeDefined());

    expect(container.querySelector('a button')).toBeNull();
    expect(container.querySelector('button a')).toBeNull();
  });

  it('announces which photo is on screen', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, photos: ['a.jpg', 'b.jpg', 'c.jpg'] },
    });
    render(React.createElement(ListingDetailPage));

    await waitFor(() => expect(screen.getByText(/Photo 1 of 3/i)).toBeDefined());
    expect(screen.getByRole('button', { name: /next photo/i })).toBeDefined();
  });

  it('renders highlights strip with phone chip for business listing', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getAllByText('555-1234').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Refreshed today" for a listing refreshed moments ago', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Refreshed today')).toBeDefined();
    });
  });

  it('shows whole days since the listing was refreshed', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: 'metro-1' } });
    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, refreshed_at: new Date(Date.now() - 3 * DAY_MS).toISOString() },
    });
    render(React.createElement(ListingDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Refreshed 3d ago')).toBeDefined();
    });
  });

  it('renders Edit and Promote once, in the Listing actions panel, for the owner', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'user-2', trust_level: 1, metro_area_id: 'metro-1' } });
    render(React.createElement(ListingDetailPage));
    const actions = await screen.findByRole('complementary', { name: 'Listing actions' });

    expect(within(actions).getByRole('link', { name: 'Edit Listing' })).toBeDefined();
    expect(within(actions).getByRole('link', { name: 'Promote' })).toBeDefined();
    expect(screen.getAllByRole('link', { name: 'Edit Listing' })).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: 'Promote' })).toHaveLength(1);
  });
});
