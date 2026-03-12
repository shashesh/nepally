import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockVerifyOtp = jest.fn();
const mockResend = jest.fn();

// Wrap in arrow functions so the mock references are resolved lazily at call time,
// not at factory evaluation time (factories run before variable initializers).
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: Parameters<typeof mockVerifyOtp>) => mockVerifyOtp(...args),
      resend: (...args: Parameters<typeof mockResend>) => mockResend(...args),
    },
  },
}));

const mockCreateUserProfile = jest.fn();
const mockMarkEmailVerified = jest.fn();

jest.mock('@nusa/shared', () => ({
  createUserProfile: (...args: Parameters<typeof mockCreateUserProfile>) => mockCreateUserProfile(...args),
  markEmailVerified: (...args: Parameters<typeof mockMarkEmailVerified>) => mockMarkEmailVerified(...args),
}));

// AuthContext is mocked as a real React context so useContext works correctly.
// mockRefreshUser is defined here and injected via a Provider wrapper in each test.
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
      email: 'test@example.com',
      userId: 'user-123',
      fullName: 'Test User',
    },
  }),
}));

jest.mock('../../components/buttons/PrimaryButton', () => ({
  PrimaryButton: ({ title, onPress }: { title: string; onPress: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="primary-button" onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
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
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { EmailVerificationScreen } from './EmailVerificationScreen';
import { AuthContext } from '../../contexts/AuthContext';

function renderScreen() {
  return render(
    <AuthContext.Provider value={{ refreshUser: mockRefreshUser } as unknown as React.ContextType<typeof AuthContext>}>
      <EmailVerificationScreen />
    </AuthContext.Provider>
  );
}

describe('EmailVerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCreateUserProfile.mockResolvedValue({ data: { id: 'user-123' }, error: null });
    mockMarkEmailVerified.mockResolvedValue({ data: { id: 'user-123', email_verified: true }, error: null });
    mockRefreshUser.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders masked email and OTP input', () => {
    const { getByText, getByPlaceholderText } = renderScreen();

    expect(getByText('Check Your Email')).toBeTruthy();
    expect(getByText('t**t@example.com')).toBeTruthy();
    expect(getByPlaceholderText('000000')).toBeTruthy();
  });

  it('shows error when OTP is less than 6 digits', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <EmailVerificationScreen />
    );

    fireEvent.changeText(getByPlaceholderText('000000'), '123');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(getByText('Please enter the 6-digit code from your email.')).toBeTruthy();
    });
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('calls verifyOtp with correct params on valid OTP submit', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const { getByPlaceholderText, getByTestId } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('000000'), '123456');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'signup',
      });
    });
  });

  it('creates profile and marks email verified on successful OTP', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const { getByPlaceholderText, getByTestId } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('000000'), '123456');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(mockCreateUserProfile).toHaveBeenCalled();
      expect(mockMarkEmailVerified).toHaveBeenCalledWith(
        expect.anything(),
        'user-123'
      );
    });
  });

  it('navigates to LocationPermission on successful verification', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const { getByPlaceholderText, getByTestId } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('000000'), '123456');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('LocationPermission', {
        userId: 'user-123',
      });
    });
  });

  it('shows "Code expired" error when Supabase returns expiry error', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Token has expired'),
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <EmailVerificationScreen />
    );

    fireEvent.changeText(getByPlaceholderText('000000'), '000000');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(getByText('Code expired. Request a new one.')).toBeTruthy();
    });
  });

  it('shows "Invalid code" error for generic OTP error', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Invalid token'),
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <EmailVerificationScreen />
    );

    fireEvent.changeText(getByPlaceholderText('000000'), '000000');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(getByText('Invalid code. Please try again.')).toBeTruthy();
    });
  });

  it('resend button is disabled during cooldown period', () => {
    const { getByText } = renderScreen();
    expect(getByText(/Resend in \d+s/)).toBeTruthy();
  });

  it('resend button becomes active after cooldown expires', () => {
    const { getByText } = renderScreen();

    act(() => {
      jest.advanceTimersByTime(61000);
    });

    expect(getByText('Resend Code')).toBeTruthy();
  });

  it('calls supabase.auth.resend when resend is triggered after cooldown', async () => {
    mockResend.mockResolvedValueOnce({ error: null });

    const { getByText } = renderScreen();

    act(() => {
      jest.advanceTimersByTime(61000);
    });

    fireEvent.press(getByText('Resend Code'));

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
      });
    });
  });

  it('does not call resend when cooldown is active', () => {
    const { getByText } = renderScreen();

    // Cooldown is active immediately on mount
    const resendText = getByText(/Resend in \d+s/);
    fireEvent.press(resendText);

    expect(mockResend).not.toHaveBeenCalled();
  });
});
