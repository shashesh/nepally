import React from 'react';
import { render, screen, fireEvent, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BIO_MAX_LENGTH, FULL_NAME_MAX_LENGTH } from '@nepally/shared';
import type { User } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  updateUserProfile: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  notificationsShow: vi.fn(),
  logClientEvent: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: mocks.notificationsShow },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
  },
}));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  updateUserProfile: mocks.updateUserProfile,
  logClientEvent: mocks.logClientEvent,
}));

import { useProfileEditing } from './useProfileEditing';

type HarnessUser = Pick<User, 'id' | 'email' | 'full_name' | 'bio'>;

function Harness({
  user,
  refreshUser,
}: {
  user: HarnessUser | null;
  refreshUser: () => Promise<void>;
}) {
  const { editName, editBio, changePassword, saving } = useProfileEditing(user, refreshUser);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          editName();
        }}
      >
        Edit name
      </button>
      <button
        type="button"
        onClick={() => {
          editBio();
        }}
      >
        Edit bio
      </button>
      <button
        type="button"
        onClick={() => {
          changePassword();
        }}
      >
        Change password
      </button>
      <output data-testid="saving">{String(saving)}</output>
    </>
  );
}

const mockUser: HarnessUser = {
  id: 'user-1',
  email: 'bikal@example.com',
  full_name: 'Bikal Shrestha',
  bio: null,
};

/** A controllable promise that settles only when `resolve` is called, for observing `saving` mid-flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useProfileEditing', () => {
  let mockRefreshUser: Mock<() => Promise<void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshUser = vi.fn(async () => {});
    mocks.updateUserProfile.mockResolvedValue({ data: {} });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  describe('editName', () => {
    it('writes nothing when the dialog is cancelled', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
      await act(async () => {});

      expect(mocks.updateUserProfile).not.toHaveBeenCalled();
    });

    it(`renders the name field with maxlength ${FULL_NAME_MAX_LENGTH}`, async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      const input = await screen.findByLabelText('Full name');

      expect(input.getAttribute('maxlength')).toBe(String(FULL_NAME_MAX_LENGTH));
    });

    it('shows the schema message in the dialog and writes nothing for a blank name', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      const input = await screen.findByLabelText('Full name');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Name must be at least 2 characters')).toBeDefined();
      await act(async () => {});
      expect(mocks.updateUserProfile).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).not.toHaveBeenCalled();
      // The dialog stays open.
      expect(screen.getByLabelText('Full name')).toBeDefined();
    });

    it('trims and saves the name, refreshes before toasting, and toasts "Profile updated"', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      const input = await screen.findByLabelText('Full name');
      fireEvent.change(input, { target: { value: '  Sita Gurung ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mocks.updateUserProfile).toHaveBeenCalledWith(expect.anything(), 'user-1', {
        full_name: 'Sita Gurung',
      });
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Profile updated', color: 'green' })
      );
      expect(mockRefreshUser.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.notificationsShow.mock.invocationCallOrder[0]
      );
    });

    it('toasts our copy, never the raw error, and logs it when the write fails', async () => {
      const error = new Error('new row violates row-level security policy');
      mocks.updateUserProfile.mockResolvedValue({ error });
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      const input = await screen.findByLabelText('Full name');
      fireEvent.change(input, { target: { value: 'Sita Gurung' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't update your name. Please try again.", color: 'red' })
      );
      expect(JSON.stringify(mocks.notificationsShow.mock.calls)).not.toContain('row-level security');
      expect(mocks.logClientEvent).toHaveBeenCalledWith({
        event: 'profile_name_update_failed',
        context: { platform: 'web', userId: 'user-1' },
        error,
      });
    });

    it('toasts our copy and logs profile_name_update_failed when the write throws unexpectedly', async () => {
      const thrown = new Error('boom');
      mocks.updateUserProfile.mockRejectedValue(thrown);
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      const input = await screen.findByLabelText('Full name');
      fireEvent.change(input, { target: { value: 'Sita Gurung' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't update your name. Please try again.", color: 'red' })
      );
      expect(mocks.logClientEvent).toHaveBeenCalledWith({
        event: 'profile_name_update_failed',
        context: { platform: 'web', userId: 'user-1' },
        error: thrown,
      });
      expect(screen.getByTestId('saving').textContent).toBe('false');
    });

    it('keeps saving true through the write and the refresh, then flips false once both settle', async () => {
      const write = deferred<{ data: object }>();
      const refresh = deferred<void>();
      mocks.updateUserProfile.mockReturnValue(write.promise);
      const refreshUser: Mock<() => Promise<void>> = vi.fn(() => refresh.promise);

      render(<Harness user={mockUser} refreshUser={refreshUser} />);

      expect(screen.getByTestId('saving').textContent).toBe('false');

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      const input = await screen.findByLabelText('Full name');
      fireEvent.change(input, { target: { value: 'Sita Gurung' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(screen.getByTestId('saving').textContent).toBe('true');

      await act(async () => {
        write.resolve({ data: {} });
      });

      // The write settled but refreshUser hasn't — saving must still be true.
      expect(screen.getByTestId('saving').textContent).toBe('true');

      await act(async () => {
        refresh.resolve();
      });

      expect(screen.getByTestId('saving').textContent).toBe('false');
    });
  });

  describe('editBio', () => {
    it('trims the bio before writing it', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: '  Loves momo  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mocks.updateUserProfile).toHaveBeenCalledWith(expect.anything(), 'user-1', {
        bio: 'Loves momo',
      });
    });

    it('shows the schema message and keeps the dialog open for an over-limit bio', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: 'a'.repeat(BIO_MAX_LENGTH + 1) } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(
        await screen.findByText(`Bio must be at most ${BIO_MAX_LENGTH} characters`)
      ).toBeDefined();
      await act(async () => {});
      expect(mocks.updateUserProfile).not.toHaveBeenCalled();
      // The dialog stays open.
      expect(screen.getByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`)).toBeDefined();
    });

    it('writes null and toasts "Bio cleared" when the bio is emptied', async () => {
      const withBio: HarnessUser = { ...mockUser, bio: 'Existing bio' };
      render(<Harness user={withBio} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mocks.updateUserProfile).toHaveBeenCalledWith(expect.anything(), 'user-1', {
        bio: null,
      });
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Bio cleared', color: 'green' })
      );
    });

    it('writes the bio, refreshes before toasting, and toasts "Bio updated" for a normal bio', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: 'Loves momo and hiking' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mocks.updateUserProfile).toHaveBeenCalledWith(expect.anything(), 'user-1', {
        bio: 'Loves momo and hiking',
      });
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Bio updated', color: 'green' })
      );
      expect(mockRefreshUser.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.notificationsShow.mock.invocationCallOrder[0]
      );
    });

    it('toasts our copy, never the raw error, and logs it when the write fails', async () => {
      const error = new Error('new row violates row-level security policy');
      mocks.updateUserProfile.mockResolvedValue({ error });
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: 'Loves momo and hiking' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't update your bio. Please try again.", color: 'red' })
      );
      expect(JSON.stringify(mocks.notificationsShow.mock.calls)).not.toContain('row-level security');
      expect(mocks.logClientEvent).toHaveBeenCalledWith({
        event: 'profile_bio_update_failed',
        context: { platform: 'web', userId: 'user-1' },
        error,
      });
    });

    it('toasts our copy and logs profile_bio_update_failed when the write throws unexpectedly', async () => {
      const thrown = new Error('boom');
      mocks.updateUserProfile.mockRejectedValue(thrown);
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: 'Loves momo and hiking' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't update your bio. Please try again.", color: 'red' })
      );
      expect(mocks.logClientEvent).toHaveBeenCalledWith({
        event: 'profile_bio_update_failed',
        context: { platform: 'web', userId: 'user-1' },
        error: thrown,
      });
      expect(screen.getByTestId('saving').textContent).toBe('false');
    });
  });

  describe('changePassword', () => {
    it('toasts "Password reset email sent" on success', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
      await act(async () => {});

      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('bikal@example.com', {
        redirectTo: `${window.location.origin}/login`,
      });
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Password reset email sent', color: 'green' })
      );
    });

    it('toasts our copy, never the raw error, and logs it when sending fails', async () => {
      const error = new Error('new row violates row-level security policy');
      mocks.resetPasswordForEmail.mockResolvedValue({ error });
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
      await act(async () => {});

      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't send the reset email. Please try again.", color: 'red' })
      );
      expect(JSON.stringify(mocks.notificationsShow.mock.calls)).not.toContain('row-level security');
      expect(mocks.logClientEvent).toHaveBeenCalledWith({
        event: 'password_reset_request_failed',
        context: { platform: 'web', userId: 'user-1' },
        error,
      });
    });

    it('toasts our copy and logs password_reset_request_failed when the request throws unexpectedly', async () => {
      const thrown = new Error('boom');
      mocks.resetPasswordForEmail.mockRejectedValue(thrown);
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
      await act(async () => {});

      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Couldn't send the reset email. Please try again.", color: 'red' })
      );
      expect(mocks.logClientEvent).toHaveBeenCalledWith({
        event: 'password_reset_request_failed',
        context: { platform: 'web', userId: 'user-1' },
        error: thrown,
      });
      expect(screen.getByTestId('saving').textContent).toBe('false');
    });

    it('flips saving true while the request is in flight and false once it settles', async () => {
      const { promise, resolve } = deferred<{ error: null }>();
      mocks.resetPasswordForEmail.mockReturnValue(promise);
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
      await act(async () => {});

      expect(screen.getByTestId('saving').textContent).toBe('true');

      await act(async () => {
        resolve({ error: null });
      });

      expect(screen.getByTestId('saving').textContent).toBe('false');
    });
  });

  describe('with a null user', () => {
    it('is a no-op for all three actions', async () => {
      render(<Harness user={null} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
      await act(async () => {});

      expect(mocks.updateUserProfile).not.toHaveBeenCalled();
      expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Full name')).toBeNull();
    });
  });
});
