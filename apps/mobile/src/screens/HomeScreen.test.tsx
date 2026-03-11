import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('../config/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'user-1',
      full_name: 'Test User',
      trust_level: 1,
      is_premium: false,
      metro_area_id: '35620',
      zip_code: '10001',
    },
  })),
}));

jest.mock('../hooks/useLocation', () => ({
  useLocation: jest.fn(() => ({
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
  })),
}));

jest.mock('@nusa/shared', () => ({
  getPostsByMetroArea: jest.fn().mockResolvedValue({ data: [], error: null }),
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
jest.mock('../components/filters/TagFilterBar', () => ({
  TagFilterBar: () => null,
}));
jest.mock('../components/sheets/PostMoreSheet', () => ({
  PostMoreSheet: () => null,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';

const mockNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: jest.fn() }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: mockGetParent,
  }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactActual = jest.requireActual('react') as typeof import('react');
    ReactActual.useEffect(() => cb(), [cb]);
  },
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<HomeScreen />);
    expect(toJSON()).not.toBeNull();
  });
});
