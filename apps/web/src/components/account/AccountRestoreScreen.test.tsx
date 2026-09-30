import React from 'react';
import { act, fireEvent, render, screen } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  refreshUser: vi.fn(),
  signOut: vi.fn(),
  cancelAccountDeletion: vi.fn(),
  logClientEvent: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../ui/notify', () => ({ notify: { error: mocks.notifyError, success: vi.fn() } }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  cancelAccountDeletion: mocks.cancelAccountDeletion,
  logClientEvent: mocks.logClientEvent,
}));

import { AccountRestoreScreen } from './AccountRestoreScreen';

const AHEAD = '2999-01-01T12:00:00.000Z';
const PASSED = '2000-01-01T12:00:00.000Z';

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

describe('AccountRestoreScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ refreshUser: mocks.refreshUser, signOut: mocks.signOut });
    mocks.refreshUser.mockResolvedValue({ id: 'user-1', deletion_scheduled_for: null });
    mocks.signOut.mockResolvedValue({});
    mocks.cancelAccountDeletion.mockResolvedValue({});
  });

  it('gives the date and offers both choices', () => {
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your account is scheduled for deletion' })
    ).toBeDefined();
    expect(screen.getByText(/January 1, 2999/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Restore my account' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Keep deletion and sign out' })).toBeDefined();
  });

  it('restores, then reloads the profile so the gate lifts', async () => {
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Restore my account');

    expect(mocks.cancelAccountDeletion).toHaveBeenCalledTimes(1);
    expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
  });

  it("says so when the profile can't be reloaded after a restore", async () => {
    mocks.refreshUser.mockResolvedValue(null);
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Restore my account');

    expect(
      screen.getByText(
        "Your account is restored, but we couldn't reload it. Please refresh the page."
      )
    ).toBeDefined();
    expect(mocks.logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'account_restore_reload_failed' })
    );
    expect(
      screen.getByRole('button', { name: 'Restore my account' }).getAttribute('aria-busy')
    ).not.toBe('true');
  });

  it('says so when the reloaded profile still has its deletion date', async () => {
    mocks.refreshUser.mockResolvedValue({ id: 'user-1', deletion_scheduled_for: AHEAD });
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Restore my account');

    expect(
      screen.getByText(
        "Your account is restored, but we couldn't reload it. Please refresh the page."
      )
    ).toBeDefined();
  });

  it('switches to "being deleted" when the database refuses a late restore', async () => {
    mocks.cancelAccountDeletion.mockResolvedValue({
      error: new ApiError('Your account is already being deleted.', {
        code: 'deletion_in_progress',
      }),
    });
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Restore my account');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your account is being deleted' })
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Restore my account' })).toBeNull();
    expect(mocks.refreshUser).not.toHaveBeenCalled();
  });

  it('shows any other restore failure and logs it', async () => {
    mocks.cancelAccountDeletion.mockResolvedValue({
      error: new ApiError("Couldn't restore your account. Please try again."),
    });
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Restore my account');

    expect(screen.getByText("Couldn't restore your account. Please try again.")).toBeDefined();
    expect(mocks.logClientEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'account_restore_failed' })
    );
  });

  it('offers only Sign out once the date has passed', () => {
    render(<AccountRestoreScreen scheduledFor={PASSED} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your account is being deleted' })
    ).toBeDefined();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Sign out']);
  });

  it('signs out, and toasts the sentence when that fails', async () => {
    mocks.signOut.mockResolvedValue({ error: "Couldn't log you out. Please try again." });
    render(<AccountRestoreScreen scheduledFor={AHEAD} />);

    await press('Keep deletion and sign out');

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.notifyError).toHaveBeenCalledWith("Couldn't log you out. Please try again.");
  });
});
