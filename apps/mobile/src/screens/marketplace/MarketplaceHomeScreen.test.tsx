import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import {
  getCategories,
  getFeaturedListings,
  getListingsByMetro,
  getTrendingListings,
} from '@nepally/shared';
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

jest.mock('../../components/marketplace/FilterBar', () => {
  const { View, Text, TextInput, TouchableOpacity } = jest.requireActual('react-native');
  const ReactLocal = jest.requireActual('react');
  type MockCategory = { id: string; slug: string; name: string };
  type MockValue = { category: string; sort: string; query: string };
  return {
    FilterBar: ({
      categories,
      value,
      onChange,
      lockedCategory,
    }: {
      categories: MockCategory[];
      value: MockValue;
      onChange: (v: MockValue) => void;
      lockedCategory?: string;
    }) => {
      return ReactLocal.createElement(
        View,
        { accessibilityLabel: 'filter-bar' },
        ReactLocal.createElement(
          TouchableOpacity,
          {
            accessibilityLabel: 'mock-set-category',
            onPress: () =>
              onChange({ ...value, category: categories[0]?.slug ?? 'food-restaurants' }),
          },
          ReactLocal.createElement(Text, null, 'SetCategory')
        ),
        ReactLocal.createElement(
          TouchableOpacity,
          {
            accessibilityLabel: 'mock-set-sort-featured',
            onPress: () => onChange({ ...value, sort: 'featured' }),
          },
          ReactLocal.createElement(Text, null, 'SetSortFeatured')
        ),
        ReactLocal.createElement(TextInput, {
          accessibilityLabel: 'mock-search',
          placeholder: 'Search...',
          value: value.query,
          onChangeText: (q: string) => onChange({ ...value, query: q }),
        }),
        lockedCategory
          ? ReactLocal.createElement(Text, null, `Locked: ${lockedCategory}`)
          : null
      );
    },
  };
});

jest.mock('../../components/marketplace/ListingStrip', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const ReactLocal = jest.requireActual('react');
  type MockListing = { id: string; title: string };
  return {
    ListingStrip: ({
      title,
      listings,
      onItemPress,
      onShowAll,
    }: {
      title: string;
      listings: MockListing[];
      onItemPress: (l: MockListing) => void;
      onShowAll: () => void;
    }) => {
      if (listings.length === 0) return null;
      return ReactLocal.createElement(
        View,
        { accessibilityLabel: `strip-${title}` },
        ReactLocal.createElement(Text, null, `Strip: ${title}`),
        ...listings.map((l) =>
          ReactLocal.createElement(
            TouchableOpacity,
            {
              key: l.id,
              accessibilityLabel: `strip-${title}-item-${l.id}`,
              onPress: () => onItemPress(l),
            },
            ReactLocal.createElement(Text, null, l.title)
          )
        ),
        ReactLocal.createElement(
          TouchableOpacity,
          { accessibilityLabel: `strip-${title}-show-all`, onPress: onShowAll },
          ReactLocal.createElement(Text, null, `ShowAll-${title}`)
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
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => {
  const ReactLocal = jest.requireActual('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: () => void) => {
      // Simulate focus firing once on mount in tests
      ReactLocal.useEffect(cb, []);
    },
  };
});

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
  getFeaturedListings: jest.fn(async () => ({ data: [] })),
  getTrendingListings: jest.fn(async () => ({ data: [] })),
  getStickyBusinessListings: jest.fn(async () => ({ data: [] })),
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
}));

const mockGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;
const mockGetListingsByMetro = getListingsByMetro as jest.MockedFunction<typeof getListingsByMetro>;
const mockGetFeaturedListings = getFeaturedListings as jest.MockedFunction<typeof getFeaturedListings>;
const mockGetTrendingListings = getTrendingListings as jest.MockedFunction<typeof getTrendingListings>;

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

function makeListing(id: string, title: string) {
  return {
    id,
    owner_id: 'user-2',
    metro_area_id: 'metro-1',
    category_id: 'cat-1',
    listing_type: 'business' as const,
    status: 'active' as const,
    title,
    description: 'Test',
    photos: [],
    price: '$10',
    business_name: title,
    address: null,
    phone: null,
    email: null,
    website_url: null,
    item_condition: null,
    business_hours: null,
    is_global: false,
    is_featured: false,
    trending_score: 10,
    views_count: 5,
    saves_count: 1,
    contacts_count: 0,
    refreshed_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    category: MOCK_CATEGORY,
    owner: { id: 'user-2', full_name: 'Asha', trust_level: 1, profile_photo: null },
  };
}

const FEATURED_LISTING = makeListing('feat-1', 'Featured Kitchen');
const RECENT_LISTING = makeListing('recent-1', 'Recent Stall');
const TRENDING_LISTING = makeListing('trend-1', 'Trending Spot');
const ALL_LISTING = makeListing('all-1', 'All Thing');
const FILTERED_LISTING = makeListing('filt-1', 'Filtered Match');

// ---------------------------------------------------------------------------
// Tests — render() + waitFor() only
// ---------------------------------------------------------------------------

describe('MarketplaceHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetCategories.mockResolvedValue({ data: [MOCK_CATEGORY] });
    mockGetFeaturedListings.mockResolvedValue({ data: [FEATURED_LISTING] });
    mockGetTrendingListings.mockResolvedValue({ data: [TRENDING_LISTING] });
    mockGetListingsByMetro.mockImplementation(async (_client, _metro, opts) => {
      if (opts?.sortBy === 'newest' && opts?.limit === 10) return { data: [RECENT_LISTING] };
      if (opts?.categorySlug || opts?.searchQuery || (opts?.sortBy && opts.sortBy !== 'newest')) {
        return { data: [FILTERED_LISTING] };
      }
      return { data: [ALL_LISTING] };
    });
  });

  it('renders the Marketplace title', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
  });

  it('fetches all home data in parallel on mount', async () => {
    render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(mockGetCategories).toHaveBeenCalled();
    });
    expect(mockGetFeaturedListings).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ limit: 10 })
    );
    expect(mockGetTrendingListings).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ limit: 10 })
    );
    // Recent strip uses sortBy: 'newest' with limit 10; grid uses limit 20
    expect(mockGetListingsByMetro).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ sortBy: 'newest', limit: 10 })
    );
    expect(mockGetListingsByMetro).toHaveBeenCalledWith(
      expect.anything(),
      'metro-1',
      expect.objectContaining({ limit: 20 })
    );
  });

  it('renders Featured, Recently Added, and Trending strips in home state', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    expect(screen.getByText('Strip: Recently Added')).toBeTruthy();
    expect(screen.getByText('Strip: Trending')).toBeTruthy();
  });

  it('renders All Listings section header when grid has items', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('All Listings')).toBeTruthy();
    });
    expect(screen.getByText('All Thing')).toBeTruthy();
  });

  it('hides strips when filter is active', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    // Activate filter by setting category
    fireEvent.press(screen.getByLabelText('mock-set-category'));
    await waitFor(() => {
      expect(screen.queryByText('Strip: Featured')).toBeNull();
    });
    expect(screen.queryByText('Strip: Recently Added')).toBeNull();
    expect(screen.queryByText('Strip: Trending')).toBeNull();
    expect(screen.queryByText('All Listings')).toBeNull();
  });

  it('shows filtered listings when filter is active', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('mock-set-category'));
    await waitFor(() => {
      expect(screen.getByText('Filtered Match')).toBeTruthy();
    });
  });

  it('shows "Back to Marketplace" link when filtered and hides it in home state', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Back to Marketplace')).toBeNull();

    fireEvent.press(screen.getByLabelText('mock-set-category'));
    await waitFor(() => {
      expect(screen.getByLabelText('Back to Marketplace')).toBeTruthy();
    });
  });

  it('"Back to Marketplace" link resets to home state showing strips', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('mock-set-sort-featured'));
    await waitFor(() => {
      expect(screen.getByLabelText('Back to Marketplace')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('Back to Marketplace'));
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Back to Marketplace')).toBeNull();
  });

  it('shows empty state with filter message when filtered and no results', async () => {
    mockGetListingsByMetro.mockImplementation(async (_client, _metro, opts) => {
      if (opts?.categorySlug) return { data: [] };
      return { data: [ALL_LISTING] };
    });
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('mock-set-category'));
    await waitFor(() => {
      expect(screen.getByText('No listings match your filters')).toBeTruthy();
    });
  });

  it('shows empty state with area message in home when no listings at all', async () => {
    mockGetFeaturedListings.mockResolvedValue({ data: [] });
    mockGetTrendingListings.mockResolvedValue({ data: [] });
    mockGetListingsByMetro.mockResolvedValue({ data: [] });
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('No listings in your area yet')).toBeTruthy();
    });
  });

  it('navigates to listing detail when strip item pressed', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('strip-Featured-item-feat-1'));
    expect(mockNavigate).toHaveBeenCalledWith('ListingDetail', { listingId: 'feat-1' });
  });

  it('Show All on Featured strip applies featured sort filter', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Strip: Featured')).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText('strip-Featured-show-all'));
    await waitFor(() => {
      expect(mockGetListingsByMetro).toHaveBeenCalledWith(
        expect.anything(),
        'metro-1',
        expect.objectContaining({ sortBy: 'featured' })
      );
    });
  });

  it('skips fetch when metro_area_id is empty', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: '' },
    });
    mockGetListingsByMetro.mockClear();
    mockGetFeaturedListings.mockClear();
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
    expect(mockGetListingsByMetro).not.toHaveBeenCalled();
    expect(mockGetFeaturedListings).not.toHaveBeenCalled();
  });

  it('renders when user is null without fetching', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockGetListingsByMetro.mockClear();
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
    expect(mockGetListingsByMetro).not.toHaveBeenCalled();
  });

  it('does not show create button for Level 0 user in empty state', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 0, metro_area_id: 'metro-1' },
    });
    mockGetFeaturedListings.mockResolvedValue({ data: [] });
    mockGetTrendingListings.mockResolvedValue({ data: [] });
    mockGetListingsByMetro.mockResolvedValue({ data: [] });
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('No listings in your area yet')).toBeTruthy();
    });
    expect(screen.queryByText('Create the first listing')).toBeNull();
  });
});
