import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockSignInWithGoogle = jest.fn();

jest.mock('../../services/auth/googleAuth', () => ({
  signInWithGoogle: (...args: Parameters<typeof mockSignInWithGoogle>) => mockSignInWithGoogle(...args),
}));

const mockCreateUserProfile = jest.fn();
const mockMarkGoogleVerified = jest.fn();

jest.mock('@nusa/shared', () => ({
  createUserProfile: (...args: Parameters<typeof mockCreateUserProfile>) => mockCreateUserProfile(...args),
  markGoogleVerified: (...args: Parameters<typeof mockMarkGoogleVerified>) => mockMarkGoogleVerified(...args),
}));

const mockFrom = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: (...args: Parameters<typeof mockFrom>) => mockFrom(...args),
  },
}));

const mockRefreshUser = jest.fn();

jest.mock('../../contexts/AuthContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    AuthContext: React.createContext({}),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../components/buttons/TextButton', () => ({
  TextButton: ({ title, onPress }: { title: string; onPress: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="text-button" onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignupMethodScreen } from './SignupMethodScreen';
import { AuthContext } from '../../contexts/AuthContext';

function renderScreen() {
  return render(
    <AuthContext.Provider value={{ refreshUser: mockRefreshUser } as unknown as React.ContextType<typeof AuthContext>}>
      <SignupMethodScreen />
    </AuthContext.Provider>
  );
}

describe('SignupMethodScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshUser.mockResolvedValue(undefined);
    mockCreateUserProfile.mockResolvedValue({ data: { id: 'user-1' }, error: null });
    mockMarkGoogleVerified.mockResolvedValue({ data: { id: 'user-1' }, error: null });
  });

  it('renders all three signup options without Coming Soon text', () => {
    const { getByText, queryByText } = renderScreen();

    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue with Phone')).toBeTruthy();
    expect(getByText('Continue with Email')).toBeTruthy();
    expect(queryByText('Coming soon')).toBeNull();
    expect(getByText('Quick and secure')).toBeTruthy();
    expect(getByText('Verify via SMS code')).toBeTruthy();
  });

  it('navigates to PhoneEntry when Phone option is pressed', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Continue with Phone'));

    expect(mockNavigate).toHaveBeenCalledWith('PhoneEntry');
  });

  it('navigates to EmailSignup when Email option is pressed', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Continue with Email'));

    expect(mockNavigate).toHaveBeenCalledWith('EmailSignup', { mode: 'signup' });
  });

  it('navigates to EmailSignup login mode when Log In is pressed', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Log In'));

    expect(mockNavigate).toHaveBeenCalledWith('EmailSignup', { mode: 'login' });
  });

  it('calls signInWithGoogle and navigates to LocationPermission on success', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@google.com', full_name: 'Google User' },
    });

    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { metro_area_id: null }, error: null }),
    };
    mockFrom.mockReturnValue(query);

    const { getByText } = renderScreen();

    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(mockCreateUserProfile).toHaveBeenCalled();
      expect(mockMarkGoogleVerified).toHaveBeenCalledWith(expect.anything(), 'user-1');
      expect(mockNavigate).toHaveBeenCalledWith('LocationPermission', { userId: 'user-1' });
    });
  });

  it('does not navigate when Google sign-in is cancelled', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce({
      error: new Error('Google sign-in was cancelled'),
    });

    const { getByText } = renderScreen();

    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('skips LocationPermission for returning Google user with metro', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@google.com', full_name: 'Google User' },
    });

    // Returning user with metro already set
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { metro_area_id: 'metro-1' }, error: null }),
    };
    mockFrom.mockReturnValue(query);

    const { getByText } = renderScreen();

    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(mockRefreshUser).toHaveBeenCalled();
    });

    // Should NOT navigate to LocationPermission since user already has metro
    expect(mockNavigate).not.toHaveBeenCalledWith('LocationPermission', expect.anything());
  });
});
