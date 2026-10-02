import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  ApiError,
  DELETION_IN_PROGRESS,
  RESTORE_ACCOUNT_FAILED,
  formatDeletionDate,
} from '@nepally/shared';
import { AccountRestoreScreen } from './AccountRestoreScreen';

const mockUseAuth = jest.fn();
const mockRefreshUser = jest.fn();
const mockSignOut = jest.fn();
const mockCancelAccountDeletion = jest.fn();
const mockLogClientEvent = jest.fn();
const mockNow = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// A fixed clock: useNow's interval would need fake timers (apps/mobile/CLAUDE.md, rule 1).
jest.mock('../../hooks/useNow', () => ({
  useNow: () => mockNow(),
}));

jest.mock('../../config/supabase', () => ({ supabase: { from: jest.fn() } }));

jest.mock('@nepally/shared', () => ({
  ...jest.requireActual('@nepally/shared'),
  cancelAccountDeletion: (...args: unknown[]) => mockCancelAccountDeletion(...args),
  logClientEvent: (...args: unknown[]) => mockLogClientEvent(...args),
}));

const SCHEDULED_FOR = '2026-10-30T12:00:00.000Z';
const RELOAD_FAILED = "We couldn't confirm the restore. Close and reopen the app.";

function setScheduledFor(deletionScheduledFor: string | null) {
  mockUseAuth.mockReturnValue({
    user: {
      id: 'user-1',
      email: 'sita@example.com',
      full_name: 'Sita Sharma',
      trust_level: 1,
      is_premium: false,
      deletion_scheduled_for: deletionScheduledFor,
    },
    refreshUser: mockRefreshUser,
    signOut: mockSignOut,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setScheduledFor(SCHEDULED_FOR);
  mockNow.mockReturnValue(new Date('2026-10-01T12:00:00.000Z'));
  mockCancelAccountDeletion.mockResolvedValue({});
  mockRefreshUser.mockResolvedValue({ id: 'user-1', deletion_scheduled_for: null });
  mockSignOut.mockResolvedValue(undefined);
});

describe('AccountRestoreScreen', () => {
  it('shows the deletion date, Restore and Keep deletion', () => {
    const screen = render(<AccountRestoreScreen />);

    expect(screen.getByText('Your account is scheduled for deletion')).toBeTruthy();
    expect(screen.getByText(new RegExp(formatDeletionDate(SCHEDULED_FOR)))).toBeTruthy();
    expect(screen.getByText('Restore my account')).toBeTruthy();
    expect(screen.getByText('Keep deletion and sign out')).toBeTruthy();
  });

  it('restores the account, then reloads the profile', async () => {
    const screen = render(<AccountRestoreScreen />);
    fireEvent.press(screen.getByText('Restore my account'));

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    });
    expect(mockCancelAccountDeletion).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(RELOAD_FAILED)).toBeNull();
  });

  it('says so when the reloaded profile is still scheduled', async () => {
    mockRefreshUser.mockResolvedValue({ id: 'user-1', deletion_scheduled_for: SCHEDULED_FOR });
    const screen = render(<AccountRestoreScreen />);
    fireEvent.press(screen.getByText('Restore my account'));

    await waitFor(() => {
      expect(screen.getByText(RELOAD_FAILED)).toBeTruthy();
    });
    expect(mockLogClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'account_restore_reload_failed' })
    );
  });

  it('says so when the profile could not be reloaded', async () => {
    mockRefreshUser.mockResolvedValue(null);
    const screen = render(<AccountRestoreScreen />);
    fireEvent.press(screen.getByText('Restore my account'));

    await waitFor(() => {
      expect(screen.getByText(RELOAD_FAILED)).toBeTruthy();
    });
  });

  it('shows the retry sentence, never the raw error, when restoring fails', async () => {
    mockCancelAccountDeletion.mockResolvedValue({ error: new Error('connection refused') });
    const screen = render(<AccountRestoreScreen />);
    fireEvent.press(screen.getByText('Restore my account'));

    await waitFor(() => {
      expect(screen.getByText(RESTORE_ACCOUNT_FAILED)).toBeTruthy();
    });
    expect(screen.queryByText('connection refused')).toBeNull();
    expect(mockRefreshUser).not.toHaveBeenCalled();
    expect(mockLogClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'account_restore_failed' })
    );
  });

  it('switches to "being deleted" when the server says the date has passed', async () => {
    mockCancelAccountDeletion.mockResolvedValue({
      error: new ApiError('Your account is already being deleted.', { code: DELETION_IN_PROGRESS }),
    });
    const screen = render(<AccountRestoreScreen />);
    fireEvent.press(screen.getByText('Restore my account'));

    await waitFor(() => {
      expect(screen.getByText('Your account is being deleted')).toBeTruthy();
    });
    expect(screen.queryByText('Restore my account')).toBeNull();
    expect(screen.getByText('Sign out')).toBeTruthy();
  });

  it('offers only Sign out once the date has passed', () => {
    mockNow.mockReturnValue(new Date('2026-10-31T12:00:00.000Z'));
    const screen = render(<AccountRestoreScreen />);

    expect(screen.getByText('Your account is being deleted')).toBeTruthy();
    expect(screen.queryByText('Restore my account')).toBeNull();
    expect(screen.getByText('Sign out')).toBeTruthy();
  });

  it('keeps the deletion and signs out', async () => {
    const screen = render(<AccountRestoreScreen />);
    fireEvent.press(screen.getByText('Keep deletion and sign out'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockCancelAccountDeletion).not.toHaveBeenCalled();
  });

  it('renders nothing for an account with no deletion date', () => {
    setScheduledFor(null);
    const screen = render(<AccountRestoreScreen />);

    expect(screen.toJSON()).toBeNull();
  });
});
