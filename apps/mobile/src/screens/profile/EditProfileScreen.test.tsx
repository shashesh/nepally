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
  setProfilePhoto: jest.fn().mockResolvedValue({ url: 'https://example.com/user-1.jpg' }),
  removeProfilePhoto: jest.fn().mockResolvedValue({ error: undefined }),
  PROFILE_PHOTO_SIZE_PX: jest.requireActual('@nepally/shared').PROFILE_PHOTO_SIZE_PX,
  FULL_NAME_MAX_LENGTH: jest.requireActual('@nepally/shared').FULL_NAME_MAX_LENGTH,
  fullNameSchema: jest.requireActual('@nepally/shared').fullNameSchema,
  userMessage: jest.requireActual('@nepally/shared').userMessage,
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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  FULL_NAME_MAX_LENGTH,
  PROFILE_PHOTO_SIZE_PX,
  removeProfilePhoto,
  setProfilePhoto,
  updateUserProfile,
} from '@nepally/shared';

const mockedUpdateUserProfile =
  updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;
const mockedRemoveProfilePhoto =
  removeProfilePhoto as jest.MockedFunction<typeof removeProfilePhoto>;
const mockedSetProfilePhoto =
  setProfilePhoto as jest.MockedFunction<typeof setProfilePhoto>;
const mockedRequestLibraryPermission =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockedLaunchImageLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockedManipulateAsync = ImageManipulator.manipulateAsync as jest.Mock;

const RLS_MESSAGE = 'new row violates row-level security policy for table "users"';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/** Every string passed to Alert.alert so far, title and message alike. */
function alertTexts(): string[] {
  return (Alert.alert as jest.Mock).mock.calls.flatMap((call: unknown[]) =>
    call.filter((arg): arg is string => typeof arg === 'string')
  );
}

/** Presses the named option of the "Profile Photo" action sheet. */
async function pressPhotoOption(getByText: ReturnType<typeof render>['getByText'], option: string) {
  fireEvent.press(getByText('Change Photo'));
  const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
  const button = alertArgs[2].find((btn: { text: string }) => btn.text === option);
  expect(button).toBeDefined();
  await act(async () => {
    await button.onPress();
  });
}

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
    // userMessage logs the raw error through logClientEvent (console.error).
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({ user: baseUser, refreshUser: mockRefreshUser });
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
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

  it('shows our sentence, not the raw error, and does not refresh the user when removeProfilePhoto fails', async () => {
    mockedRemoveProfilePhoto.mockResolvedValueOnce({ error: new Error(RLS_MESSAGE) });
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, profile_photo: 'https://example.com/photo.jpg' },
      refreshUser: mockRefreshUser,
    });

    const { getByText, queryByText } = render(<EditProfileScreen />);
    await pressPhotoOption(getByText, 'Remove Photo');

    expect(getByText("Couldn't remove your photo. Please try again.")).toBeTruthy();
    expect(queryByText(RLS_MESSAGE)).toBeNull();
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('uploads a new photo through setProfilePhoto at PROFILE_PHOTO_SIZE_PX', async () => {
    mockedRequestLibraryPermission.mockResolvedValueOnce({ granted: true });
    mockedLaunchImageLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg' }],
    });
    mockedManipulateAsync.mockResolvedValueOnce({ uri: 'file:///resized.jpg' });
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, profile_photo: 'https://example.com/photo.jpg' },
      refreshUser: mockRefreshUser,
    });

    const { getByText } = render(<EditProfileScreen />);
    await pressPhotoOption(getByText, 'Choose from Library');

    expect(mockedManipulateAsync).toHaveBeenCalledWith(
      'file:///picked.jpg',
      [{ resize: { width: PROFILE_PHOTO_SIZE_PX, height: PROFILE_PHOTO_SIZE_PX } }],
      expect.anything()
    );
    expect(mockedSetProfilePhoto).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.any(ArrayBuffer)
    );
    expect(mockedUpdateUserProfile).not.toHaveBeenCalled();
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(getByText('Photo updated')).toBeTruthy();
  });

  it('shows our sentence, not the raw error, when setProfilePhoto fails', async () => {
    mockedRequestLibraryPermission.mockResolvedValueOnce({ granted: true });
    mockedLaunchImageLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg' }],
    });
    mockedSetProfilePhoto.mockResolvedValueOnce({ error: new Error(RLS_MESSAGE) });
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, profile_photo: 'https://example.com/photo.jpg' },
      refreshUser: mockRefreshUser,
    });

    const { getByText, queryByText } = render(<EditProfileScreen />);
    await pressPhotoOption(getByText, 'Choose from Library');

    expect(getByText("Couldn't update your photo. Please try again.")).toBeTruthy();
    expect(queryByText(RLS_MESSAGE)).toBeNull();
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('caps the name input at FULL_NAME_MAX_LENGTH', () => {
    const { getByPlaceholderText } = render(<EditProfileScreen />);
    expect(getByPlaceholderText('Your full name').props.maxLength).toBe(FULL_NAME_MAX_LENGTH);
  });

  it("shows the schema's error and does not save a name that normalises to one character", () => {
    const { getByPlaceholderText, getByText } = render(<EditProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Your full name'), ' ‮A​ ');
    fireEvent.press(getByText('Save Changes'));

    expect(getByText('Name must be at least 2 characters')).toBeTruthy();
    expect(mockedUpdateUserProfile).not.toHaveBeenCalled();
  });

  it('saves the parsed name, not the raw input', async () => {
    const { getByPlaceholderText, getByText } = render(<EditProfileScreen />);

    fireEvent.changeText(getByPlaceholderText('Your full name'), '  Bikal ‮  Shrestha  ');
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(mockedUpdateUserProfile).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        expect.objectContaining({ full_name: 'Bikal Shrestha' })
      );
    });
  });

  it('saves a cleared phone as null so the column clears', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, phone: '555-0100' },
      refreshUser: mockRefreshUser,
    });

    const { getByDisplayValue, getByText } = render(<EditProfileScreen />);

    fireEvent.changeText(getByDisplayValue('555-0100'), '   ');
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(mockedUpdateUserProfile).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        expect.objectContaining({ phone: null })
      );
    });
  });

  it('never shows a raw RLS message when the profile save fails', async () => {
    mockedUpdateUserProfile.mockResolvedValueOnce({ error: new Error(RLS_MESSAGE) });

    const { getByText } = render(<EditProfileScreen />);
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        "Couldn't update your profile. Please try again."
      );
    });
    expect(alertTexts().some((text) => text.includes('row-level security'))).toBe(false);
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });
});
