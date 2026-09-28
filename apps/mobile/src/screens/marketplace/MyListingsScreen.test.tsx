import React from 'react';
import { act, render, waitFor, fireEvent, within } from '@testing-library/react-native';
import { ActionSheetIOS, Alert, RefreshControl, StyleSheet } from 'react-native';
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
const mockIsFocused = jest.fn(() => true);
const mockUseAuth = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
    isFocused: mockIsFocused,
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
  userMessage: jest.requireActual('@nepally/shared').userMessage,
  formatListingPrice: jest.requireActual('@nepally/shared').formatListingPrice,
  getListingsByOwner: jest.fn(async () => ({ data: [] })),
  deactivateListing: jest.fn(async () => ({ error: null })),
  reactivateListing: jest.fn(async () => ({ error: null })),
  deleteListing: jest.fn(async () => ({ error: null })),
  refreshListing: jest.fn(async () => ({ error: null })),
  getDaysUntilSoftExpiry: jest.requireActual('@nepally/shared').getDaysUntilSoftExpiry,
  pluralize: jest.requireActual('@nepally/shared').pluralize,
  LISTING_SOFT_EXPIRY_DAYS: 90,
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
}));

type Screen = ReturnType<typeof render>;

/** Opens a listing's More menu and picks `choice` from the iOS action sheet. */
function chooseFromMore(screen: Screen, choice: string) {
  const sheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation((options, callback) => {
      callback(options.options.indexOf(choice));
    });
  fireEvent.press(screen.getByRole('button', { name: 'More actions for My Restaurant' }));
  sheet.mockRestore();
}

/** Presses the button labelled `text` in the last alert shown. */
function pressAlertButton(alertSpy: jest.SpyInstance, text: string) {
  const buttons = alertSpy.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>;
  act(() => {
    buttons.find((button) => button.text === text)?.onPress?.();
  });
}

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

  it('keeps Edit and Refresh in the row and the rest under More', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    expect(screen.getByText('Refresh')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More actions for My Restaurant' })).toBeTruthy();
    expect(screen.queryByText('Deactivate')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
    expect(screen.queryByText('Promote')).toBeNull();
  });

  it('offers Deactivate and Delete under More for an active listing', async () => {
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => {});
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'More actions for My Restaurant' }));

    expect(sheet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Restaurant',
        options: ['Deactivate', 'Delete', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      }),
      expect.any(Function)
    );
    sheet.mockRestore();
  });

  it('offers Reactivate instead of Deactivate for an inactive listing', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'inactive' })] });
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => {});
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: 'More actions for My Restaurant' }));

    expect(sheet).toHaveBeenCalledWith(
      expect.objectContaining({ options: ['Reactivate', 'Delete', 'Cancel'] }),
      expect.any(Function)
    );
    sheet.mockRestore();
  });

  it('gives each row action a 44pt target', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    for (const name of ['Edit My Restaurant', 'Refresh My Restaurant', 'More actions for My Restaurant']) {
      const style = StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it("keeps the actions out of the card's open button, so a screen reader reaches each", async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    const card = screen.getByRole('button', { name: 'My Restaurant, Active, $15' });

    expect(within(card).queryByText('Edit')).toBeNull();
    fireEvent.press(card);
    expect(mockNavigate).toHaveBeenCalledWith('ListingDetail', { listingId: 'listing-1' });
  });

  it('labels the back button', async () => {
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('counts one of each in the singular', async () => {
    const lastDay = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000);
    mockGetListingsByOwner.mockResolvedValue({
      data: [
        makeListing({ views_count: 1, saves_count: 1, contacts_count: 1, refreshed_at: lastDay.toISOString() }),
      ],
    });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('1 view')).toBeTruthy();
    });
    expect(screen.getByText('1 save')).toBeTruthy();
    expect(screen.getByText('1 contact')).toBeTruthy();
    expect(screen.getByText('Expires in 1 day — refresh to stay visible')).toBeTruthy();
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

  it('shows a plain-number price as dollars', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ price: '1200' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('$1,200')).toBeTruthy();
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

  it("drops the previous owner's listings once no one is signed in", async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });

    mockUseAuth.mockReturnValue({ user: null });
    // Flushed inside act, not polled: a busy worker in the full suite can
    // outlast waitFor's one-second window.
    await act(async () => {
      screen.rerender(<MyListingsScreen />);
    });

    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('skips fetch when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('My Listings')).toBeTruthy();
    });
    expect(mockGetListingsByOwner).not.toHaveBeenCalled();
  });

  it('says My Listings could not load instead of claiming there are none', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetListingsByOwner.mockResolvedValue({ error: new Error('Network error') });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couldn't load your listings.")).toBeTruthy();
    });
    expect(screen.queryByText("You haven't created any listings yet")).toBeNull();
    jest.restoreAllMocks();
  });

  it('keeps the list and says so when a reload fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });

    mockGetListingsByOwner.mockResolvedValue({ error: new Error('Network error') });
    fireEvent(screen.UNSAFE_getByType(RefreshControl), 'refresh');

    await waitFor(() => {
      expect(screen.getByText("Couldn't load your listings.")).toBeTruthy();
    });
    expect(screen.getByText('Edit')).toBeTruthy();
    jest.restoreAllMocks();
  });

  it('treats a thrown fetch as a failure too, and Try again reloads', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetListingsByOwner.mockRejectedValueOnce(new Error('Network error'));
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couldn't load your listings.")).toBeTruthy();
    });

    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing()] });
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    jest.restoreAllMocks();
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

  it('calls deleteListing after confirming Delete', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    chooseFromMore(screen, 'Delete');
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Listing',
      expect.any(String),
      expect.any(Array)
    );
    pressAlertButton(alertSpy, 'Delete');
    await waitFor(() => {
      expect(mockDeleteListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
    alertSpy.mockRestore();
  });

  it('calls deactivateListing after confirming Deactivate', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    chooseFromMore(screen, 'Deactivate');
    expect(alertSpy).toHaveBeenCalledWith(
      'Deactivate Listing',
      expect.any(String),
      expect.any(Array)
    );
    pressAlertButton(alertSpy, 'Deactivate');
    await waitFor(() => {
      expect(mockDeactivateListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
    alertSpy.mockRestore();
  });

  it('calls reactivateListing when Reactivate is chosen', async () => {
    mockGetListingsByOwner.mockResolvedValue({ data: [makeListing({ status: 'inactive' })] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeTruthy();
    });
    chooseFromMore(screen, 'Reactivate');
    await waitFor(() => {
      expect(mockReactivateListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
  });

  it('opens the same menu as an alert on Android', async () => {
    const platform = jest.requireActual('react-native').Platform;
    const originalOS = platform.OS;
    platform.OS = 'android';
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const screen = render(<MyListingsScreen />);
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeTruthy();
      });
      fireEvent.press(screen.getByRole('button', { name: 'More actions for My Restaurant' }));

      expect(alertSpy).toHaveBeenCalledWith('My Restaurant', undefined, [
        expect.objectContaining({ text: 'Deactivate' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
      ]);
    } finally {
      platform.OS = originalOS;
      alertSpy.mockRestore();
    }
  });

  it('says so when a delete fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDeleteListing.mockResolvedValueOnce({ error: new Error('permission denied') });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeTruthy();
    });
    chooseFromMore(screen, 'Delete');
    pressAlertButton(alertSpy, 'Delete');

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Couldn't delete this listing", 'Please try again.');
    });
    jest.restoreAllMocks();
  });

  it('says so when a refresh fails, and does not claim it worked', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRefreshListing.mockResolvedValueOnce({ error: new Error('boom') });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Couldn't refresh this listing", 'Please try again.');
    });
    expect(alertSpy).not.toHaveBeenCalledWith('Listing refreshed', expect.anything());
    jest.restoreAllMocks();
  });

  it('confirms a refresh worked', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Listing refreshed',
        'It stays visible for another 90 days.'
      );
    });
    alertSpy.mockRestore();
  });

  it("doesn't alert over the screen the member moved on to, but still reloads", async () => {
    let finish: (value: unknown) => void = () => {};
    mockRefreshListing.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }) as never
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Refresh'));

    // The member opened Edit meanwhile; My Listings stays mounted underneath.
    mockIsFocused.mockReturnValue(false);
    await act(async () => {
      finish({});
    });

    expect(alertSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockGetListingsByOwner).toHaveBeenCalledTimes(2);
    });
    mockIsFocused.mockReturnValue(true);
    alertSpy.mockRestore();
  });

  it("keeps More closed for a listing whose change is still on its way", async () => {
    let finish: (value: unknown) => void = () => {};
    mockRefreshListing.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }) as never
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => {});
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Refresh'));
    fireEvent.press(screen.getByRole('button', { name: 'More actions for My Restaurant' }));

    expect(sheet).not.toHaveBeenCalled();
    await act(async () => {
      finish({});
    });
    sheet.mockRestore();
    alertSpy.mockRestore();
  });

  it("doesn't open or edit a listing whose change is still on its way", async () => {
    let finish: (value: unknown) => void = () => {};
    mockRefreshListing.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }) as never
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Refresh'));
    const card = screen.getByRole('button', { name: 'My Restaurant, Active, $15' });
    const edit = screen.getByRole('button', { name: 'Edit My Restaurant' });
    fireEvent.press(card);
    fireEvent.press(edit);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(card.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(edit.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));

    await act(async () => {
      finish({});
    });
    fireEvent.press(screen.getByRole('button', { name: 'My Restaurant, Active, $15' }));
    expect(mockNavigate).toHaveBeenCalledWith('ListingDetail', { listingId: 'listing-1' });
    alertSpy.mockRestore();
  });

  it('ignores a second tap while a refresh is on its way', async () => {
    let finish: (value: unknown) => void = () => {};
    mockRefreshListing.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }) as never
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Refresh'));
    fireEvent.press(screen.getByText('Refresh'));
    expect(mockRefreshListing).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Refresh My Restaurant' }).props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true })
    );

    await act(async () => {
      finish({});
    });
    expect(screen.getByRole('button', { name: 'Refresh My Restaurant' }).props.accessibilityState).toEqual(
      expect.objectContaining({ busy: false })
    );
    alertSpy.mockRestore();
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

  it('asks a Level 0 member to verify instead of offering Create', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', trust_level: 0, metro_area_id: 'metro-1' } });
    mockGetListingsByOwner.mockResolvedValue({ data: [] });
    const screen = render(<MyListingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Verify your account to create listings.')).toBeTruthy();
    });
    expect(screen.queryByText('Create your first listing')).toBeNull();
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
