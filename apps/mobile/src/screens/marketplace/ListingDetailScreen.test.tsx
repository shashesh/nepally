import React from 'react';
import { render, act } from '@testing-library/react-native';
import {
  getListingById,
  getUserSavedListingIds,
  incrementListingViews,
} from '@nepally/shared';
import ListingDetailScreen from './ListingDetailScreen';

jest.mock('react-native-safe-area-context', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children: unknown }) =>
      mockReact.createElement(mockView, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, getParent: mockGetParent }),
  useRoute: () => ({ params: { listingId: 'listing-1' } }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({ supabase: {} }));

const MOCK_CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  icon: 'restaurant',
  color: '#FF6B35',
  description: 'Nepali restaurants',
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

jest.mock('@nepally/shared', () => ({
  getListingById: jest.fn(async () => ({ data: null })),
  saveListing: jest.fn(async () => ({ error: null })),
  unsaveListing: jest.fn(async () => ({ error: null })),
  getUserSavedListingIds: jest.fn(async () => ({ data: [] })),
  incrementListingViews: jest.fn(async () => {}),
  incrementListingContacts: jest.fn(async () => {}),
  getOrCreateConversation: jest.fn(async () => ({ data: null })),
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
  ITEM_CONDITION_LABELS: { new: 'New', used: 'Used' },
  BUSINESS_HOURS_DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
}));

const mockGetListingById = getListingById as jest.MockedFunction<typeof getListingById>;
const mockGetUserSavedListingIds = getUserSavedListingIds as jest.MockedFunction<typeof getUserSavedListingIds>;

async function renderAndFlush() {
  const screen = render(<ListingDetailScreen />);
  await act(async () => {});
  await act(async () => {});
  return screen;
}

describe('ListingDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetListingById.mockResolvedValue({ data: MOCK_LISTING } as never);
    mockGetUserSavedListingIds.mockResolvedValue({ data: [] });
  });

  it('renders the listing title', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
  });

  it('renders the listing description', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Authentic Nepali food and drinks.')).toBeTruthy();
  });

  it('renders the listing price', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('$15-25')).toBeTruthy();
  });

  it('renders business details section for business listings', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Business Details')).toBeTruthy();
    expect(screen.getByText('Himalayan Kitchen LLC')).toBeTruthy();
    expect(screen.getByText('123 Main St')).toBeTruthy();
    expect(screen.getByText('555-1234')).toBeTruthy();
  });

  it('renders owner info', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Asha Kumar')).toBeTruthy();
    expect(screen.getByText('Posted by')).toBeTruthy();
  });

  it('renders stats', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('10 views')).toBeTruthy();
    expect(screen.getByText('3 saves')).toBeTruthy();
  });

  it('increments views on mount', async () => {
    await renderAndFlush();
    expect(incrementListingViews).toHaveBeenCalledWith(expect.anything(), 'listing-1');
  });

  it('shows "Listing not found" when listing is null', async () => {
    mockGetListingById.mockResolvedValue({ data: null } as never);
    const screen = await renderAndFlush();
    expect(screen.getByText('Listing not found')).toBeTruthy();
  });

  it('shows Contact button when user is not the owner', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Contact')).toBeTruthy();
  });

  it('shows Edit button when user is the owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = await renderAndFlush();
    expect(screen.getByText('Edit Listing')).toBeTruthy();
  });

  it('renders save and contact action bar for non-owner', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Contact')).toBeTruthy();
  });

  it('renders business hours', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('Hours')).toBeTruthy();
    expect(screen.getByText('Monday')).toBeTruthy();
    expect(screen.getByText('9:00 - 17:00')).toBeTruthy();
  });

  it('shows placeholder emoji when no photos and has category', async () => {
    const screen = await renderAndFlush();
    expect(screen.getByText('🍜')).toBeTruthy();
  });
});
