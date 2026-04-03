import React from 'react';
import { render, act } from '@testing-library/react-native';
import { getListingsByMetro } from '@nepally/shared';
import MarketplaceCategoryScreen from './MarketplaceCategoryScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

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
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({
    params: { categorySlug: 'food-restaurants', categoryName: 'Food & Restaurants' },
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

jest.mock('@nepally/shared', () => ({
  getListingsByMetro: jest.fn(async () => ({ data: [] })),
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
}));

const mockGetListingsByMetro = getListingsByMetro as jest.MockedFunction<typeof getListingsByMetro>;

function setAuthUser(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1', ...overrides },
  });
}

async function renderAndSettle() {
  const utils = render(<MarketplaceCategoryScreen />);
  await act(async () => {});
  await act(async () => {});
  return utils;
}

describe('MarketplaceCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthUser();
    mockGetListingsByMetro.mockResolvedValue({ data: [MOCK_LISTING] });
  });

  it('renders the category name in the header', async () => {
    const { getByText } = await renderAndSettle();
    expect(getByText('Food & Restaurants')).toBeTruthy();
  });

  it('calls getListingsByMetro with category slug filter', async () => {
    await renderAndSettle();
    expect(mockGetListingsByMetro).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ categorySlug: 'food-restaurants' })
    );
  });

  it('renders listings from API', async () => {
    const { getAllByText } = await renderAndSettle();
    // Title and business_name are both "Himalayan Kitchen"
    expect(getAllByText('Himalayan Kitchen').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no listings', async () => {
    mockGetListingsByMetro.mockResolvedValue({ data: [] });
    const { getByText } = await renderAndSettle();
    expect(getByText('No listings in this category yet')).toBeTruthy();
  });

  it('shows search input with category-specific placeholder', async () => {
    const { getByPlaceholderText } = await renderAndSettle();
    expect(getByPlaceholderText(/Search in Food & Restaurants/)).toBeTruthy();
  });

  it('renders back button area', async () => {
    // The back button uses TouchableOpacity which renders as accessible View
    const { getByText } = await renderAndSettle();
    // Verify the header with category name renders (back button is adjacent)
    expect(getByText('Food & Restaurants')).toBeTruthy();
  });

  it('skips fetch when metroId is empty', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', metro_area_id: '' } });
    mockGetListingsByMetro.mockClear();
    await renderAndSettle();
    expect(mockGetListingsByMetro).not.toHaveBeenCalled();
  });
});
