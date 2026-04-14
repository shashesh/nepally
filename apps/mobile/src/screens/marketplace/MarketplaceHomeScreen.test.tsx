import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import MarketplaceHomeScreen from './MarketplaceHomeScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../config/supabase', () => ({ supabase: {} }));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', metro_area_id: 'm1', trust_level: 1 } }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate, getParent: () => ({ navigate: mockNavigate }) }),
    useFocusEffect: (cb: () => void) => {
      // Simulate focus firing once on mount — must be wrapped in useEffect to avoid
      // calling setState during render.
      React.useEffect(cb, []);
    },
  };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Mock heavy child components — documented CI fix pattern (see apps/mobile/CLAUDE.md).
// React 19's act() flush loop doesn't converge when deep child trees have their own
// hooks/animations. Flat stubs keep the render tree shallow so waitFor can resolve.

jest.mock('../../components/marketplace/ListingGridCard', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    ListingGridCard: ({ listing }: { listing: { title: string } }) =>
      ReactLocal.createElement(Text, null, listing.title),
  };
});

jest.mock('../../components/marketplace/ListingGridCardSkeleton', () => ({
  ListingGridCardSkeleton: () => null,
}));

jest.mock('../../components/marketplace/MarketplaceSearchBar', () => ({
  MarketplaceSearchBar: () => null,
}));

jest.mock('../../components/marketplace/CategoryTileRow', () => ({
  CategoryTileRow: () => null,
}));

jest.mock('../../components/marketplace/MarketplaceTabs', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  return {
    MarketplaceTabs: () =>
      ReactLocal.createElement(
        View,
        null,
        ReactLocal.createElement(Text, null, 'Sponsored'),
        ReactLocal.createElement(Text, null, 'Featured'),
        ReactLocal.createElement(Text, null, 'Trending'),
        ReactLocal.createElement(Text, null, 'All Listings')
      ),
  };
});

jest.mock('../../components/marketplace/MarketplaceEmptyState', () => ({
  MarketplaceEmptyState: () => null,
}));

jest.mock('../../components/marketplace/MarketplaceMenuSheet', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
  type MockProps = {
    visible: boolean;
    onClose: () => void;
    onSelect: (key: string) => void;
  };
  const ROWS: { key: string; label: string }[] = [
    { key: 'my-listings', label: 'My Listings' },
    { key: 'saved', label: 'Saved' },
    { key: 'promote', label: 'Promote a Listing' },
    { key: 'browse-categories', label: 'Browse Categories' },
    { key: 'change-location', label: 'Change Location' },
    { key: 'rules', label: 'Marketplace Rules' },
  ];
  return {
    MarketplaceMenuSheet: ({ visible, onClose, onSelect }: MockProps) => {
      if (!visible) return null;
      return ReactLocal.createElement(
        View,
        null,
        ...ROWS.map((row) =>
          ReactLocal.createElement(
            TouchableOpacity,
            {
              key: row.key,
              onPress: () => {
                onSelect(row.key);
                onClose();
              },
            },
            ReactLocal.createElement(Text, null, row.label)
          )
        )
      );
    },
  };
});

const sampleListing = {
  id: 'l1',
  owner_id: 'o1',
  metro_area_id: 'm1',
  category_id: 'c1',
  listing_type: 'individual' as const,
  status: 'active' as const,
  title: 'Warm winter jacket',
  description: '',
  photos: [],
  price: '$30',
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: 'used' as const,
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 0,
  saves_count: 0,
  contacts_count: 0,
  trending_score: 0,
  refreshed_at: '2026-04-14T00:00:00Z',
  created_at: '2026-04-14T00:00:00Z',
  updated_at: '2026-04-14T00:00:00Z',
};

jest.mock('@nepally/shared', () => {
  const actual = jest.requireActual('@nepally/shared');
  return {
    ...actual,
    getCategories: jest.fn(async () => ({
      data: [
        { id: 'c1', name: 'Clothing', slug: 'clothing', emoji: '👕', icon: null, color: null, description: null, sort_order: 1, created_at: '2026-01-01' },
      ],
    })),
    getFeaturedListings: jest.fn(async () => ({ data: [], hasMore: false })),
    getTrendingListings: jest.fn(async () => ({ data: [], hasMore: false })),
    getListingsByMetro: jest.fn(async () => ({ data: [sampleListing], hasMore: false })),
    getStickyBusinessListings: jest.fn(async () => ({ data: [{ listing: sampleListing }] })),
    getUserSavedListingIds: jest.fn(async () => ({ data: [] })),
    saveListing: jest.fn(async () => ({})),
    unsaveListing: jest.fn(async () => ({})),
  };
});

describe('MarketplaceHomeScreen (redesign)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the header title and new icon actions', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
      expect(screen.getByLabelText('Open saved listings')).toBeTruthy();
      expect(screen.getByLabelText('Open marketplace menu')).toBeTruthy();
    });
  });

  it('renders the four tab strip', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Sponsored')).toBeTruthy();
      expect(screen.getByText('Featured')).toBeTruthy();
      expect(screen.getByText('Trending')).toBeTruthy();
      expect(screen.getByText('All Listings')).toBeTruthy();
    });
  });

  it('renders listing grid on the default Sponsored tab', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Warm winter jacket')).toBeTruthy();
    });
    expect(screen.queryByText('Recently Added')).toBeNull();
  });

  it('opens the menu sheet and routes My Listings', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Open marketplace menu')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Open marketplace menu'));
    fireEvent.press(screen.getByText('My Listings'));
    expect(mockNavigate).toHaveBeenCalledWith('MyListings');
  });

  it('routes the header heart directly to SavedListings', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Open saved listings')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Open saved listings'));
    expect(mockNavigate).toHaveBeenCalledWith('SavedListings');
  });
});
