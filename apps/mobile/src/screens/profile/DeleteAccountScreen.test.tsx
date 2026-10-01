import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor, type RenderResult } from '@testing-library/react-native';
import {
  ApiError,
  DELETE_ACCOUNT_FAILED,
  PROFILE_NOT_FOUND,
  REAUTH_REQUIRED,
  SUPPORT_EMAIL,
  formatDeletionDate,
} from '@nepally/shared';
import { DeleteAccountScreen } from './DeleteAccountScreen';

const mockGoBack = jest.fn();
const mockUseAuth = jest.fn();
const mockSignOut = jest.fn();
const mockPauseAuthListener = jest.fn();
const mockResumeAuthListener = jest.fn();
const mockGetSession = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockRequestAccountDeletion = jest.fn();
const mockLogClientEvent = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
  },
}));

jest.mock('../../services/auth/googleAuth', () => ({
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  // The same check googleAuth.ts makes; the real module pulls in Expo's browser.
  isGoogleSignInCancelled: (error?: Error) => error?.message === 'Google sign-in was cancelled',
}));

jest.mock('@nepally/shared', () => ({
  ...jest.requireActual('@nepally/shared'),
  requestAccountDeletion: (...args: unknown[]) => mockRequestAccountDeletion(...args),
  logClientEvent: (...args: unknown[]) => mockLogClientEvent(...args),
}));

const EMAIL = 'sita@example.com';
const SCHEDULED = '2026-10-30T12:00:00.000Z';

/** An access token whose only `amr` entry is `secondsAgo` old. */
function tokenSignedIn(secondsAgo: number): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const timestamp = Math.floor(Date.now() / 1000) - secondsAgo;
  return `${encode({ alg: 'HS256' })}.${encode({ amr: [{ method: 'password', timestamp }] })}.sig`;
}

function setAccount(providers: string[]) {
  mockUseAuth.mockReturnValue({
    user: {
      id: 'user-1',
      email: EMAIL,
      full_name: 'Sita Sharma',
      trust_level: 1,
      is_premium: false,
    },
    supabaseUser: { id: 'user-1', email: EMAIL, app_metadata: { providers } },
    signOut: mockSignOut,
    pauseAuthListener: mockPauseAuthListener,
    resumeAuthListener: mockResumeAuthListener,
  });
}

function signedInSecondsAgo(secondsAgo: number) {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: tokenSignedIn(secondsAgo), user: { id: 'user-1' } } },
    error: null,
  });
}

async function continueToConfirm(screen: RenderResult) {
  fireEvent.press(screen.getByText('Continue'));
  await waitFor(() => {
    expect(screen.getByText("Confirm it's you")).toBeTruthy();
  });
}

async function continueToFinal(screen: RenderResult) {
  signedInSecondsAgo(60);
  fireEvent.press(screen.getByText('Continue'));
  await waitFor(() => {
    expect(screen.getByText('Delete your account?')).toBeTruthy();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  setAccount(['email']);
  // Signed in an hour ago: too long for the server's 10 minutes.
  signedInSecondsAgo(3600);
  mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
  mockSignInWithGoogle.mockResolvedValue({
    user: { id: 'user-1', email: EMAIL, full_name: 'Sita Sharma' },
  });
  mockRequestAccountDeletion.mockResolvedValue({ data: SCHEDULED });
  mockSignOut.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('DeleteAccountScreen explain step', () => {
  it('names the account and says what goes, and when', () => {
    const screen = render(<DeleteAccountScreen />);

    expect(screen.getByText('Delete your account')).toBeTruthy();
    expect(screen.getByText(`Signed in as ${EMAIL}`)).toBeTruthy();
    expect(screen.getByText(/the messages you sent/)).toBeTruthy();
    expect(screen.getByText(/Sign in before then to restore it/)).toBeTruthy();
  });

  it('goes back on Cancel', () => {
    const screen = render(<DeleteAccountScreen />);
    fireEvent.press(screen.getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('skips confirming after a recent sign-in', async () => {
    const screen = render(<DeleteAccountScreen />);
    await continueToFinal(screen);
    expect(screen.getByText(`Signed in as ${EMAIL}`)).toBeTruthy();
  });

  it('asks to confirm when the session cannot be read', async () => {
    mockGetSession.mockRejectedValue(new Error('storage unavailable'));
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    expect(mockLogClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'account_delete_session_read_failed' })
    );
  });
});

describe('DeleteAccountScreen password step', () => {
  it('asks for the password first', async () => {
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    fireEvent.press(screen.getByText('Confirm'));

    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('names a wrong password', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-pass');
    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('That password is incorrect.')).toBeTruthy();
    });
    expect(mockLogClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'account_delete_reauth_failed' })
    );
  });

  it('signs in again with the paused listener, then moves on', async () => {
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    fireEvent.changeText(screen.getByLabelText('Password'), 'right-pass');
    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Delete your account?')).toBeTruthy();
    });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: EMAIL, password: 'right-pass' });
    const signInOrder = mockSignInWithPassword.mock.invocationCallOrder[0];
    expect(mockPauseAuthListener.mock.invocationCallOrder[0]).toBeLessThan(signInOrder);
    expect(mockResumeAuthListener.mock.invocationCallOrder[0]).toBeGreaterThan(signInOrder);
  });

  it('gives the support email, and offers Google only when it is linked', async () => {
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    expect(screen.getByText(SUPPORT_EMAIL)).toBeTruthy();
    expect(screen.queryByText('Continue with Google')).toBeNull();

    setAccount(['email', 'google']);
    screen.rerender(<DeleteAccountScreen />);
    expect(screen.getByText('Continue with Google')).toBeTruthy();
  });
});

describe('DeleteAccountScreen Google step', () => {
  beforeEach(() => {
    setAccount(['google']);
  });

  it('asks a Google account to sign in with Google, with the chooser', async () => {
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    expect(screen.queryByLabelText('Password')).toBeNull();

    signedInSecondsAgo(5);
    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(screen.getByText('Delete your account?')).toBeTruthy();
    });
    expect(mockSignInWithGoogle).toHaveBeenCalledWith({ selectAccount: true });
    expect(mockPauseAuthListener).toHaveBeenCalledTimes(1);
    expect(mockResumeAuthListener).toHaveBeenCalledTimes(1);
  });

  it('signs a different account out of this device only, and deletes nothing', async () => {
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    mockSignInWithGoogle.mockResolvedValue({
      user: { id: 'user-2', email: 'other@example.com', full_name: 'Other' },
    });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: tokenSignedIn(5), user: { id: 'user-2' } } },
      error: null,
    });
    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'You signed in as a different account',
      'Nothing was deleted. Sign in again as yourself.'
    );
    expect(mockRequestAccountDeletion).not.toHaveBeenCalled();
  });

  it('treats a missing session after Google as the wrong account', async () => {
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  it('stays put, quietly, when Google is cancelled', async () => {
    mockSignInWithGoogle.mockResolvedValue({ error: new Error('Google sign-in was cancelled') });
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockResumeAuthListener).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Confirm it's you")).toBeTruthy();
    expect(screen.queryByText("Couldn't continue with Google. Please try again.")).toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('says so when Google fails', async () => {
    mockSignInWithGoogle.mockResolvedValue({ error: new Error('Invalid OAuth callback URL') });
    const screen = render(<DeleteAccountScreen />);
    await continueToConfirm(screen);
    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(screen.getByText("Couldn't continue with Google. Please try again.")).toBeTruthy();
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe('DeleteAccountScreen final step', () => {
  it('deletes, signs every device out, then gives the date', async () => {
    const screen = render(<DeleteAccountScreen />);
    await continueToFinal(screen);
    fireEvent.press(screen.getByText('Delete my account'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Account scheduled for deletion',
        `Your account will be deleted on ${formatDeletionDate(SCHEDULED)}. Sign in before then to restore it.`
      );
    });
    expect(mockRequestAccountDeletion).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith();
    expect(mockSignOut.mock.invocationCallOrder[0]).toBeLessThan(
      (Alert.alert as jest.Mock).mock.invocationCallOrder[0]
    );
  });

  it('goes back to confirming when the sign-in is too old', async () => {
    mockRequestAccountDeletion.mockResolvedValue({
      error: new ApiError("Please confirm it's you again.", { code: REAUTH_REQUIRED }),
    });
    const screen = render(<DeleteAccountScreen />);
    await continueToFinal(screen);
    fireEvent.press(screen.getByText('Delete my account'));

    await waitFor(() => {
      expect(screen.getByText("Please confirm it's you again.")).toBeTruthy();
    });
    expect(screen.getByText("Confirm it's you")).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('sends a member with no profile row to support', async () => {
    mockRequestAccountDeletion.mockResolvedValue({
      error: new ApiError("We couldn't find your profile.", { code: PROFILE_NOT_FOUND }),
    });
    const screen = render(<DeleteAccountScreen />);
    await continueToFinal(screen);
    fireEvent.press(screen.getByText('Delete my account'));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(SUPPORT_EMAIL))).toBeTruthy();
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('keeps the member on the final step to retry after a network error', async () => {
    mockRequestAccountDeletion.mockResolvedValue({ error: new Error('Network request failed') });
    const screen = render(<DeleteAccountScreen />);
    await continueToFinal(screen);
    fireEvent.press(screen.getByText('Delete my account'));

    await waitFor(() => {
      expect(screen.getByText(DELETE_ACCOUNT_FAILED)).toBeTruthy();
    });
    expect(screen.getByText('Delete your account?')).toBeTruthy();
    expect(screen.queryByText('Network request failed')).toBeNull();
    expect(mockLogClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'account_delete_failed' })
    );
  });
});
