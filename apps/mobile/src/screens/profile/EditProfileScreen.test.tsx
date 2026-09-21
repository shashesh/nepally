import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// ---------------------------------------------------------------------------
// Module-scoped mocks — mirrors PublicProfileScreen.test.tsx pattern, which
// is stable on Ubuntu CI runners. Factory-scoped `jest.fn(() => ...)` + mid-
// test `mockReturnValue` calls proved flaky on CI: React 19's act() scope
// occasionally entered a flush loop that never converged and timed out at 30s.
// ---------------------------------------------------------------------------
const mockUseAuth = jest.fn();
const mockRefreshUser = jest.fn();

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
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../hooks/useMetroArea', () => ({
  useMetroArea: () => ({
    fetchMetroByZip: jest.fn().mockResolvedValue(null),
    updateLocation: jest.fn().mockResolvedValue(undefined),
    loading: false,
  }),
}));

jest.mock('@nepally/shared', () => ({
  updateUserProfile: jest.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
  uploadProfilePhoto: jest.fn().mockResolvedValue({ data: null, error: null }),
  removeProfilePhoto: jest.fn().mockResolvedValue({ error: undefined }),
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
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: '' }),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    constructor() {}
    async bytes() { return new Uint8Array(); }
    async arrayBuffer() { return new ArrayBuffer(0); }
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { EditProfileScreen } from './EditProfileScreen';
import { removeProfilePhoto, updateUserProfile } from '@nepally/shared';

const mockedUpdateUserProfile =
  updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;
const mockedRemoveProfilePhoto =
  removeProfilePhoto as jest.MockedFunction<typeof removeProfilePhoto>;

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const baseUser = {
  id: 'user-1',
  full_name: 'Test User',
  email: 'test@nusa.com',
  trust_level: 1,
  is_premium: false,
};

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: baseUser, refreshUser: mockRefreshUser });
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<EditProfileScreen />);
    expect(toJSON()).not.toBeNull();
  });

  it('displays user full name', () => {
    const { getByDisplayValue } = render(<EditProfileScreen />);
    expect(getByDisplayValue('Test User')).toBeTruthy();
  });

  it('renders the About You section with the initial values', () => {
    // EditProfileScreen has no async useEffect — initial render is fully
    // synchronous, so sync queries are correct here. `findByText`/`waitFor`
    // was previously timing out on Ubuntu CI due to polling interacting with
    // React 19's act() scope (see apps/mobile/CLAUDE.md rule #6 context).
    mockUseAuth.mockReturnValue({
      user: {
        ...baseUser,
        hometown_district: 'Kathmandu',
        college: 'Pulchowk',
        years_in_us: 5,
        languages: ['nepali'],
      },
      refreshUser: mockRefreshUser,
    });

    const { getByText, getByTestId } = render(<EditProfileScreen />);

    expect(getByText('About You')).toBeTruthy();
    expect(getByTestId('about-college-input').props.value).toBe('Pulchowk');
    expect(getByTestId('about-years-input').props.value).toBe('5');
  });

  it('propagates About You changes into updateUserProfile', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        ...baseUser,
        hometown_district: null,
        college: null,
        years_in_us: null,
        languages: [],
      },
      refreshUser: mockRefreshUser,
    });

    const { getByTestId, getByText } = render(<EditProfileScreen />);

    fireEvent.changeText(getByTestId('about-college-input'), 'TU Kirtipur');
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(mockedUpdateUserProfile).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        expect.objectContaining({ college: 'TU Kirtipur' })
      );
    });
  });

  it('removes the photo via removeProfilePhoto and shows "Photo removed"', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, profile_photo: 'https://example.com/photo.jpg' },
      refreshUser: mockRefreshUser,
    });

    const { getByText } = render(<EditProfileScreen />);
    fireEvent.press(getByText('Change Photo'));

    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = alertArgs[2].find(
      (btn: { text: string }) => btn.text === 'Remove Photo'
    );
    expect(removeButton).toBeDefined();

    await act(async () => {
      await removeButton.onPress();
    });

    expect(mockedRemoveProfilePhoto).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(getByText('Photo removed')).toBeTruthy();
  });

  it('shows the error and does not refresh the user when removeProfilePhoto fails', async () => {
    mockedRemoveProfilePhoto.mockResolvedValueOnce({ error: new Error('RLS denied') });
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, profile_photo: 'https://example.com/photo.jpg' },
      refreshUser: mockRefreshUser,
    });

    const { getByText } = render(<EditProfileScreen />);
    fireEvent.press(getByText('Change Photo'));

    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = alertArgs[2].find(
      (btn: { text: string }) => btn.text === 'Remove Photo'
    );
    expect(removeButton).toBeDefined();

    await act(async () => {
      await removeButton.onPress();
    });

    expect(getByText('RLS denied')).toBeTruthy();
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });
});
