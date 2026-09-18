import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { FlatList, RefreshControl } from 'react-native';
import { getCategories, getListingsByMetro, getFeaturedListings } from '@nepally/shared';
import MarketplaceCategoryScreen from './MarketplaceCategoryScreen';

// ---------------------------------------------------------------------------
// Mocks — local @expo/vector-icons mock is mandatory for CI (React 19 compat)
// ---------------------------------------------------------------------------

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../components/marketplace/ListingStrip', () => {
  const { View, Text } = jest.requireActual('react-native');
  const ReactLocal = jest.requireActual('react');
  type MockListing = { id: string; title: string };
  return {
    ListingStrip: ({ title, listings }: { title: string; listings: MockListing[] }) =>
      ReactLocal.createElement(
        View,
        { testID: `strip-${title.toLowerCase()}` },
        ReactLocal.createElement(Text, null, `strip:${title}:${listings.length}`)
      ),
  };
});

jest.mock('../../components/marketplace/ListingCard', () => ({
  ListingCard: ({ listing }: { listing: { title: string } }) => {
    const { Text } = jest.requireActual('react-native');
    const ReactLocal = jest.requireActual('react');
    return ReactLocal.createElement(Text, null, listing.title);
  },
}));

jest.mock('../../components/marketplace/FilterBar', () => {
  const { View, Text, TextInput, TouchableOpacity } = jest.requireActual('react-native');
  const ReactLocal = jest.requireActual('react');
  type MockValue = { category: string; sort: string; query: string };
  return {
    FilterBar: ({
      value,
      onChange,
      lockedCategory,
    }: {
      value: MockValue;
      onChange: (v: MockValue) => void;
      lockedCategory?: string;
    }) => {
      return ReactLocal.createElement(
        View,
        { accessibilityLabel: 'filter-bar' },
        ReactLocal.createElement(Text, null, `locked:${lockedCategory ?? 'none'}`),
        ReactLocal.createElement(Text, null, `category:${value.category}`),
        ReactLocal.createElement(Text, null, `sort:${value.sort}`),
        ReactLocal.createElement(Text, null, `query:${value.query}`),
        ReactLocal.createElement(
          TouchableOpacity,
          {
            accessibilityLabel: 'mock-set-sort-price-asc',
            onPress: () => onChange({ ...value, sort: 'price_asc' }),
          },
          ReactLocal.createElement(Text, null, 'SetSortAsc')
        ),
        ReactLocal.createElement(TextInput, {
          accessibilityLabel: 'mock-search',
          placeholder: 'Search...',
          value: value.query,
          onChangeText: (q: string) => onChange({ ...value, query: q }),
        }),
        ReactLocal.createElement(
          TouchableOpacity,
          {
            accessibilityLabel: 'mock-set-category-professional',
            onPress: () => onChange({ ...value, category: 'professional-services' }),
          },
          ReactLocal.createElement(Text, null, 'SetCategoryPro')
        )
      );
    },
  };
});

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
const mockUseAuth = jest.fn();
const mockRouteParams = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams() }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({ supabase: {} }));

// ---------------------------------------------------------------------------
// Shared mock
// ---------------------------------------------------------------------------

jest.mock('@nepally/shared', () => ({
  getListingsByMetro: jest.fn(async () => ({ data: [] })),
  getCategories: jest.fn(async () => ({ data: [] })),
  getFeaturedListings: jest.fn(async () => ({ data: [] })),
}));

const mockGetListingsByMetro = getListingsByMetro as jest.MockedFunction<typeof getListingsByMetro>;
const mockGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;
const mockGetFeaturedListings = getFeaturedListings as jest.MockedFunction<typeof getFeaturedListings>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FOOD_CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  icon: 'restaurant',
  color: '#FF6B35',
  description: 'Nepali restaurants',
  sort_order: 1,
  created_at: '2025-01-01T00:00:00Z',
};

const PRO_CATEGORY = {
  id: 'cat-2',
  name: 'Professional Services',
  slug: 'professional-services',
  emoji: '💼',
  icon: 'briefcase',
  color: '#2196F3',
  description: null,
  sort_order: 2,
  created_at: '2025-01-01T00:00:00Z',
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
  is_featured: false,
  trending_score: 10,
  views_count: 10,
  saves_count: 3,
  contacts_count: 1,
  refreshed_at: '2025-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  category: FOOD_CATEGORY,
  owner: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MarketplaceCategoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockRouteParams.mockReturnValue({
      categorySlug: 'food-restaurants',
      categoryName: 'Food & Restaurants',
    });
    mockGetCategories.mockResolvedValue({ data: [FOOD_CATEGORY, PRO_CATEGORY] });
    mockGetListingsByMetro.mockResolvedValue({ data: [MOCK_LISTING] });
    mockGetFeaturedListings.mockResolvedValue({ data: [] });
  });

  it('renders the category name in the header', async () => {
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Food & Restaurants')).toBeTruthy();
    });
  });

  it('renders FilterBar with category locked', async () => {
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('locked:food-restaurants')).toBeTruthy();
    });
    expect(screen.getByText('category:food-restaurants')).toBeTruthy();
  });

  it('calls getListingsByMetro with category slug + default sort', async () => {
    render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(mockGetListingsByMetro).toHaveBeenCalledWith(
        expect.anything(),
        'metro-1',
        expect.objectContaining({ categorySlug: 'food-restaurants', sortBy: 'newest' })
      );
    });
  });

  it('renders listings from API', async () => {
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
  });

  it('shows empty state when no listings', async () => {
    mockGetListingsByMetro.mockResolvedValue({ data: [] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('No listings in this category yet')).toBeTruthy();
    });
  });

  it('re-fetches when sort is changed via FilterBar', async () => {
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('sort:newest')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('mock-set-sort-price-asc'));
    await waitFor(() => {
      expect(mockGetListingsByMetro).toHaveBeenCalledWith(
        expect.anything(),
        'metro-1',
        expect.objectContaining({ sortBy: 'price_asc' })
      );
    });
  });

  it('changing category navigates to the new category', async () => {
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('mock-set-category-professional'));
    expect(mockNavigate).toHaveBeenCalledWith('MarketplaceCategory', {
      categorySlug: 'professional-services',
      categoryName: 'Professional Services',
    });
  });

  it('renders "Search Results" header in search mode', async () => {
    mockRouteParams.mockReturnValue({
      categorySlug: '__search__',
      categoryName: 'Search: biryani',
    });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Search Results')).toBeTruthy();
    });
  });

  it('does NOT lock category in search mode', async () => {
    mockRouteParams.mockReturnValue({
      categorySlug: '__search__',
      categoryName: 'Search: biryani',
    });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('locked:none')).toBeTruthy();
    });
  });

  it('passes search query from route in search mode', async () => {
    mockRouteParams.mockReturnValue({
      categorySlug: '__search__',
      categoryName: 'Search: biryani',
    });
    render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(mockGetListingsByMetro).toHaveBeenCalledWith(
        expect.anything(),
        'metro-1',
        expect.objectContaining({ searchQuery: 'biryani' })
      );
    });
  });

  it('skips fetch when metroId is empty', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', metro_area_id: '' } });
    mockGetListingsByMetro.mockClear();
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Food & Restaurants')).toBeTruthy();
    });
    expect(mockGetListingsByMetro).not.toHaveBeenCalled();
  });

  it('loads categories for FilterBar', async () => {
    render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(mockGetCategories).toHaveBeenCalled();
    });
  });

  it('renders ListingStrip when getFeaturedListings returns listings', async () => {
    mockGetFeaturedListings.mockResolvedValue({ data: [MOCK_LISTING] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('strip:Featured:1')).toBeTruthy();
    });
    expect(mockGetFeaturedListings).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ categorySlug: 'food-restaurants', limit: 10 })
    );
  });

  it('does not render featured strip in search mode', async () => {
    mockRouteParams.mockReturnValue({
      categorySlug: '__search__',
      categoryName: 'Search: biryani',
    });
    mockGetFeaturedListings.mockResolvedValue({ data: [MOCK_LISTING] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Search Results')).toBeTruthy();
    });
    expect(screen.queryByText(/strip:Featured/)).toBeNull();
    expect(mockGetFeaturedListings).not.toHaveBeenCalled();
  });

  it('does not render featured strip when getFeaturedListings returns empty', async () => {
    mockGetFeaturedListings.mockResolvedValue({ data: [] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.queryByText(/strip:Featured/)).toBeNull();
  });

  // -- Loading / refresh / pagination ----------------------------------------

  it('swaps the list for the spinner while a new filter set loads its first page', async () => {
    let resolveSortedPage: (value: Awaited<ReturnType<typeof getListingsByMetro>>) => void = () => {};
    mockGetListingsByMetro
      .mockResolvedValueOnce({ data: [MOCK_LISTING] })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSortedPage = resolve;
          })
      );
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('mock-set-sort-price-asc'));
    expect(screen.queryByText('Himalayan Kitchen')).toBeNull();

    resolveSortedPage({ data: [{ ...MOCK_LISTING, id: 'listing-2', title: 'Cheapest Momo' }] });
    await waitFor(() => {
      expect(screen.getByText('Cheapest Momo')).toBeTruthy();
    });
  });

  it('pull-to-refresh re-fetches the first page and clears the refresh spinner', async () => {
    mockGetListingsByMetro
      .mockResolvedValueOnce({ data: [MOCK_LISTING] })
      .mockResolvedValueOnce({ data: [{ ...MOCK_LISTING, title: 'Himalayan Kitchen (new)' }] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });

    fireEvent(screen.UNSAFE_getByType(RefreshControl), 'refresh');
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen (new)')).toBeTruthy();
    });
    expect(mockGetListingsByMetro).toHaveBeenLastCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ offset: 0 })
    );
    expect(screen.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
  });

  it('appends the next page when the end of a full page is reached', async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ ...MOCK_LISTING, id: `listing-${i}` }));
    mockGetListingsByMetro
      .mockResolvedValueOnce({ data: fullPage })
      .mockResolvedValueOnce({ data: [{ ...MOCK_LISTING, id: 'listing-20' }] });
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.UNSAFE_getByType(FlatList).props.data).toHaveLength(20);
    });

    fireEvent(screen.UNSAFE_getByType(FlatList), 'endReached');
    await waitFor(() => {
      expect(screen.UNSAFE_getByType(FlatList).props.data).toHaveLength(21);
    });
    expect(mockGetListingsByMetro).toHaveBeenLastCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ offset: 20 })
    );
  });

  it('does not request another page after a short (final) page', async () => {
    const screen = render(<MarketplaceCategoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });

    fireEvent(screen.UNSAFE_getByType(FlatList), 'endReached');
    expect(mockGetListingsByMetro).toHaveBeenCalledTimes(1);
  });
});
