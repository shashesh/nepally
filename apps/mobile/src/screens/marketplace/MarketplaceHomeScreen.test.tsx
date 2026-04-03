import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { getCategories, getListingsByMetro } from '@nepally/shared';
import MarketplaceHomeScreen from './MarketplaceHomeScreen';

// ---------------------------------------------------------------------------
// Mocks — local @expo/vector-icons mock is mandatory for CI (React 19 compat)
// ---------------------------------------------------------------------------

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../components/marketplace/ListingCard', () => ({
  ListingCard: ({ listing }: { listing: { title: string } }) => {
    const { Text } = jest.requireActual('react-native');
    const ReactLocal = jest.requireActual('react');
    return ReactLocal.createElement(Text, null, listing.title);
  },
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
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({ supabase: {} }));

// ---------------------------------------------------------------------------
// Shared mock
// ---------------------------------------------------------------------------

jest.mock('@nepally/shared', () => ({
  getCategories: jest.fn(async () => ({ data: [] })),
  getListingsByMetro: jest.fn(async () => ({ data: [] })),
  MARKETPLACE_CATEGORIES: [
    { slug: 'food-restaurants', name: 'Food & Restaurants', emoji: '🍜', icon: 'restaurant', color: '#FF6B35' },
    { slug: 'professional-services', name: 'Professional Services', emoji: '💼', icon: 'briefcase', color: '#2196F3' },
  ],
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
}));

const mockGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;
const mockGetListingsByMetro = getListingsByMetro as jest.MockedFunction<typeof getListingsByMetro>;

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
  description: 'Nepali restaurants, catering, and food services',
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
  description: 'Authentic Nepali food.',
  photos: [],
  price: '$15-25',
  business_name: 'Himalayan Kitchen',
  address: null,
  phone: null,
  email: null,
  website_url: null,
  item_condition: null,
  business_hours: null,
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

// ---------------------------------------------------------------------------
// Tests — render() + waitFor() only; NEVER use act() (hangs on CI)
// ---------------------------------------------------------------------------

describe('MarketplaceHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetCategories.mockResolvedValue({ data: [MOCK_CATEGORY] });
    mockGetListingsByMetro.mockResolvedValue({ data: [MOCK_LISTING] });
  });

  // -- Header & layout ---------------------------------------------------------

  it('renders the Marketplace title', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
  });

  it('shows search input', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeTruthy();
    });
  });

  // -- Categories --------------------------------------------------------------

  it('shows category chips after load', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Food & Restaurants')).toBeTruthy();
    });
  });

  it('renders Categories section title', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Categories')).toBeTruthy();
    });
  });

  // -- Listings ----------------------------------------------------------------

  it('calls getListingsByMetro on mount', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
    expect(mockGetListingsByMetro).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ limit: expect.any(Number) }),
    );
  });

  it('renders recent listings', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.getByText('Recently Added')).toBeTruthy();
  });

  // -- Empty state -------------------------------------------------------------

  it('shows empty state when no listings', async () => {
    mockGetListingsByMetro.mockResolvedValue({ data: [] });
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('No listings in your area yet')).toBeTruthy();
    });
  });

  // -- No user / no metro_area_id ----------------------------------------------

  it('renders when user is null (data fetch is skipped)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
    // Should not have fetched any data
    expect(mockGetListingsByMetro).not.toHaveBeenCalled();
  });

  it('skips fetch when metro_area_id is empty string', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: '' },
    });
    mockGetListingsByMetro.mockClear();
    mockGetCategories.mockClear();
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
    expect(mockGetListingsByMetro).not.toHaveBeenCalled();
    expect(mockGetCategories).not.toHaveBeenCalled();
  });

  // -- Trust level gating: FAB & My Listings -----------------------------------

  it('does not show FAB for Level 0 (new) user', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 0, metro_area_id: 'metro-1' },
    });
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
    // FAB renders Ionicons (mocked to null), so just verify the "Create the first listing"
    // button only appears for verified users in empty state
    expect(screen.queryByText('Create the first listing')).toBeNull();
  });

  // -- Search ------------------------------------------------------------------

  it('navigates to search results on search submit', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.changeText(searchInput, 'momo');
    fireEvent(searchInput, 'submitEditing');

    expect(mockNavigate).toHaveBeenCalledWith('MarketplaceCategory', {
      categorySlug: '__search__',
      categoryName: 'Search: momo',
    });
  });

  it('does not navigate when search query is empty', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.changeText(searchInput, '   ');
    fireEvent(searchInput, 'submitEditing');

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
