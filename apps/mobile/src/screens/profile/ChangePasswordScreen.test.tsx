const mockSignInWithPassword = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
}));

jest.mock('@nepally/shared', () => ({
  APP_CONFIG: jest.requireActual('@nepally/shared').APP_CONFIG,
  userMessage: jest.requireActual('@nepally/shared').userMessage,
}));

const mockPauseAuthListener = jest.fn();
const mockResumeAuthListener = jest.fn();

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'bikal@example.com' },
    pauseAuthListener: mockPauseAuthListener,
    resumeAuthListener: mockResumeAuthListener,
  }),
}));

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
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

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChangePasswordScreen } from './ChangePasswordScreen';

const RLS_MESSAGE = 'new row violates row-level security policy';

/** Every string passed to Alert.alert so far, title and message alike. */
function alertTexts(): string[] {
  return (Alert.alert as jest.Mock).mock.calls.flatMap((call: unknown[]) =>
    call.filter((arg): arg is string => typeof arg === 'string')
  );
}

function fillAndSave(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByPlaceholderText('Enter current password'), 'oldpassword1');
  fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'newpassword1');
  fireEvent.changeText(screen.getByPlaceholderText('Re-enter new password'), 'newpassword1');
  fireEvent.press(screen.getByTestId('primary-button'));
}

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // userMessage logs the raw error through logClientEvent (console.error).
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  it('changes the password, goes back and confirms', async () => {
    const screen = render(<ChangePasswordScreen />);
    fillAndSave(screen);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'bikal@example.com',
      password: 'oldpassword1',
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
    expect(Alert.alert).toHaveBeenCalledWith('Password Changed', 'Your password has been updated successfully.');
    expect(mockResumeAuthListener).toHaveBeenCalled();
  });

  it('flags a wrong current password on the field and does not update', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {},
      error: Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials', status: 400 }),
    });

    const screen = render(<ChangePasswordScreen />);
    fillAndSave(screen);

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeTruthy();
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockResumeAuthListener).toHaveBeenCalled();
  });

  it("shows our sentence, never Supabase's text, when the update fails", async () => {
    const error = Object.assign(new Error(RLS_MESSAGE), { status: 400 });
    mockUpdateUser.mockResolvedValueOnce({ data: {}, error });

    const screen = render(<ChangePasswordScreen />);
    fillAndSave(screen);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', "Couldn't change your password. Please try again.");
    });
    expect(alertTexts().some((text) => text.includes('row-level security'))).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      'password_change_failed',
      expect.objectContaining({ context: expect.objectContaining({ platform: 'mobile' }) })
    );
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockResumeAuthListener).toHaveBeenCalled();
  });

  it('shows the connection sentence for a network failure', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: {},
      error: Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0 }),
    });

    const screen = render(<ChangePasswordScreen />);
    fillAndSave(screen);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        "Couldn't reach Nepally. Check your connection and try again."
      );
    });
  });
});
