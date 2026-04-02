import React from 'react';
import { render, act } from '@testing-library/react-native';
import { getCategories, getListingsByMetro } from '@nepally/shared';
import MarketplaceHomeScreen from './MarketplaceHomeScreen';

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
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({ supabase: {} }));

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

function setAuthUser(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1', ...overrides },
  });
}

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

async function renderAndSettle() {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<MarketplaceHomeScreen />);
  });
  return utils;
}

describe('MarketplaceHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthUser();
    mockGetCategories.mockResolvedValue({ data: [MOCK_CATEGORY] });
    mockGetListingsByMetro.mockResolvedValue({ data: [MOCK_LISTING] });
  });

  it('renders the Marketplace title', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Marketplace')).toBeTruthy();
  });

  it('shows category grid', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Food & Restaurants')).toBeTruthy();
  });

  it('calls getListingsByMetro on mount', async () => {
    await renderAndSettle();
    expect(mockGetListingsByMetro).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ limit: expect.any(Number) })
    );
  });

  it('shows search input', async () => {
    const { getByPlaceholderText } = await renderAndSettle();
    expect(getByPlaceholderText(/search/i)).toBeTruthy();
  });

  it('renders the screen even when user is null (data fetch is skipped)', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { getByText } = await renderAndSettle();
    expect(getByText('Marketplace')).toBeTruthy();
  });
});
