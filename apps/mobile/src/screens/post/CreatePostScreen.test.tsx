jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock('../../hooks/useAuth', () => ({
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

jest.mock('../../hooks/useLocation', () => ({
  useLocation: jest.fn(() => ({
    activeLocation: {
      metro_area_id: '35620',
      metro_name: 'New York',
      metro_state: 'NY',
      source: 'saved',
      is_temporary: false,
    },
  })),
}));

jest.mock('@nusa/shared', () => ({
  getTags: jest.fn().mockResolvedValue({ data: [], error: null }),
  getPostById: jest.fn().mockResolvedValue({ data: null, error: null }),
  createPost: jest.fn().mockResolvedValue({ data: null, error: null }),
  updatePost: jest.fn().mockResolvedValue({ data: null, error: null }),
  deletePostPhotos: jest.fn().mockResolvedValue({ error: null }),
  getPostPhotoPathFromUrl: jest.fn().mockReturnValue(''),
  uploadPostPhotos: jest.fn().mockResolvedValue({ urls: [], paths: [], error: null }),
  MAX_POST_PHOTO_BYTES: 5 * 1024 * 1024,
  TAG_EMOJI: {},
  TAG_COLORS: {},
  DEFAULT_TAG_COLOR: '#E0E0E0',
  MAX_TAGS_PER_POST: 3,
  MAX_PHOTOS_PER_POST: 4,
}));

jest.mock('../../utils/storage', () => ({
  loadPostDraft: jest.fn().mockResolvedValue(null),
  savePostDraft: jest.fn().mockResolvedValue(undefined),
  clearPostDraft: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  EncodingType: { Base64: 'base64' },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import CreatePostScreen from './CreatePostScreen';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};
const mockRoute = { params: {} };

jest.mock('@react-navigation/native-stack', () => ({
  NativeStackScreenProps: {},
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

describe('CreatePostScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(
      <CreatePostScreen
        navigation={mockNavigation as any}
        route={mockRoute as any}
      />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('does not crash when checking for drafts on mount', async () => {
    const { loadPostDraft } = require('../../utils/storage');
    loadPostDraft.mockResolvedValue(null);

    const { toJSON } = render(
      <CreatePostScreen
        navigation={mockNavigation as any}
        route={mockRoute as any}
      />
    );
    expect(toJSON()).not.toBeNull();
  });
});
