import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import SavedListingsScreen from './SavedListingsScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../config/supabase', () => ({ supabase: {} }));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', metro_area_id: 'm1', trust_level: 1 } }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
// Mock heavy child components — CI fix pattern (see apps/mobile/CLAUDE.md).
jest.mock('../../components/marketplace/ListingGridCard', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    ListingGridCard: ({ listing }: { listing: { title: string } }) =>
      ReactLocal.createElement(Text, null, listing.title),
  };
});

jest.mock('../../components/marketplace/MarketplaceEmptyState', () => ({
  MarketplaceEmptyState: () => null,
}));

const mockListing = {
  id: 'l1',
  owner_id: 'o1',
  metro_area_id: 'm1',
  category_id: 'c1',
  listing_type: 'individual' as const,
  status: 'active' as const,
  title: 'Saved thing',
  description: '',
  photos: [],
  price: '$10',
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: 'used' as const,
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 0,
  saves_count: 1,
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
    getSavedListingsByUser: jest.fn(async () => ({ data: [mockListing] })),
    getUserSavedListingIds: jest.fn(async () => ({ data: ['l1'] })),
    saveListing: jest.fn(async () => ({})),
    unsaveListing: jest.fn(async () => ({})),
  };
});

describe('SavedListingsScreen', () => {
  it('renders saved listings after loading', async () => {
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });
  });
});
