import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert, RefreshControl } from 'react-native';
import { getListingsByOwner, deactivateListing, reactivateListing, deleteListing, refreshListing } from '@nepally/shared';
import MyListingsScreen from './MyListingsScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      mockReact.createElement(mockView, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAddListener = jest.fn<jest.Mock, [string, () => void]>(() => jest.fn());
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
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

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    owner_id: 'user-1',
    metro_area_id: 'metro-1',
    category_id: 'cat-1',
    listing_type: 'business' as const,
    status: 'active' as const,
    title: 'My Restaurant',
    description: 'A great restaurant.',
    photos: [],
    price: '$15',
    business_name: 'My Restaurant LLC',
    address: null,
    phone: null,
    email: null,
    website_url: null,
    item_condition: null,
    business_hours: null,
    is_global: false,
    is_featured: false,
    trending_score: 0,
    views_count: 50,
    saves_count: 10,
    contacts_count: 5,
    refreshed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: MOCK_CATEGORY,
    owner: { id: 'user-1', full_name: 'Test User', trust_level: 1, profile_photo: null },
    ...overrides,
  };
}

jest.mock('@nepally/shared', () => ({
  getListingsByOwner: jest.fn(async () => ({ data: [] })),
  deactivateListing: jest.fn(async () => ({ error: null })),
  reactivateListing: jest.fn(async () => ({ error: null })),
  deleteListing: jest.fn(async () => ({ error: null })),
  refreshListing: jest.fn(async () => ({ error: null })),
  getDaysUntilSoftExpiry: jest.requireActual('@nepally/shared').getDaysUntilSoftExpiry,
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
}));

const mockGetListingsByOwner = getListingsByOwner as jest.MockedFunction<typeof getListingsByOwner>;
const mockDeactivateListing = deactivateListing as jest.MockedFunction<typeof deactivateListing>;
const mockReactivateListing = reactivateListing as jest.MockedFunction<typeof reactivateListing>;
const mockDeleteListing = deleteListing as jest.MockedFunction<typeof deleteListing>;
const mockRefreshListing = refreshListing as jest.MockedFunction<typeof refreshListing>;

describe('MyListingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
  });

  it('renders "My Listings" header', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Listings')).toBeTruthy();
    });
  });

  it('fetches listings for the current user', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Listings')).toBeTruthy();
    });
    expect(mockGetListingsByOwner).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('renders listing title', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Restaurant')).toBeTruthy();
    });
  });

  it('renders status badge', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeTruthy();
    });
  });

  it('renders stats for each listing', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('50 views')).toBeTruthy();
    });
    expect(screen.getByText('10 saves')).toBeTruthy();
    expect(screen.getByText('5 contacts')).toBeTruthy();
  });

  it('shows empty state when no listings', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("You haven't created any listings yet")).toBeTruthy();
    });
  });

  it('shows "Create your first listing" button in empty state', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Create your first listing')).toBeTruthy();
    });
  });

  it('renders action buttons for active listings', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    expect(screen.getByText('Refresh')).toBeTruthy();
    expect(screen.getByText('Deactivate')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('shows Reactivate instead of Deactivate for inactive listings', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'inactive' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Reactivate')).toBeTruthy();
    });
    expect(screen.queryByText('Deactivate')).toBeNull();
  });

  it('renders inactive status badge', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'inactive' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeTruthy();
    });
  });

  it('renders header with My Listings and back area', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Listings')).toBeTruthy();
    });
  });

  it('registers focus listener for re-fetching', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Listings')).toBeTruthy();
    });
    expect(mockAddListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });

  it('renders removed status badge', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'removed' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Removed')).toBeTruthy();
    });
  });

  it('hides Refresh and Deactivate for removed listings', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'removed' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Removed')).toBeTruthy();
    });
    expect(screen.queryByText('Refresh')).toBeNull();
    expect(screen.queryByText('Deactivate')).toBeNull();
    expect(screen.queryByText('Reactivate')).toBeNull();
  });

  it('shows expiry warning for listings expiring within 14 days', async () => {
    const nearExpiry = new Date();
    nearExpiry.setDate(nearExpiry.getDate() - 80); // 80 days old → 10 days left
    mockGetListingsByOwner.mockResolvedValue({
      data: [makeListing({ refreshed_at: nearExpiry.toISOString() })],
    });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Expires in \d+ days/)).toBeTruthy();
    });
  });

  it('shows the exact days left before soft expiry', async () => {
    // 80 days old → 10 days left (ms arithmetic so a DST change can't shift the day count)
    const nearExpiry = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000);
    mockGetListingsByOwner.mockResolvedValue({
      data: [makeListing({ refreshed_at: nearExpiry.toISOString() })],
    });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Expires in 10 days — refresh to stay visible')).toBeTruthy();
    });
  });

  it('does not show the expiry warning for a freshly refreshed listing', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Restaurant')).toBeTruthy();
    });
    expect(screen.queryByText(/Expires in/)).toBeNull();
  });

  it('renders listing price', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('$15')).toBeTruthy();
    });
  });

  it('renders listing with photo thumbnail', async () => {
    mockGetListingsByOwner.mockResolvedValue({
      data: [makeListing({ photos: ['https://example.com/photo.jpg'] })],
    });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Restaurant')).toBeTruthy();
    });
  });

  it('skips fetch when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Listings')).toBeTruthy();
    });
    expect(mockGetListingsByOwner).not.toHaveBeenCalled();
  });

  it('handles fetch error gracefully', async () => {
    mockGetListingsByOwner.mockRejectedValue(new Error('Network error'));
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("You haven't created any listings yet")).toBeTruthy();
    });
  });

  it('calls refreshListing when Refresh is pressed', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Refresh'));
    await waitFor(() => {
      expect(mockRefreshListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
  });

  it('calls deleteListing after confirming Delete alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Delete'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Listing',
      expect.any(String),
      expect.any(Array)
    );
    // Invoke the destructive confirm callback
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const confirmBtn = buttons.find(b => b.text === 'Delete');
    confirmBtn?.onPress?.();
    await waitFor(() => {
      expect(mockDeleteListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
    alertSpy.mockRestore();
  });

  it('calls deactivateListing after confirming Deactivate alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Deactivate')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Deactivate'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Deactivate Listing',
      expect.any(String),
      expect.any(Array)
    );
    // Invoke the confirm callback
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const confirmBtn = buttons.find(b => b.text === 'Deactivate');
    confirmBtn?.onPress?.();
    await waitFor(() => {
      expect(mockDeactivateListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
    alertSpy.mockRestore();
  });

  it('calls reactivateListing when Reactivate is pressed', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'inactive' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Reactivate')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Reactivate'));
    await waitFor(() => {
      expect(mockReactivateListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
  });

  it('navigates to CreateListing on empty-state button press', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Create your first listing')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Create your first listing'));
    expect(mockNavigate).toHaveBeenCalledWith('CreateListing');
  });

  it('re-fetches listings after Refresh is pressed', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeTruthy();
    });
    expect(mockGetListingsByOwner).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Refresh'));
    await waitFor(() => {
      expect(mockGetListingsByOwner).toHaveBeenCalledTimes(2);
    });
  });

  it('pull-to-refresh re-fetches, shows the new data and clears the spinner', async () => {
    mockGetListingsByOwner
      .mockResolvedValueOnce({ data: [makeListing()] })
      .mockResolvedValueOnce({ data: [makeListing({ title: 'Renamed Restaurant' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Restaurant')).toBeTruthy();
    });
    fireEvent(screen.UNSAFE_getByType(RefreshControl), 'refresh');
    await waitFor(() => {
      expect(screen.getByText('Renamed Restaurant')).toBeTruthy();
    });
    expect(screen.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
  });

  it('re-fetches when the screen gains focus and shows the latest result', async () => {
    // React Navigation emits `focus` as the screen mounts; simulate that here.
    mockAddListener.mockImplementationOnce((_event, callback) => {
      callback();
      return jest.fn();
    });
    mockGetListingsByOwner
      .mockResolvedValueOnce({ data: [makeListing({ title: 'Stale Title' })] })
      .mockResolvedValueOnce({ data: [makeListing({ title: 'Fresh Title' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Fresh Title')).toBeTruthy();
    });
    expect(mockGetListingsByOwner).toHaveBeenCalledTimes(2);
  });
});
