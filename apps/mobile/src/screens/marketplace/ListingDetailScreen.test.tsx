import React from 'react';
import { Alert, Dimensions, Linking, ScrollView, Share } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  createReport,
  getListingById,
  getOrCreateConversation,
  getUserSavedListingIds,
  incrementListingContacts,
  incrementListingViews,
  saveListing,
} from '@nepally/shared';
import { Image } from 'expo-image';
import ListingDetailScreen from './ListingDetailScreen';

// ---------------------------------------------------------------------------
// Mocks — local @expo/vector-icons mock is mandatory for CI (React 19 compat)
// ---------------------------------------------------------------------------

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

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
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));
const mockUseAuth = jest.fn();
let mockFocusCallback: (() => void | (() => void)) | null = null;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    getParent: mockGetParent,
  }),
  useRoute: () => ({ params: { listingId: 'listing-1' } }),
  // Captured, not run: a test calls it to stand in for the screen gaining focus
  // (the first call is the initial focus, which the screen skips).
  useFocusEffect: (callback: () => void | (() => void)) => {
    mockFocusCallback = callback;
  },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({ supabase: {} }));

// ---------------------------------------------------------------------------
// Shared mock
// ---------------------------------------------------------------------------

jest.mock('@nepally/shared', () => ({
  getListingById: jest.fn(async () => ({ data: null })),
  saveListing: jest.fn(async () => ({ error: null })),
  unsaveListing: jest.fn(async () => ({ error: null })),
  getUserSavedListingIds: jest.fn(async () => ({ data: [] })),
  incrementListingViews: jest.fn(async () => {}),
  incrementListingContacts: jest.fn(async () => {}),
  getOrCreateConversation: jest.fn(async () => ({ data: null })),
  createReport: jest.fn(async () => ({ data: { id: 'report-1' } })),
  userMessage: jest.requireActual('@nepally/shared').userMessage,
  formatListingPrice: jest.requireActual('@nepally/shared').formatListingPrice,
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
  ITEM_CONDITION_LABELS: { new: 'New', used: 'Used' },
  BUSINESS_HOURS_DAYS: [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ],
  getListingHighlights: jest.fn(() => [
    { key: 'phone', icon: '📞', label: 'Phone', value: '555-1234' },
  ]),
  isBusinessOpenNow: jest.fn(() => ({ isOpen: true, nextChangeLabel: 'Closes 5p' })),
  getDaysSinceRefresh: jest.requireActual('@nepally/shared').getDaysSinceRefresh,
  toTelUrl: jest.requireActual('@nepally/shared').toTelUrl,
  toMailtoUrl: jest.requireActual('@nepally/shared').toMailtoUrl,
  toWebsiteUrl: jest.requireActual('@nepally/shared').toWebsiteUrl,
  toMapsUrls: jest.requireActual('@nepally/shared').toMapsUrls,
  listingInquiryDraft: jest.requireActual('@nepally/shared').listingInquiryDraft,
  pluralize: jest.requireActual('@nepally/shared').pluralize,
  formatClockTime: jest.requireActual('@nepally/shared').formatClockTime,
  listingWebUrl: jest.requireActual('@nepally/shared').listingWebUrl,
}));

const mockGetListingById = getListingById as jest.MockedFunction<typeof getListingById>;
const mockGetUserSavedListingIds = getUserSavedListingIds as jest.MockedFunction<
  typeof getUserSavedListingIds
>;

const DAY_MS = 24 * 60 * 60 * 1000;

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
  description: 'Authentic Nepali food and drinks.',
  photos: [],
  price: '$15-25',
  business_name: 'Himalayan Kitchen LLC',
  address: '123 Main St',
  phone: '555-1234',
  email: 'info@himalayan.com',
  website_url: 'https://himalayan.com',
  item_condition: null,
  business_hours: { monday: { open: '9:00', close: '17:00' } },
  is_global: false,
  views_count: 10,
  saves_count: 3,
  contacts_count: 1,
  refreshed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: MOCK_CATEGORY,
  owner: {
    id: 'user-2',
    full_name: 'Asha Kumar',
    trust_level: 1,
    profile_photo: null,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ListingDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFocusCallback = null;
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'Test User', trust_level: 1, metro_area_id: 'metro-1' },
    });
    mockGetListingById.mockResolvedValue({ data: MOCK_LISTING } as never);
    mockGetUserSavedListingIds.mockResolvedValue({ data: [] });
  });

  // -- Data fetching & display -----------------------------------------------

  it('shows the edits after coming back from the edit form', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });

    act(() => {
      mockFocusCallback?.();
    });
    expect(mockGetListingById).toHaveBeenCalledTimes(1);

    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, title: 'Everest Kitchen' },
    } as never);
    await act(async () => {
      mockFocusCallback?.();
    });

    expect(screen.getByText('Everest Kitchen')).toBeTruthy();
    expect(mockGetListingById).toHaveBeenCalledTimes(2);
    // Coming back isn't another view.
    expect(incrementListingViews).toHaveBeenCalledTimes(1);
  });

  it("doesn't refetch on return while the first load is still on its way", async () => {
    let finishLoad: (value: unknown) => void = () => {};
    mockGetListingById.mockReturnValueOnce(
      new Promise((resolve) => {
        finishLoad = resolve;
      }) as never
    );
    const screen = render(<ListingDetailScreen />);

    act(() => {
      mockFocusCallback?.();
      mockFocusCallback?.();
    });
    expect(mockGetListingById).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishLoad({ data: MOCK_LISTING });
    });
    expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
  });

  it('goes back to the first photo when the photos changed while away', async () => {
    const photo = (name: string) => 'https://cdn/listing-photos/u/' + name + '.jpg';
    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, photos: [photo('a'), photo('b'), photo('c')] },
    } as never);
    const screen = render(<ListingDetailScreen />);
    await act(async () => {});

    const carousel = () =>
      screen.UNSAFE_getAllByType(ScrollView).find((view) => view.props.pagingEnabled)!;
    fireEvent(carousel(), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 2 * Dimensions.get('window').width, y: 0 } },
    });
    expect(screen.getByText('3 / 3')).toBeTruthy();

    // The edit removed the third photo.
    act(() => {
      mockFocusCallback?.();
    });
    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, photos: [photo('a'), photo('b')] },
    } as never);
    await act(async () => {
      mockFocusCallback?.();
    });

    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('keeps the listing on screen when the refetch on return fails', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });

    act(() => {
      mockFocusCallback?.();
    });
    mockGetListingById.mockResolvedValue({ error: new Error('offline') } as never);
    await act(async () => {
      mockFocusCallback?.();
    });

    expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
  });

  it('renders listing title after load', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
  });

  it('renders listing description', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Authentic Nepali food and drinks.')).toBeTruthy();
    });
  });

  it('renders listing price', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('$15-25').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows a plain-number price as dollars', async () => {
    mockGetListingById.mockResolvedValue({ data: { ...MOCK_LISTING, price: '80' } } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('$80').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders business details for business listings', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Business Details')).toBeTruthy();
    });
    expect(screen.getByText('Himalayan Kitchen LLC')).toBeTruthy();
    expect(screen.getByText('123 Main St')).toBeTruthy();
    expect(screen.getByText('555-1234')).toBeTruthy();
  });

  // -- Contact details (4.1) -------------------------------------------------

  describe('contact details', () => {
    let openURL: jest.SpyInstance;

    beforeEach(() => {
      openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    });

    afterEach(() => {
      openURL.mockRestore();
    });

    async function renderLoaded() {
      const screen = render(<ListingDetailScreen />);
      await waitFor(() => {
        expect(screen.getByText('Business Details')).toBeTruthy();
      });
      return screen;
    }

    it('calls the phone number', async () => {
      const screen = await renderLoaded();
      fireEvent.press(screen.getByRole('link', { name: 'Call 555-1234' }));
      await waitFor(() => {
        expect(openURL).toHaveBeenCalledWith('tel:5551234');
      });
    });

    it('writes to the email address', async () => {
      const screen = await renderLoaded();
      fireEvent.press(screen.getByRole('link', { name: 'Email info@himalayan.com' }));
      await waitFor(() => {
        expect(openURL).toHaveBeenCalledWith('mailto:info@himalayan.com');
      });
    });

    it('opens a website typed without a scheme over https', async () => {
      mockGetListingById.mockResolvedValue({
        data: { ...MOCK_LISTING, website_url: 'www.himalayan.com' },
      } as never);
      const screen = await renderLoaded();
      fireEvent.press(screen.getByRole('link', { name: 'Open www.himalayan.com' }));
      await waitFor(() => {
        expect(openURL).toHaveBeenCalledWith('https://www.himalayan.com');
      });
    });

    it('opens the address in Apple Maps on iOS', async () => {
      const screen = await renderLoaded();
      fireEvent.press(screen.getByRole('link', { name: 'Open 123 Main St in Maps' }));
      await waitFor(() => {
        expect(openURL).toHaveBeenCalledWith('maps:?q=123%20Main%20St');
      });
    });

    it('falls back to Google Maps when no maps app opens', async () => {
      openURL.mockRejectedValueOnce(new Error('no handler'));
      const screen = await renderLoaded();
      fireEvent.press(screen.getByRole('link', { name: 'Open 123 Main St in Maps' }));
      await waitFor(() => {
        expect(openURL).toHaveBeenLastCalledWith(
          'https://www.google.com/maps/search/?api=1&query=123%20Main%20St'
        );
      });
    });

    it('says so when nothing on the device can open the link', async () => {
      openURL.mockRejectedValue(new Error('no handler'));
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const screen = await renderLoaded();
      fireEvent.press(screen.getByRole('link', { name: 'Call 555-1234' }));
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Couldn't open that",
          'No app on this device can open it.'
        );
      });
      alertSpy.mockRestore();
    });

    it('shows a value that makes no link as plain text', async () => {
      mockGetListingById.mockResolvedValue({
        data: { ...MOCK_LISTING, website_url: 'ftp://himalayan.com' },
      } as never);
      const screen = await renderLoaded();
      expect(screen.getByText('ftp://himalayan.com')).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Open ftp://himalayan.com' })).toBeNull();
    });

    it('shows a long address in full', async () => {
      const address = '4567 Very Long Boulevard Name, Building C, Suite 1200, Jackson Heights, NY 11372';
      mockGetListingById.mockResolvedValue({ data: { ...MOCK_LISTING, address } } as never);
      const screen = await renderLoaded();
      expect(screen.getByText(address).props.numberOfLines).toBeUndefined();
      expect(screen.getByText(address).props.selectable).toBe(true);
    });
  });

  it('renders owner info', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Asha Kumar')).toBeTruthy();
    });
    expect(screen.getByText('Posted by')).toBeTruthy();
  });

  // -- Seller card (4.6) -----------------------------------------------------

  it("opens the seller's profile from the seller card", async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Asha Kumar')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: "View Asha Kumar's profile" }));

    expect(mockNavigate).toHaveBeenCalledWith('PublicProfileView', { userId: 'user-2' });
  });

  it("shows the seller's trust level on the card", async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Asha Kumar')).toBeTruthy();
    });
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it("shows the seller's profile photo", async () => {
    const photo = 'https://cdn.example.com/avatars/user-2.jpg';
    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, owner: { ...MOCK_LISTING.owner, profile_photo: photo } },
    } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Asha Kumar')).toBeTruthy();
    });
    expect(screen.UNSAFE_getAllByType(Image).some((image) => image.props.source === photo)).toBe(true);
  });

  it('takes the owner to their own Profile tab from the seller card', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', { name: "View Asha Kumar's profile" }));

    expect(mockNavigate).toHaveBeenCalledWith('Profile');
    expect(mockNavigate).not.toHaveBeenCalledWith('PublicProfileView', expect.anything());
  });

  it('renders stats', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('10 views')).toBeTruthy();
    });
    expect(screen.getByText('3 saves')).toBeTruthy();
  });

  it('renders business hours in 12-hour time', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Hours')).toBeTruthy();
    });
    expect(screen.getByText('Monday')).toBeTruthy();
    expect(screen.getByText('9:00 AM – 5:00 PM')).toBeTruthy();
  });

  // -- Consistency (4.8) -----------------------------------------------------

  it('counts one view and one save in the singular', async () => {
    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, views_count: 1, saves_count: 1 },
    } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('1 view')).toBeTruthy();
    });
    expect(screen.getByText('1 save')).toBeTruthy();
  });

  it('saves with a heart, as the grid does', async () => {
    mockGetUserSavedListingIds.mockResolvedValue({ data: ['listing-1'] });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Unsave listing')).toBeTruthy();
    });
    expect(screen.UNSAFE_queryAllByProps({ name: 'heart' }).length).toBeGreaterThan(0);
    expect(screen.UNSAFE_queryAllByProps({ name: 'bookmark' })).toHaveLength(0);
    expect(screen.UNSAFE_queryAllByProps({ name: 'bookmark-outline' })).toHaveLength(0);
  });

  it("shares the listing's web page", async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Share listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Share listing'));

    expect(shareSpy).toHaveBeenCalledWith({
      message: 'Himalayan Kitchen',
      url: 'https://nepally.us/marketplace/listing/listing-1',
    });
    shareSpy.mockRestore();
  });

  it('offers Share to the owner too', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeTruthy();
    });
    expect(screen.getByLabelText('Share listing')).toBeTruthy();
  });

  it('renders category placeholder emoji when no photos', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('🍜')).toBeTruthy();
    });
  });

  // -- View count ------------------------------------------------------------

  it('increments views on mount', async () => {
    render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(incrementListingViews).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });
  });

  // -- Not found -------------------------------------------------------------

  it('shows "Listing not found" when listing is null', async () => {
    mockGetListingById.mockResolvedValue({ data: null } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Listing not found')).toBeTruthy();
    });
  });

  it('shows "Listing not found" when the listing is really gone', async () => {
    mockGetListingById.mockResolvedValue({
      error: new Error('Listing not found'),
      notFound: true,
    } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Listing not found')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('says the listing could not load, not that it is gone, and Try again reloads', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetListingById.mockResolvedValueOnce({
      error: new Error('Failed to fetch listing'),
    } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couldn't load this listing.")).toBeTruthy();
    });
    expect(screen.queryByText('Listing not found')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    jest.restoreAllMocks();
  });

  // -- Owner vs non-owner actions --------------------------------------------

  it('shows Contact button when user is not the owner', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeTruthy();
    });
  });

  // -- Contact Seller (4.2) --------------------------------------------------

  describe('Contact Seller', () => {
    const mockGetOrCreateConversation = getOrCreateConversation as jest.MockedFunction<
      typeof getOrCreateConversation
    >;

    afterEach(() => {
      mockGetOrCreateConversation.mockResolvedValue({ data: null } as never);
    });

    async function renderLoaded() {
      const screen = render(<ListingDetailScreen />);
      await waitFor(() => {
        expect(screen.getByText('Contact Seller')).toBeTruthy();
      });
      return screen;
    }

    it('opens the chat with a draft naming the listing', async () => {
      mockGetOrCreateConversation.mockResolvedValue({ data: { conversationId: 'conv-9' } } as never);
      const screen = await renderLoaded();

      fireEvent.press(screen.getByRole('button', { name: 'Contact Seller' }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Chat', {
          screen: 'MessageThread',
          params: {
            conversationId: 'conv-9',
            otherUserId: 'user-2',
            otherUserName: 'Asha Kumar',
            otherUserTrustLevel: 1,
            otherUserPhotoUrl: null,
            initialDraft: 'Hi, is “Himalayan Kitchen” still available?',
          },
        });
      });
      expect(incrementListingContacts).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    });

    it("doesn't count a contact when the conversation can't be started", async () => {
      mockGetOrCreateConversation.mockResolvedValue({ data: null } as never);
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const screen = await renderLoaded();

      fireEvent.press(screen.getByRole('button', { name: 'Contact Seller' }));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'Failed to start conversation. Please try again.'
        );
      });
      expect(incrementListingContacts).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('starts one conversation for a double tap and shows it is busy meanwhile', async () => {
      let finish: (value: unknown) => void = () => {};
      mockGetOrCreateConversation.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }) as never
      );
      const screen = await renderLoaded();
      const button = screen.getByRole('button', { name: 'Contact Seller' });

      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockGetOrCreateConversation).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Contact Seller' }).props.accessibilityState).toEqual(
        expect.objectContaining({ busy: true, disabled: true })
      );

      await act(async () => {
        finish({ data: { conversationId: 'conv-9' } });
      });
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Contact Seller' }).props.accessibilityState).toEqual(
        expect.objectContaining({ busy: false, disabled: false })
      );
    });
  });

  it('shows Edit Listing button when user is the owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeTruthy();
    });
  });

  it('does not offer Promote to the owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeTruthy();
    });
    expect(screen.queryByText('Promote')).toBeNull();
    expect(screen.queryByText('Promoted')).toBeNull();
  });

  it('does not show Edit button for non-owner', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeTruthy();
    });
    expect(screen.queryByText('Edit Listing')).toBeNull();
  });

  // -- Saved state -----------------------------------------------------------

  it('marks listing as saved when it appears in saved ids', async () => {
    mockGetUserSavedListingIds.mockResolvedValue({ data: ['listing-1'] });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.getByText('Contact Seller')).toBeTruthy();
  });

  it('saves the listing from the bottom bar', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Save listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Save listing'));

    await waitFor(() => {
      expect(screen.getByLabelText('Unsave listing')).toBeTruthy();
    });
    expect(saveListing).toHaveBeenCalledWith(expect.anything(), 'listing-1');
  });

  // -- Report ----------------------------------------------------------------

  it('does not fire report alert on initial render', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('files a listing report through createReport', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Report listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Report listing'));
    expect(screen.getByText('Report Listing')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Reason Scam'));
    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => {
      expect(createReport).toHaveBeenCalledWith(expect.anything(), {
        reported_by: 'user-1',
        target_type: 'listing',
        target_id: 'listing-1',
        reason: 'Scam',
        description: undefined,
      });
    });
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Listing Reported',
        'Thank you. Our moderation team will review this listing.'
      );
    });
    alertSpy.mockRestore();
  });

  it('keeps the sheet open and shows the error when the report fails', async () => {
    (createReport as jest.Mock).mockResolvedValueOnce({
      error: new Error('You already reported this.'),
    });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Report listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Report listing'));
    fireEvent.press(screen.getByLabelText('Reason Spam'));
    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'You already reported this.');
    });
    expect(screen.getByText('Report Listing')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('asks an unverified member to verify instead of opening the sheet', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', full_name: 'New User', trust_level: 0, metro_area_id: 'metro-1' },
    });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Report listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Report listing'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Verify to Report',
      'Please verify your account to report listings.'
    );
    expect(screen.queryByText('Report Listing')).toBeNull();
    alertSpy.mockRestore();
  });

  it('does not offer the report button to the owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Report listing')).toBeNull();
  });

  // -- No user ---------------------------------------------------------------

  it('renders without crashing when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
  });

  it('asks a signed-out visitor to sign in instead of opening the report sheet', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const alertSpy = jest.spyOn(Alert, 'alert');
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Report listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Report listing'));

    expect(alertSpy).toHaveBeenCalledWith('Sign In Required', 'Please sign in to report listings.');
    expect(screen.queryByText('Report Listing')).toBeNull();
    expect(createReport).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  // -- Individual listing type -----------------------------------------------

  it('does not render business details for individual listings', async () => {
    mockGetListingById.mockResolvedValue({
      data: {
        ...MOCK_LISTING,
        listing_type: 'individual' as const,
        business_hours: null,
        business_name: null,
      },
    } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.queryByText('Business Details')).toBeNull();
  });

  // -- Split View enhancement (2026-04-13) -----------------------------------

  it('renders breadcrumb with category name', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Marketplace')).toBeTruthy();
    });
  });

  it('renders highlight chip value', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getAllByText('555-1234').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Refreshed today" for a listing refreshed moments ago', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refreshed today')).toBeTruthy();
    });
  });

  it('shows whole days since the listing was refreshed', async () => {
    mockGetListingById.mockResolvedValue({
      data: { ...MOCK_LISTING, refreshed_at: new Date(Date.now() - 3 * DAY_MS).toISOString() },
    } as never);
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Refreshed 3d ago')).toBeTruthy();
    });
  });

  it('renders sticky bottom bar with Contact Seller for non-owner', async () => {
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Contact Seller')).toBeTruthy();
    });
  });

  it('hides sticky bottom bar for owner', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, metro_area_id: 'metro-1' },
    });
    const screen = render(<ListingDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Himalayan Kitchen')).toBeTruthy();
    });
    expect(screen.queryByText('Contact Seller')).toBeNull();
  });
});
