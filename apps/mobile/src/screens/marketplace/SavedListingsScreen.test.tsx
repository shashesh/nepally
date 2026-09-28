import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { RefreshControl } from 'react-native';
import { getSavedListingsByUser, unsaveListing } from '@nepally/shared';
import SavedListingsScreen from './SavedListingsScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../config/supabase', () => ({ supabase: {} }));

// Keep useAuth returning a STABLE reference across renders. The screen's fetch
// effect is now keyed on `user?.id`, but an earlier version keyed on the `user`
// object re-fired every render with a fresh literal and hung Ubuntu CI.
const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// The focus callback is captured, not run: a test calls it to stand in for the
// screen gaining focus (the first call is the initial focus, which the screen skips).
const mockNavigate = jest.fn();
let mockFocusCallback: (() => void) | null = null;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => void) => {
    mockFocusCallback = callback;
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
// Mock heavy child components — CI fix pattern (see apps/mobile/CLAUDE.md).
jest.mock('../../components/marketplace/ListingGridCard', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    ListingGridCard: ({
      listing,
      onToggleSave,
    }: {
      listing: { id: string; title: string };
      onToggleSave: (id: string) => void;
    }) =>
      ReactLocal.createElement(
        View,
        null,
        ReactLocal.createElement(Text, null, listing.title),
        ReactLocal.createElement(
          TouchableOpacity,
          { onPress: () => onToggleSave(listing.id) },
          ReactLocal.createElement(Text, null, `Unsave ${listing.title}`)
        )
      ),
  };
});

jest.mock('../../components/marketplace/MarketplaceEmptyState', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    MarketplaceEmptyState: ({ variant, onPrimary }: { variant: string; onPrimary?: () => void }) =>
      ReactLocal.createElement(
        TouchableOpacity,
        { onPress: onPrimary },
        ReactLocal.createElement(Text, null, `empty:${variant}`)
      ),
  };
});

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

const mockGetSavedListingsByUser = getSavedListingsByUser as jest.MockedFunction<
  typeof getSavedListingsByUser
>;

const STABLE_USER = { id: 'u1', metro_area_id: 'm1', trust_level: 1 };

describe('SavedListingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusCallback = null;
    mockUseAuth.mockReturnValue({ user: STABLE_USER });
    mockGetSavedListingsByUser.mockImplementation(async () => ({ data: [mockListing] }));
    // userMessage logs a failed load through logClientEvent (console.error).
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders saved listings after loading', async () => {
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });
  });

  it('fetches saved listings for the signed-in user', async () => {
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });
    expect(mockGetSavedListingsByUser).toHaveBeenCalledWith(expect.anything(), 'u1');
  });

  it('stops loading and shows the empty state when signed out, without fetching', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('empty:empty-saved')).toBeTruthy();
    });
    expect(mockGetSavedListingsByUser).not.toHaveBeenCalled();
  });

  it('says there are no saved listings yet, and offers the marketplace', async () => {
    mockGetSavedListingsByUser.mockImplementation(async () => ({ data: [] }));
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('empty:empty-saved')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('empty:empty-saved'));
    expect(mockNavigate).toHaveBeenCalledWith('MarketplaceHome');
  });

  it('says saved listings could not load instead of showing the empty state', async () => {
    mockGetSavedListingsByUser.mockRejectedValueOnce(new Error('Network error'));
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couldn't load your saved listings.")).toBeTruthy();
    });
    expect(screen.queryByText(/empty:/)).toBeNull();
  });

  it('loads again on Try again after a failed load', async () => {
    mockGetSavedListingsByUser.mockResolvedValueOnce({ error: new Error('Network error') });
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couldn't load your saved listings.")).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });
  });

  it('refetches when the screen comes back into view', async () => {
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });

    act(() => mockFocusCallback?.());
    expect(mockGetSavedListingsByUser).toHaveBeenCalledTimes(1);

    mockGetSavedListingsByUser.mockImplementation(async () => ({ data: [] }));
    act(() => mockFocusCallback?.());

    await waitFor(() => {
      expect(screen.getByText('empty:empty-saved')).toBeTruthy();
    });
    expect(mockGetSavedListingsByUser).toHaveBeenCalledTimes(2);
  });

  it('refetches on pull-to-refresh', async () => {
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });

    fireEvent(screen.UNSAFE_getByType(RefreshControl), 'refresh');

    await waitFor(() => {
      expect(mockGetSavedListingsByUser).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the list and says so when a refresh fails', async () => {
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });

    mockGetSavedListingsByUser.mockImplementation(async () => ({ error: new Error('offline') }));
    fireEvent(screen.UNSAFE_getByType(RefreshControl), 'refresh');

    await waitFor(() => {
      expect(screen.getByText("Couldn't load your saved listings.")).toBeTruthy();
    });
    expect(screen.getByText('Saved thing')).toBeTruthy();
  });

  it('drops a listing from the list once it is unsaved', async () => {
    const screen = render(<SavedListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Saved thing')).toBeTruthy();
    });

    // Flush the unsave round trip inside act rather than polling for it: a busy
    // worker in the full suite can outlast waitFor's one-second window.
    await act(async () => {
      fireEvent.press(screen.getByText('Unsave Saved thing'));
    });

    expect(unsaveListing).toHaveBeenCalledWith(expect.anything(), 'l1');
    expect(screen.queryByText('Saved thing')).toBeNull();
  });
});
