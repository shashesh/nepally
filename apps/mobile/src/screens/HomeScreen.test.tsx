import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockInsertHandlerRef: { current: ((payload: { new: { author_id?: string } }) => void) | null } = { current: null };
const mockGetPostsByMetroArea = jest.fn().mockResolvedValue({ data: [], error: null });
const mockUseLocation = jest.fn();
const mockUseAuth = jest.fn();
const mockNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: jest.fn() }));

jest.mock('../config/supabase', () => ({
  supabase: {
    channel: jest.fn(() => {
      const channelObj = {
        on: (_eventType: string, _filter: unknown, cb: (payload: { new: { author_id?: string } }) => void) => {
          mockInsertHandlerRef.current = cb;
          return channelObj;
        },
        subscribe: () => channelObj,
      };
      return channelObj;
    }),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../hooks/useLocation', () => ({
  useLocation: () => mockUseLocation(),
}));

jest.mock('@nusa/shared', () => ({
  getPostsByMetroArea: (...args: unknown[]) => mockGetPostsByMetroArea(...args),
  getTags: jest.fn().mockResolvedValue({ data: [], error: null }),
  getUserLikedPostIds: jest.fn().mockResolvedValue({ data: [], error: null }),
  getUserSavedPostIds: jest.fn().mockResolvedValue({ data: [], error: null }),
  getTotalUnreadCount: jest.fn().mockResolvedValue({ count: 0 }),
  getUnreadNotificationCount: jest.fn().mockResolvedValue({ count: 0 }),
  likePost: jest.fn().mockResolvedValue({ error: null }),
  unlikePost: jest.fn().mockResolvedValue({ error: null }),
  deletePost: jest.fn().mockResolvedValue({ error: null }),
  getOrCreateConversation: jest.fn().mockResolvedValue({ data: null, error: null }),
  savePost: jest.fn().mockResolvedValue({ error: null }),
  unsavePost: jest.fn().mockResolvedValue({ error: null }),
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
}));

jest.mock('../utils/storage', () => ({
  isBannerDismissed: jest.fn().mockResolvedValue(false),
  saveBannerDismissed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../components/banners/Level0Banner', () => ({
  Level0Banner: () => null,
}));
jest.mock('../components/banners/LocationPermissionBanner', () => ({
  LocationPermissionBanner: () => null,
}));
jest.mock('../components/location/LocationChangeSheet', () => ({
  LocationChangeSheet: () => null,
}));
jest.mock('../components/location/LocationSwitcherSheet', () => ({
  LocationSwitcherSheet: () => null,
}));
jest.mock('../components/cards/PostCard', () => ({
  PostCard: () => null,
}));
jest.mock('../components/cards/SkeletonPostCard', () => ({
  SkeletonPostCard: () => null,
}));
jest.mock('../components/filters/TagFilterBar', () => ({
  TagFilterBar: () => null,
}));
jest.mock('../components/sheets/PostMoreSheet', () => ({
  PostMoreSheet: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: mockGetParent,
  }),
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

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsertHandlerRef.current = null;
    mockGetPostsByMetroArea.mockResolvedValue({ data: [], error: null });
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        full_name: 'Test User',
        trust_level: 1,
        is_premium: false,
        metro_area_id: '35620',
        zip_code: '10001',
      },
    });
    mockUseLocation.mockReturnValue({
      activeLocation: {
        metro_area_id: '35620',
        metro_name: 'New York-Newark-Jersey City',
        metro_state: 'NY',
        source: 'saved',
        is_temporary: false,
      },
      detectedLocation: null,
      savedLocations: [],
      showChangePrompt: false,
      browseMetro: jest.fn(),
      updateMetroPermanent: jest.fn(),
      snoozeMetro: jest.fn(),
      dismissChangePrompt: jest.fn(),
      setManualOverride: jest.fn(),
    });
  });

  it('renders without crashing', async () => {
    const { toJSON } = render(<HomeScreen />);
    await act(async () => {});
    expect(toJSON()).not.toBeNull();
  });

  it('shows no-location empty state when metro is unavailable', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        full_name: 'Test User',
        trust_level: 1,
        is_premium: false,
        metro_area_id: null,
        zip_code: '10001',
      },
    });
    mockUseLocation.mockReturnValue({
      activeLocation: null,
      detectedLocation: null,
      savedLocations: [],
      showChangePrompt: false,
      browseMetro: jest.fn(),
      updateMetroPermanent: jest.fn(),
      snoozeMetro: jest.fn(),
      dismissChangePrompt: jest.fn(),
      setManualOverride: jest.fn(),
    });

    const screen = render(<HomeScreen />);
    await act(async () => {});
    expect(screen.getByText('No location set')).toBeTruthy();
  });

  it('shows create-first-post CTA and navigates', async () => {
    const screen = render(<HomeScreen />);
    await act(async () => {});
    expect(screen.getByText('Be the first to post')).toBeTruthy();

    fireEvent.press(screen.getByText('Create first post'));
    expect(mockNavigate).toHaveBeenCalledWith('Post', { screen: 'CreatePost' });
  });

  it('shows new posts pill for realtime posts from other users', async () => {
    const screen = render(<HomeScreen />);
    await waitFor(() => {
      expect(mockInsertHandlerRef.current).toBeTruthy();
    });

    await act(async () => {
      mockInsertHandlerRef.current?.({ new: { author_id: 'another-user' } });
    });

    expect(screen.getByText('↑ 1 new post')).toBeTruthy();
  });
});
