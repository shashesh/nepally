import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockUserRowSingle = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => mockUserRowSingle() }),
      }),
    }),
  },
}));

const mockLogClientEvent = jest.fn();

jest.mock('@nepally/shared', () => ({
  APP_CONFIG: jest.requireActual('@nepally/shared').APP_CONFIG,
  FULL_NAME_MAX_LENGTH: jest.requireActual('@nepally/shared').FULL_NAME_MAX_LENGTH,
  fullNameSchema: jest.requireActual('@nepally/shared').fullNameSchema,
  getAuthErrorMessage: jest.requireActual('@nepally/shared').getAuthErrorMessage,
  logClientEvent: (...args: unknown[]) => mockLogClientEvent(...args),
}));

const mockMarkOnboardingComplete = jest.fn();

jest.mock('../../utils/storage', () => ({
  markOnboardingComplete: () => mockMarkOnboardingComplete(),
}));

const mockRefreshUser = jest.fn();

jest.mock('../../contexts/AuthContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory is hoisted above ESM imports
  const React = require('react');
  return {
    AuthContext: React.createContext({}),
  };
});

const mockNavigate = jest.fn();
let mockRouteMode: 'signup' | 'login' = 'signup';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { mode: mockRouteMode } }),
}));

jest.mock('../../components/buttons/PrimaryButton', () => ({
  PrimaryButton: ({ title, onPress }: { title: string; onPress: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory is hoisted above ESM imports
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory is hoisted above ESM imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="text-button" onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FULL_NAME_MAX_LENGTH } from '@nepally/shared';
import { EmailSignupScreen } from './EmailSignupScreen';
import { AuthContext } from '../../contexts/AuthContext';

const RLS_MESSAGE = 'new row violates row-level security policy for table "users"';

/** A Supabase AuthError-shaped value: an Error carrying `code` and `status`. */
function authError(message: string, fields: { code?: string; status?: number; name?: string }) {
  return Object.assign(new Error(message), fields);
}

function renderScreen() {
  return render(
    <AuthContext.Provider value={{ refreshUser: mockRefreshUser } as unknown as React.ContextType<typeof AuthContext>}>
      <EmailSignupScreen />
    </AuthContext.Provider>
  );
}

/** Every string passed to Alert.alert so far, title and message alike. */
function alertTexts(): string[] {
  return (Alert.alert as jest.Mock).mock.calls.flatMap((call: unknown[]) =>
    call.filter((arg): arg is string => typeof arg === 'string')
  );
}

function fillSignup(
  screen: ReturnType<typeof renderScreen>,
  { name = 'Bikal Shrestha', email = 'bikal@example.com', password = 'password123' } = {}
) {
  fireEvent.changeText(screen.getByPlaceholderText('Your full name'), name);
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), email);
  fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), password);
  fireEvent.changeText(screen.getByPlaceholderText('Re-enter your password'), password);
}

function fillLogin(screen: ReturnType<typeof renderScreen>) {
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'bikal@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'password123');
}

describe('EmailSignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockRefreshUser.mockResolvedValue(undefined);
    mockUserRowSingle.mockResolvedValue({ data: { metro_area_id: null }, error: null });
    mockRouteMode = 'signup';
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  describe('sign up', () => {
    it('caps the name input at FULL_NAME_MAX_LENGTH', () => {
      const screen = renderScreen();
      expect(screen.getByPlaceholderText('Your full name').props.maxLength).toBe(FULL_NAME_MAX_LENGTH);
    });

    it("shows the schema's error and does not sign up a name that normalises to one character", () => {
      const screen = renderScreen();
      fillSignup(screen, { name: ' ‮A​ ' });
      fireEvent.press(screen.getByTestId('primary-button'));

      expect(screen.getByText('Name must be at least 2 characters')).toBeTruthy();
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('sends the parsed name to sign-up and verification', async () => {
      mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

      const screen = renderScreen();
      fillSignup(screen, { name: '  Bikal ‮  Shrestha  ' });
      fireEvent.press(screen.getByTestId('primary-button'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('EmailVerification', {
          email: 'bikal@example.com',
          userId: 'user-1',
          fullName: 'Bikal Shrestha',
        });
      });
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'bikal@example.com',
        password: 'password123',
        options: { data: { full_name: 'Bikal Shrestha' } },
      });
    });

    it("shows the sign-up sentence, logs the failure, and never shows Supabase's text", async () => {
      const error = authError(RLS_MESSAGE, { code: 'unexpected_failure', status: 400 });
      mockSignUp.mockResolvedValueOnce({ data: { user: null }, error });

      const screen = renderScreen();
      fillSignup(screen);
      fireEvent.press(screen.getByTestId('primary-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Signup Failed',
          "Couldn't create your account. Please try again."
        );
      });
      expect(alertTexts().some((text) => text.includes('row-level security'))).toBe(false);
      expect(mockLogClientEvent).toHaveBeenCalledWith({
        event: 'auth_sign_up_failed',
        context: { platform: 'mobile' },
        error,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows the rate-limit sentence for over_email_send_rate_limit', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null },
        error: authError('email rate limit exceeded', { code: 'over_email_send_rate_limit', status: 429 }),
      });

      const screen = renderScreen();
      fillSignup(screen);
      fireEvent.press(screen.getByTestId('primary-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Signup Failed',
          'Too many attempts. Please wait a minute and try again.'
        );
      });
    });
  });

  describe('log in', () => {
    beforeEach(() => {
      mockRouteMode = 'login';
    });

    it('shows the credentials sentence, not the raw message, for invalid_credentials', async () => {
      const error = authError('Invalid login credentials', { code: 'invalid_credentials', status: 400 });
      mockSignInWithPassword.mockResolvedValueOnce({ data: { user: null }, error });

      const screen = renderScreen();
      fillLogin(screen);
      fireEvent.press(screen.getByTestId('primary-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Login Failed',
          "That email and password don't match. Check them and try again."
        );
      });
      expect(alertTexts()).not.toContain('Invalid login credentials');
      expect(mockLogClientEvent).toHaveBeenCalledWith({
        event: 'auth_log_in_failed',
        context: { platform: 'mobile' },
        error,
      });
      expect(mockRefreshUser).not.toHaveBeenCalled();
    });

    it('shows the connection sentence when the request never reached Supabase', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: authError('Failed to fetch', { name: 'AuthRetryableFetchError', status: 0 }),
      });

      const screen = renderScreen();
      fillLogin(screen);
      fireEvent.press(screen.getByTestId('primary-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Login Failed',
          "Couldn't reach Nepally. Check your connection and try again."
        );
      });
    });

    it('marks onboarding complete for a returning member with a metro', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockUserRowSingle.mockResolvedValueOnce({ data: { metro_area_id: 'metro-1' }, error: null });

      const screen = renderScreen();
      fillLogin(screen);
      fireEvent.press(screen.getByTestId('primary-button'));

      await waitFor(() => {
        expect(mockMarkOnboardingComplete).toHaveBeenCalled();
      });
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});
