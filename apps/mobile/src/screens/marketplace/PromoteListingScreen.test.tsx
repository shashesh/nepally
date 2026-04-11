import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { getListingById, getPromotionById } from '@nepally/shared';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MarketplaceStackParamList } from '../../types/navigation';
import PromoteListingScreen from './PromoteListingScreen';

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

// Create properly typed mock route and navigation
type PromoteListingScreenProps = NativeStackScreenProps<
  MarketplaceStackParamList,
  'PromoteListing'
>;

const createMockRoute = (
  listingId: string
): PromoteListingScreenProps['route'] => ({
  key: 'PromoteListing',
  name: 'PromoteListing',
  params: { listingId },
});

const createMockNavigation = (): PromoteListingScreenProps['navigation'] => {
  const mockGetParent = jest.fn(() => undefined);
  const navigation = {
    goBack: mockGoBack,
    navigate: mockNavigate,
    dispatch: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dangerouslyGetState: jest.fn(
      () => ({
        routes: [],
        index: 0,
        key: 'root',
        routeNames: ['PromoteListing'],
        type: 'stack',
        stale: false,
      })
    ),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    getParent: mockGetParent,
    getState: jest.fn(
      () => ({
        routes: [],
        index: 0,
        key: 'root',
        routeNames: ['PromoteListing'],
        type: 'stack',
        stale: false,
      })
    ),
    addListener: jest.fn(() => jest.fn()),
  };

  return navigation as unknown as PromoteListingScreenProps['navigation'];
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { listingId: 'listing-1' },
  }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', trust_level: 1, metro_area_id: 'metro-1' },
  }),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { supabaseUrl: 'https://test.supabase.co' } },
}));

jest.mock('@nepally/shared', () => {
  const actual = jest.requireActual('@nepally/shared');
  return {
    ...actual,
    getListingById: jest.fn(),
    createPromotionCheckout: jest.fn(),
    getPromotionById: jest.fn(),
  };
});

const mockGetListingById = getListingById as jest.MockedFunction<typeof getListingById>;
const mockGetPromotionById = getPromotionById as jest.MockedFunction<typeof getPromotionById>;

const MOCK_LISTING = {
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
  trending_score: 10,
  views_count: 5,
  saves_count: 2,
  contacts_count: 1,
  refreshed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetListingById.mockResolvedValue({ data: MOCK_LISTING });
  mockGetPromotionById.mockResolvedValue({
    data: {
      id: 'promo-1',
      listing_id: 'listing-1',
      user_id: 'user-1',
      promotion_type: 'featured_listing',
      status: 'active',
      duration_days: 7,
      daily_cost_cents: 199,
      total_cost_cents: 1393,
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: null,
      views_at_start: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
});

describe('PromoteListingScreen', () => {
  it('renders step 1 with 3 tier cards', async () => {
    const screen = render(<PromoteListingScreen route={createMockRoute('listing-1')} navigation={createMockNavigation()} />);

    await waitFor(() => {
      expect(screen.getByText('Choose Promotion Type')).toBeTruthy();
    });

    expect(screen.getByTestId('tier-featured_listing')).toBeTruthy();
    expect(screen.getByTestId('tier-sponsored_feed')).toBeTruthy();
    expect(screen.getByTestId('tier-sticky_business')).toBeTruthy();
  });

  it('continue button is disabled until a tier is selected', async () => {
    const screen = render(<PromoteListingScreen route={createMockRoute('listing-1')} navigation={createMockNavigation()} />);

    await waitFor(() => {
      expect(screen.getByTestId('continue-button')).toBeTruthy();
    });

    const continueButton = screen.getByTestId('continue-button');
    expect(continueButton.props.accessibilityState?.disabled ?? continueButton.props.disabled).toBeTruthy();
  });

  it('selecting a tier enables continue button', async () => {
    const screen = render(<PromoteListingScreen route={createMockRoute('listing-1')} navigation={createMockNavigation()} />);

    await waitFor(() => {
      expect(screen.getByTestId('tier-featured_listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('tier-featured_listing'));

    const continueButton = screen.getByTestId('continue-button');
    expect(continueButton.props.accessibilityState?.disabled ?? continueButton.props.disabled).toBeFalsy();
  });

  it('navigates to step 2 with correct total cost', async () => {
    const screen = render(<PromoteListingScreen route={createMockRoute('listing-1')} navigation={createMockNavigation()} />);

    await waitFor(() => {
      expect(screen.getByTestId('tier-featured_listing')).toBeTruthy();
    });

    // Select tier
    fireEvent.press(screen.getByTestId('tier-featured_listing'));
    fireEvent.press(screen.getByTestId('continue-button'));

    // Step 2
    await waitFor(() => {
      expect(screen.getByText('Set Duration')).toBeTruthy();
    });

    // Default 7 days at $1.99/day = $13.93
    expect(screen.getByTestId('total-cost').props.children).toBe('$13.93');
  });

  it('back button returns to previous step', async () => {
    const screen = render(<PromoteListingScreen route={createMockRoute('listing-1')} navigation={createMockNavigation()} />);

    await waitFor(() => {
      expect(screen.getByTestId('tier-sponsored_feed')).toBeTruthy();
    });

    // Go to step 2
    fireEvent.press(screen.getByTestId('tier-sponsored_feed'));
    fireEvent.press(screen.getByTestId('continue-button'));

    await waitFor(() => {
      expect(screen.getByText('Set Duration')).toBeTruthy();
    });

    // Press back
    fireEvent.press(screen.getByTestId('back-button'));

    await waitFor(() => {
      expect(screen.getByText('Choose Promotion Type')).toBeTruthy();
    });
  });

  it('step 3 shows review summary', async () => {
    const screen = render(<PromoteListingScreen route={createMockRoute('listing-1')} navigation={createMockNavigation()} />);

    await waitFor(() => {
      expect(screen.getByTestId('tier-featured_listing')).toBeTruthy();
    });

    // Step 1 -> 2
    fireEvent.press(screen.getByTestId('tier-featured_listing'));
    fireEvent.press(screen.getByTestId('continue-button'));

    await waitFor(() => {
      expect(screen.getByText('Set Duration')).toBeTruthy();
    });

    // Step 2 -> 3
    fireEvent.press(screen.getByTestId('continue-button'));

    await waitFor(() => {
      expect(screen.getByText('Review & Pay')).toBeTruthy();
    });

    expect(screen.getByText('Featured Listing')).toBeTruthy();
    expect(screen.getByTestId('pay-button')).toBeTruthy();
  });
});
