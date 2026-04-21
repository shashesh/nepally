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

jest.mock('@nepally/shared', () => ({
  updateUserProfile: jest.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
  uploadProfilePhoto: jest.fn().mockResolvedValue({ data: null, error: null }),
  deleteProfilePhoto: jest.fn().mockResolvedValue({ data: null, error: null }),
  APP_CONFIG: {
    minPasswordLength: 8,
    zipCodeLength: 5,
    maxLocations: 5,
  },
  BIO_MAX_LENGTH: 160,
  bioSchema: {
    safeParse: (val: string) => ({ success: true, data: val }),
  },
  NEPAL_DISTRICTS: ['Kathmandu', 'Pokhara', 'Lalitpur'],
  SUPPORTED_LANGUAGES: ['nepali', 'english', 'newari'],
  LANGUAGE_LABELS: { nepali: 'Nepali', english: 'English', newari: 'Newari' },
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
jest.mock('../../components/buttons/PrimaryButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory is hoisted above ESM imports
  const { TouchableOpacity, Text } = require('react-native');
  return {
    PrimaryButton: ({ title, onPress }: { title: string; onPress: () => void }) => (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { EditProfileScreen } from './EditProfileScreen';
import { useAuth } from '../../hooks/useAuth';
import { updateUserProfile } from '@nepally/shared';

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUpdateUserProfile =
  updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;

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

  it('renders the About You section with the initial values', async () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        full_name: 'Test User',
        email: 'test@nusa.com',
        trust_level: 1,
        is_premium: false,
        hometown_district: 'Kathmandu',
        college: 'Pulchowk',
        years_in_us: 5,
        languages: ['nepali'],
      },
      refreshUser: jest.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    const { findByText, getByTestId } = render(<EditProfileScreen />);
    await act(async () => {});
    expect(await findByText('About You')).toBeTruthy();
    expect(getByTestId('about-college-input').props.value).toBe('Pulchowk');
    expect(getByTestId('about-years-input').props.value).toBe('5');
  });

  it('propagates About You changes into updateUserProfile', async () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        full_name: 'Test User',
        email: 'test@nusa.com',
        trust_level: 1,
        is_premium: false,
        hometown_district: null,
        college: null,
        years_in_us: null,
        languages: [],
      },
      refreshUser: jest.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    const { getByTestId, getByText } = render(<EditProfileScreen />);
    await act(async () => {});
    await act(async () => {
      fireEvent.changeText(getByTestId('about-college-input'), 'TU Kirtipur');
    });
    await act(async () => {
      fireEvent.press(getByText('Save Changes'));
    });
    expect(mockedUpdateUserProfile).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ college: 'TU Kirtipur' })
    );
  });
});
