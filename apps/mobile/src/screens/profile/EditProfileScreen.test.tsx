import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
      })),
    },
  },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'user-1',
      full_name: 'Test User',
      email: 'test@nusa.com',
      trust_level: 1,
      is_premium: false,
    },
    refreshUser: jest.fn(),
  })),
}));

jest.mock('../../hooks/useMetroArea', () => ({
  useMetroArea: jest.fn(() => ({
    fetchMetroByZip: jest.fn().mockResolvedValue(null),
    updateLocation: jest.fn().mockResolvedValue(undefined),
    loading: false,
  })),
}));

jest.mock('@nusa/shared', () => ({
  updateUserProfile: jest.fn().mockResolvedValue({ data: null, error: null }),
  uploadProfilePhoto: jest.fn().mockResolvedValue({ data: null, error: null }),
  deleteProfilePhoto: jest.fn().mockResolvedValue({ data: null, error: null }),
  APP_CONFIG: {
    minPasswordLength: 8,
    zipCodeLength: 5,
    maxLocations: 5,
  },
}));

jest.mock('../../utils/storage', () => ({
  saveMetroArea: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: '' }),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    constructor() {}
    async bytes() { return new Uint8Array(); }
  },
}));

jest.mock('../../components/Avatar', () => ({
  Avatar: () => null,
}));
jest.mock('../../components/buttons/PrimaryButton', () => ({
  PrimaryButton: () => null,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { EditProfileScreen } from './EditProfileScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<EditProfileScreen />);
    expect(toJSON()).not.toBeNull();
  });

  it('displays user full name', () => {
    const { getByDisplayValue } = render(<EditProfileScreen />);
    expect(getByDisplayValue('Test User')).toBeTruthy();
  });
});
