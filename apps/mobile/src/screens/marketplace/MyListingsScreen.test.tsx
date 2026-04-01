import React from 'react';
import { render, act } from '@testing-library/react-native';
import { getListingsByOwner } from '@nepally/shared';
import MyListingsScreen from './MyListingsScreen';

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
const mockAddListener = jest.fn(() => jest.fn());
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
  }),
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

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    owner_id: 'user-1',
    metro_area_id: 'metro-1',
    category_id: 'cat-1',
    listing_type: 'business' as const,
    status: 'active' as const,
    title: 'My Restaurant',
    description: 'A great restaurant.',
    photos: [],
    price: '$15',
    business_name: 'My Restaurant LLC',
    address: null,
    phone: null,
    email: null,
    website_url: null,
    item_condition: null,
    business_hours: null,
    is_global: false,
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

jest.mock('@nepally/shared', () => ({
  getListingsByOwner: jest.fn(async () => ({ data: [] })),
  deactivateListing: jest.fn(async () => ({ error: null })),
  reactivateListing: jest.fn(async () => ({ error: null })),
  deleteListing: jest.fn(async () => ({ error: null })),
  refreshListing: jest.fn(async () => ({ error: null })),
  LISTING_SOFT_EXPIRY_DAYS: 90,
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
}));

const mockGetListingsByOwner = getListingsByOwner as jest.MockedFunction<typeof getListingsByOwner>;

function setAuthUser(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1', ...overrides },
  });
}

async function renderAndSettle() {
  const utils = render(<MyListingsScreen />);
  await act(async () => {});
  await act(async () => {});
  return utils;
}

describe('MyListingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthUser();
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
  });

  it('renders "My Listings" header', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('My Listings')).toBeTruthy();
  });

  it('fetches listings for the current user', async () => {
    await renderAndSettle();
    expect(mockGetListingsByOwner).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('renders listing title', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('My Restaurant')).toBeTruthy();
  });

  it('renders status badge', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Active')).toBeTruthy();
  });

  it('renders stats for each listing', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('50 views')).toBeTruthy();
    expect(getByText('10 saves')).toBeTruthy();
    expect(getByText('5 contacts')).toBeTruthy();
  });

  it('shows empty state when no listings', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [] });
    const { getByText } = await renderAndSettle();
    expect(getByText("You haven't created any listings yet")).toBeTruthy();
  });

  it('shows "Create your first listing" button in empty state', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [] });
    const { getByText } = await renderAndSettle();
    expect(getByText('Create your first listing')).toBeTruthy();
  });

  it('renders action buttons for active listings', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('Refresh')).toBeTruthy();
    expect(getByText('Deactivate')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
  });

  it('shows Reactivate instead of Deactivate for inactive listings', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'inactive' })] });
    const { getByText, queryByText } = await renderAndSettle();
    expect(getByText('Reactivate')).toBeTruthy();
    expect(queryByText('Deactivate')).toBeNull();
  });

  it('renders inactive status badge', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'inactive' })] });
    const { getByText } = await renderAndSettle();
    expect(getByText('Inactive')).toBeTruthy();
  });

  it('renders header with My Listings and back area', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('My Listings')).toBeTruthy();
  });

  it('registers focus listener for re-fetching', async () => {
    await renderAndSettle();
    expect(mockAddListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });
});
