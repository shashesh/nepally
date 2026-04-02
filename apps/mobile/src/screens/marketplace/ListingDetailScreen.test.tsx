import React from 'react';
import { render, act } from '@testing-library/react-native';
import {
  getListingById,
  getUserSavedListingIds,
  incrementListingViews,
} from '@nepally/shared';
import ListingDetailScreen from './ListingDetailScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children: unknown }) =>
      mockReact.createElement(mockView, null, children),
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

function setAuthUser(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1', ...overrides },
  });
}

async function renderAndSettle() {
  const utils = render(<ListingDetailScreen />);
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
  return utils;
}

describe('ListingDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthUser();
    mockGetListingById.mockResolvedValue({ data: MOCK_LISTING } as never);
    mockGetUserSavedListingIds.mockResolvedValue({ data: [] });
  });

  it('renders the listing title', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Himalayan Kitchen')).toBeTruthy();
  });

  it('renders the listing description', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Authentic Nepali food and drinks.')).toBeTruthy();
  });

  it('renders the listing price', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('$15-25')).toBeTruthy();
  });

  it('renders business details section for business listings', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Business Details')).toBeTruthy();
    expect(getByText('Himalayan Kitchen LLC')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();
    expect(getByText('555-1234')).toBeTruthy();
  });

  it('renders owner info', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Asha Kumar')).toBeTruthy();
    expect(getByText('Posted by')).toBeTruthy();
  });

  it('renders stats', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('10 views')).toBeTruthy();
    expect(getByText('3 saves')).toBeTruthy();
  });

  it('increments views on mount', async () => {
    await renderAndSettle();
    expect(incrementListingViews).toHaveBeenCalledWith(expect.anything(), 'listing-1');
  });

  it('shows "Listing not found" when listing is null', async () => {
    mockGetListingById.mockResolvedValue({ data: null } as never);
    const { getByText } = await renderAndSettle();
    expect(getByText('Listing not found')).toBeTruthy();
  });

  it('shows Contact button when user is not the owner', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Contact')).toBeTruthy();
  });

  it('shows Edit button when user is the owner', async () => {
    setAuthUser({ id: 'user-2' }); // same as owner_id
    const { getByText } = await renderAndSettle();
    expect(getByText('Edit Listing')).toBeTruthy();
  });

  it('renders save and contact action bar for non-owner', async () => {
    const { getByText } = await renderAndSettle();
    // Non-owner sees Contact button in the action bar
    expect(getByText('Contact')).toBeTruthy();
  });

  it('renders business hours', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Hours')).toBeTruthy();
    expect(getByText('Monday')).toBeTruthy();
    expect(getByText('9:00 - 17:00')).toBeTruthy();
  });

  it('shows placeholder emoji when no photos and has category', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('🍜')).toBeTruthy();
  });
});
