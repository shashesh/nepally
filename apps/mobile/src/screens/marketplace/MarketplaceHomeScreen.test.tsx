import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import MarketplaceHomeScreen from './MarketplaceHomeScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
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
