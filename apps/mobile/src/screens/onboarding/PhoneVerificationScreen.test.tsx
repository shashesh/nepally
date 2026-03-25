import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockGetUser = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: Parameters<typeof mockGetUser>) => mockGetUser(...args),
    },
  },
}));

const mockSendPhoneOTP = jest.fn();
const mockVerifyPhoneOTP = jest.fn();

jest.mock('../../services/auth/phoneAuth', () => ({
  sendPhoneOTP: (...args: Parameters<typeof mockSendPhoneOTP>) => mockSendPhoneOTP(...args),
  verifyPhoneOTP: (...args: Parameters<typeof mockVerifyPhoneOTP>) => mockVerifyPhoneOTP(...args),
}));

const mockCreateUserProfile = jest.fn();
const mockMarkPhoneVerified = jest.fn();
const mockFormatPhoneNumber = jest.fn((p: string) => p);

jest.mock('@nusa/shared', () => ({
  createUserProfile: (...args: Parameters<typeof mockCreateUserProfile>) => mockCreateUserProfile(...args),
  markPhoneVerified: (...args: Parameters<typeof mockMarkPhoneVerified>) => mockMarkPhoneVerified(...args),
  formatPhoneNumber: (...args: Parameters<typeof mockFormatPhoneNumber>) => mockFormatPhoneNumber(...args),
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
  useRoute: () => ({
    params: {
      phone: '+15551234567',
      fullName: 'Test User',
    },
  }),
}));

jest.mock('../../components/buttons/PrimaryButton', () => ({
  PrimaryButton: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="primary-button" onPress={onPress} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/buttons/TextButton', () => ({
  TextButton: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="text-button" onPress={onPress} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PhoneVerificationScreen } from './PhoneVerificationScreen';
import { AuthContext } from '../../contexts/AuthContext';

function renderScreen() {
  return render(
    <AuthContext.Provider value={{ refreshUser: mockRefreshUser } as unknown as React.ContextType<typeof AuthContext>}>
      <PhoneVerificationScreen />
    </AuthContext.Provider>
  );
}

describe('PhoneVerificationScreen', () => {
  beforeEach(() => {
    // Use fake timers for ALL tests so the component's setInterval (resend
    // cooldown) never fires with real timers.  Real-timer intervals create
    // continuous React state updates that prevent React 19's act() scope from
    // closing during RNTL cleanup, leaking stale scopes into subsequent test
    // suites and causing hangs on slow CI runners.
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCreateUserProfile.mockResolvedValue({ data: { id: 'user-123' }, error: null });
    mockMarkPhoneVerified.mockResolvedValue({ data: { id: 'user-123', phone_verified: true }, error: null });
    mockRefreshUser.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: '' } },
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders masked phone and OTP input', () => {
    const { getByText, getByPlaceholderText } = renderScreen();

    expect(getByText('Verify Your Phone')).toBeTruthy();
    expect(getByText('***-***-4567')).toBeTruthy();
    expect(getByPlaceholderText('000000')).toBeTruthy();
  });

  it('shows error when OTP is less than 6 digits', () => {
    const { getByPlaceholderText, getByTestId, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('000000'), '123');
    fireEvent.press(getByTestId('primary-button'));

    // setError is called synchronously (otp.length check returns early),
    // so the error text is already rendered — no waitFor needed.
    expect(getByText('Please enter the 6-digit code from your SMS.')).toBeTruthy();
    expect(mockVerifyPhoneOTP).not.toHaveBeenCalled();
  });

  // NOTE: All tests below use `await act(async () => {})` instead of `waitFor`
  // to flush the async mock chain.  With fake timers, `waitFor` advances fake
  // time while polling; after 1000ms of advances the component's setInterval
  // (resend cooldown) fires, creating new React work that keeps waitFor polling
  // forever — an infinite loop that manifests as a 10s timeout on slow CI.

  it('verifies OTP, creates profile, and navigates on success', async () => {
    mockVerifyPhoneOTP.mockResolvedValueOnce({ success: true });

    const { getByPlaceholderText, getByTestId } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('000000'), '123456');
    fireEvent.press(getByTestId('primary-button'));

    await act(async () => {});

    expect(mockVerifyPhoneOTP).toHaveBeenCalledWith('+15551234567', '123456');
    expect(mockCreateUserProfile).toHaveBeenCalled();
    expect(mockMarkPhoneVerified).toHaveBeenCalledWith(
      expect.anything(),
      'user-123'
    );
    expect(mockNavigate).toHaveBeenCalledWith('LocationPermission', {
      userId: 'user-123',
    });
  });

  it('shows error when OTP verification fails', async () => {
    mockVerifyPhoneOTP.mockResolvedValueOnce({
      success: false,
      error: new Error('Invalid token'),
    });

    const { getByPlaceholderText, getByTestId, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('000000'), '000000');
    fireEvent.press(getByTestId('primary-button'));

    await act(async () => {});

    expect(getByText('Invalid code. Please try again.')).toBeTruthy();
  });

  it('shows expired error for expired OTP', async () => {
    mockVerifyPhoneOTP.mockResolvedValueOnce({
      success: false,
      error: new Error('Token has expired'),
    });

    const { getByPlaceholderText, getByTestId, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('000000'), '000000');
    fireEvent.press(getByTestId('primary-button'));

    await act(async () => {});

    expect(getByText('Code expired. Request a new one.')).toBeTruthy();
  });

  it('handles duplicate profile gracefully', async () => {
    mockVerifyPhoneOTP.mockResolvedValueOnce({ success: true });
    mockCreateUserProfile.mockResolvedValueOnce({
      data: null,
      error: new Error('duplicate key value violates unique constraint'),
    });

    const { getByPlaceholderText, getByTestId } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('000000'), '123456');
    fireEvent.press(getByTestId('primary-button'));

    await act(async () => {});

    // Should still proceed to mark phone verified and navigate
    expect(mockMarkPhoneVerified).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('LocationPermission', {
      userId: 'user-123',
    });
  });

  it('resend button is disabled during cooldown', () => {
    const { getByText } = renderScreen();
    expect(getByText(/Resend in \d+s/)).toBeTruthy();
  });

  it('resend button becomes active after cooldown', () => {
    const { getByText } = renderScreen();

    act(() => {
      jest.advanceTimersByTime(61000);
    });

    expect(getByText('Resend Code')).toBeTruthy();
  });

  it('navigates back when "Use a different number" is pressed', () => {
    const { getAllByTestId } = renderScreen();

    // The second text-button is "Use a different number"
    const textButtons = getAllByTestId('text-button');
    fireEvent.press(textButtons[textButtons.length - 1]);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
