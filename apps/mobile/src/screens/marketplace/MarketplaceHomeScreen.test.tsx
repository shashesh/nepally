import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { getListingsByMetro, getStickyBusinessListings } from '@nepally/shared';
import MarketplaceHomeScreen from './MarketplaceHomeScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../config/supabase', () => ({ supabase: {} }));

// CRITICAL: useAuth must return a STABLE reference across renders. Returning a
// fresh object literal every call makes `useEffect([user])` in the screen re-fire
// every render, causing an infinite loop that hangs on Ubuntu CI (passes locally
// on Windows only because act() converges before the 30s timeout there).
// Pattern lifted from HomeScreen.test.tsx which is proven to pass CI.
const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getParent: () => ({ navigate: mockNavigate }) }),
  // useFocusEffect mock using cbRef pattern — captures latest callback without
  // re-firing on every render. Copied from HomeScreen.test.tsx (proven CI-stable).
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactActual = jest.requireActual('react') as typeof import('react');
    const cbRef = ReactActual.useRef(cb);
    cbRef.current = cb;
    ReactActual.useEffect(() => {
      const cleanup = cbRef.current();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
}));
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

// Counts mounts so a test can prove the header isn't remounted on each keystroke
// (a remount drops the input's focus and closes the keyboard).
let mockSearchBarMounts = 0;
jest.mock('../../components/marketplace/MarketplaceSearchBar', () => {
  const ReactLocal = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    MarketplaceSearchBar: ({
      value,
      onChangeText,
    }: {
      value: string;
      onChangeText: (text: string) => void;
    }) => {
      ReactLocal.useEffect(() => {
        mockSearchBarMounts += 1;
      }, []);
      return ReactLocal.createElement(TextInput, {
        accessibilityLabel: 'Search marketplace',
        value,
        onChangeText,
      });
    },
  };
});

jest.mock('../../components/marketplace/CategoryTileRow', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    CategoryTileRow: ({ onSelect }: { onSelect: (slug: string) => void }) =>
      ReactLocal.createElement(
        TouchableOpacity,
        { onPress: () => onSelect('clothing') },
        ReactLocal.createElement(Text, null, 'Filter Clothing')
      ),
  };
});

// Flat stub: the strip's title and size, hidden when empty like the real one.
jest.mock('../../components/marketplace/ListingStrip', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    ListingStrip: ({ title, listings, sponsored }: { title: string; listings: unknown[]; sponsored?: boolean }) =>
      listings.length === 0
        ? null
        : ReactLocal.createElement(
            Text,
            null,
            `strip:${title}:${listings.length}${sponsored ? ':sponsored' : ''}`
          ),
  };
});

jest.mock('../../components/marketplace/MarketplaceEmptyState', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MarketplaceEmptyState: ({ variant }: { variant: string }) =>
      ReactLocal.createElement(Text, null, `empty:${variant}`),
  };
});

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

const STABLE_USER = { id: 'u1', metro_area_id: 'm1', trust_level: 1 };

const mockGetListingsByMetro = getListingsByMetro as jest.Mock;
const mockGetStickyBusinessListings = getStickyBusinessListings as jest.Mock;

describe('MarketplaceHomeScreen (redesign)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({ user: STABLE_USER });
    mockGetListingsByMetro.mockImplementation(async () => ({ data: [sampleListing], hasMore: false }));
    mockGetStickyBusinessListings.mockImplementation(async () => ({ data: [{ listing: sampleListing }] }));
    // userMessage logs a failed load through logClientEvent (console.error).
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Header and tab labels render synchronously in the initial tree.
  // Using waitFor with multiple assertions inside triggers a CI-specific hang:
  // FlatList's VirtualizedList schedules setState via real timers, causing
  // constant re-renders during waitFor polling. With >1 assertion in the
  // callback, one can find its target while another is transiently missing
  // mid-re-render — waitFor never sees them all pass together, retries until
  // 30s timeout on Ubuntu CI. Single-assertion waitFor calls (tests below)
  // are not affected. Static assertions don't need waitFor at all.
  it('renders the header title and new icon actions', () => {
    const screen = render(<MarketplaceHomeScreen />);
    expect(screen.getByText('Marketplace')).toBeTruthy();
    expect(screen.getByLabelText('Open saved listings')).toBeTruthy();
    expect(screen.getByLabelText('Open marketplace menu')).toBeTruthy();
  });

  it('shows the All listings grid under the discovery strips', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('All listings')).toBeTruthy();
    });
    expect(screen.getByText('Warm winter jacket')).toBeTruthy();
    expect(screen.getByText('strip:Sponsored:1:sponsored')).toBeTruthy();
    expect(screen.getByText('strip:Recently Added:1')).toBeTruthy();
    // Empty strips hide themselves.
    expect(screen.queryByText(/strip:Trending/)).toBeNull();
  });

  it('drops the discovery strips once a category narrows the view', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('strip:Sponsored:1:sponsored')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Filter Clothing'));

    await waitFor(() => {
      expect(screen.getByText('Clothing')).toBeTruthy();
    });
    expect(screen.queryByText(/strip:Sponsored/)).toBeNull();
    expect(screen.queryByText(/strip:Recently Added/)).toBeNull();
    expect(mockGetListingsByMetro).toHaveBeenCalledWith(
      expect.anything(),
      'm1',
      expect.objectContaining({ categorySlug: 'clothing', limit: 20 })
    );
  });

  it('says listings failed to load, and Try again loads them', async () => {
    mockGetListingsByMetro.mockImplementation(async () => ({ error: new Error('offline') }));
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couldn't load listings.")).toBeTruthy();
    });
    expect(screen.queryByText(/empty:/)).toBeNull();

    mockGetListingsByMetro.mockImplementation(async () => ({ data: [sampleListing], hasMore: false }));
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Warm winter jacket')).toBeTruthy();
    });
  });

  it('keeps the grid and shows a note when a pull-to-refresh fails', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Warm winter jacket')).toBeTruthy();
    });

    mockGetListingsByMetro.mockImplementation(async () => ({ error: new Error('offline') }));
    await act(async () => {
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });

    await waitFor(() => {
      expect(screen.getByText("Couldn't refresh listings.")).toBeTruthy();
    });
    expect(screen.getByText('Warm winter jacket')).toBeTruthy();
  });

  it('says the metro has nothing yet only when every source is empty', async () => {
    mockGetListingsByMetro.mockImplementation(async () => ({ data: [], hasMore: false }));
    mockGetStickyBusinessListings.mockImplementation(async () => ({ data: [] }));
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('empty:empty-metro')).toBeTruthy();
    });
  });

  it('does not claim the metro is empty while a strip still has listings', async () => {
    mockGetListingsByMetro.mockImplementation(async () => ({ data: [], hasMore: false }));
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('strip:Sponsored:1:sponsored')).toBeTruthy();
    });
    expect(screen.queryByText('empty:empty-metro')).toBeNull();
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

  it('keeps the same search input mounted while the member types', async () => {
    const screen = render(<MarketplaceHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Warm winter jacket')).toBeTruthy();
    });
    const mountsBefore = mockSearchBarMounts;

    fireEvent.changeText(screen.getByLabelText('Search marketplace'), 'j');
    fireEvent.changeText(screen.getByLabelText('Search marketplace'), 'ja');

    expect(mockSearchBarMounts).toBe(mountsBefore);
  });

  it('lets a tap land on the list while the keyboard is open', () => {
    const screen = render(<MarketplaceHomeScreen />);
    expect(screen.UNSAFE_getByType(FlatList).props.keyboardShouldPersistTaps).toBe('handled');
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
