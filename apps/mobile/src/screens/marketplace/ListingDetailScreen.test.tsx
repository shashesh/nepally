import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import {
  getListingById,
  getUserSavedListingIds,
  incrementListingViews,
} from '@nepally/shared';
import ListingDetailScreen from './ListingDetailScreen';

// ---------------------------------------------------------------------------
// Mocks — local @expo/vector-icons mock is mandatory for CI (React 19 compat)
// ---------------------------------------------------------------------------

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    getParent: mockGetParent,
  }),
  useRoute: () => ({ params: { listingId: 'listing-1' } }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({ supabase: {} }));

// ---------------------------------------------------------------------------
// Shared mock
// ---------------------------------------------------------------------------

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
  BUSINESS_HOURS_DAYS: [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ],
  getListingHighlights: jest.fn(() => [
    { key: 'phone', icon: '📞', label: 'Phone', value: '555-1234' },
  ]),
  isBusinessOpenNow: jest.fn(() => ({ isOpen: true, nextChangeLabel: 'Closes 5p' })),
  getDaysSinceRefresh: jest.requireActual('@nepally/shared').getDaysSinceRefresh,
}));

const mockGetListingById = getListingById as jest.MockedFunction<typeof getListingById>;
const mockGetUserSavedListingIds = getUserSavedListingIds as jest.MockedFunction<
  typeof getUserSavedListingIds
>;

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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
  owner: {
    id: 'user-2',
    full_name: 'Asha Kumar',
    trust_level: 1,
    profile_photo: null,
  },
};

// ---------------------------------------------------------------------------
// Tests — render() + waitFor() only; NEVER use act() (hangs on CI)
// ---------------------------------------------------------------------------

describe('ListingDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetListingById.mockResolvedValue({ data: MOCK_LISTING } as never);
    mockGetUserSavedListingIds.mockResolvedValue({ data: [] });
  });

  // -- Data fetching & display -----------------------------------------------

  it('renders listing title after load', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
  });

  it('renders listing description', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Authentic Nepali food and drinks.')).toBeTruthy();
    });
  });

  it('renders listing price', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('$15-25').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders business details for business listings', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Business Details')).toBeTruthy();
    });
    expect(screen.getByText('Himalayan Kitchen LLC')).toBeTruthy();
    expect(screen.getByText('123 Main St')).toBeTruthy();
    expect(screen.getByText('555-1234')).toBeTruthy();
  });

  it('renders owner info', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Asha Kumar')).toBeTruthy();
    });
    expect(screen.getByText('Posted by')).toBeTruthy();
  });

  it('renders stats', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('10 views')).toBeTruthy();
    });
    expect(screen.getByText('3 saves')).toBeTruthy();
  });

  it('renders business hours', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Hours')).toBeTruthy();
    });
    expect(screen.getByText('Monday')).toBeTruthy();
    expect(screen.getByText('9:00 - 17:00')).toBeTruthy();
  });

  it('renders category placeholder emoji when no photos', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('🍜')).toBeTruthy();
    });
  });

  // -- View count ------------------------------------------------------------

  it('increments views on mount', async () => {
    render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(incrementListingViews).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
  });

  // -- Not found -------------------------------------------------------------

  it('shows "Listing not found" when listing is null', async () => {
    mockGetListingById.mockResolvedValue({ data: null } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Listing not found')).toBeTruthy();
    });
  });

  // -- Owner vs non-owner actions --------------------------------------------

  it('shows Contact button when user is not the owner', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeTruthy();
    });
  });

  it('shows Edit Listing button when user is the owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeTruthy();
    });
  });

  it('does not show Edit button for non-owner', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeTruthy();
    });
    expect(screen.queryByText('Edit Listing')).toBeNull();
  });

  // -- Saved state -----------------------------------------------------------

  it('marks listing as saved when it appears in saved ids', async () => {
    mockGetUserSavedListingIds.mockResolvedValue({ data: ['listing-1'] });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.getByText('Contact Seller')).toBeTruthy();
  });

  // -- Report ----------------------------------------------------------------

  it('does not fire report alert on initial render', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  // -- No user ---------------------------------------------------------------

  it('renders without crashing when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
  });

  // -- Individual listing type -----------------------------------------------

  it('does not render business details for individual listings', async () => {
    mockGetListingById.mockResolvedValue({
      data: {
        ...MOCK_LISTING,
        listing_type: 'individual' as const,
        business_hours: null,
        business_name: null,
      },
    } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.queryByText('Business Details')).toBeNull();
  });

  // -- Split View enhancement (2026-04-13) -----------------------------------

  it('renders breadcrumb with category name', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
  });

  it('renders highlight chip value', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('555-1234').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Refreshed today" for a listing refreshed moments ago', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refreshed today')).toBeTruthy();
    });
  });

  it('shows whole days since the listing was refreshed', async () => {
    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, refreshed_at: new Date(Date.now() - 3 * DAY_MS).toISOString() },
    } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refreshed 3d ago')).toBeTruthy();
    });
  });

  it('renders sticky bottom bar with Contact Seller for non-owner', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeTruthy();
    });
  });

  it('hides sticky bottom bar for owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.queryByText('Contact Seller')).toBeNull();
  });
});
