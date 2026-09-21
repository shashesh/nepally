import React from 'react';
import { render, screen, fireEvent, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BIO_MAX_LENGTH } from '@nepally/shared';
import type { User } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  updateUserProfile: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  notificationsShow: vi.fn(),
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
  const { editName, editBio, changePassword } = useProfileEditing(user, refreshUser);
  return (
    <>
      <button type="button" onClick={() => { editName(); }}>
        Edit name
      </button>
      <button type="button" onClick={() => { editBio(); }}>
        Edit bio
      </button>
      <button type="button" onClick={() => { changePassword(); }}>
        Change password
      </button>
    </>
  );
}

const mockUser: HarnessUser = {
  id: 'user-1',
  email: 'bikal@example.com',
  full_name: 'Bikal Shrestha',
  bio: null,
};

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

    it('shows "Name cannot be empty" in the dialog and writes nothing for a blank name', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      const input = await screen.findByLabelText('Full name');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Name cannot be empty')).toBeDefined();
      await act(async () => {});
      expect(mocks.updateUserProfile).not.toHaveBeenCalled();
      // The dialog stays open.
      expect(screen.getByLabelText('Full name')).toBeDefined();
    });

    it('trims and saves the name, refreshes, and toasts "Profile updated"', async () => {
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
        expect.objectContaining({ message: 'Profile updated' })
      );
    });

    it('toasts the error message when the write fails', async () => {
      mocks.updateUserProfile.mockResolvedValue({ error: new Error('Network down') });
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
      const input = await screen.findByLabelText('Full name');
      fireEvent.change(input, { target: { value: 'Sita Gurung' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Network down' })
      );
    });
  });

  describe('editBio', () => {
    it('shows the schema message in the dialog and writes nothing for a 201-character bio', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: 'a'.repeat(201) } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Bio must be at most 200 characters')).toBeDefined();
      await act(async () => {});
      expect(mocks.updateUserProfile).not.toHaveBeenCalled();
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
        expect.objectContaining({ message: 'Bio cleared' })
      );
    });

    it('writes the bio and toasts "Bio updated" for a normal bio', async () => {
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: 'Loves momo and hiking' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mocks.updateUserProfile).toHaveBeenCalledWith(expect.anything(), 'user-1', {
        bio: 'Loves momo and hiking',
      });
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Bio updated' })
      );
    });

    it('toasts the error message when the write fails', async () => {
      mocks.updateUserProfile.mockResolvedValue({ error: new Error('Bio write failed') });
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Edit bio' }));
      const textarea = await screen.findByLabelText(`Bio (up to ${BIO_MAX_LENGTH} characters)`);
      fireEvent.change(textarea, { target: { value: 'Loves momo and hiking' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await act(async () => {});

      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Bio write failed' })
      );
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
        expect.objectContaining({ message: 'Password reset email sent' })
      );
    });

    it('toasts the error message when sending fails', async () => {
      mocks.resetPasswordForEmail.mockResolvedValue({ error: new Error('Rate limited') });
      render(<Harness user={mockUser} refreshUser={mockRefreshUser} />);

      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
      await act(async () => {});

      expect(mocks.notificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Rate limited' })
      );
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
