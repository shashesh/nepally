import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getUserSettingsMock: vi.fn(),
  upsertUserSettingsMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getUserSettings: mocks.getUserSettingsMock,
    upsertUserSettings: mocks.upsertUserSettingsMock,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

import NotificationPreferencesPage from './notifications.page';

const mockReplace = vi.fn();

const mockUser = { id: 'u1', full_name: 'Test User', email: 'test@nusa.app', trust_level: 1 };

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouterMock.mockReturnValue({ replace: mockReplace, pathname: '/profile/notifications' });
    mocks.getUserSettingsMock.mockResolvedValue({ data: null });
    mocks.upsertUserSettingsMock.mockResolvedValue({});
  });

  it('redirects to /login when not authenticated', async () => {
    mocks.useAuthMock.mockReturnValue({ user: null, loading: false });
    render(<NotificationPreferencesPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('loads and shows existing settings', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.getUserSettingsMock.mockResolvedValue({
      data: {
        user_id: 'u1',
        email_notifications: true,
        push_notifications: false,
        emergency_alerts: true,
        metro_area_alerts: true,
        notify_chat: 'batched',
        notify_comments: false,
        notify_likes: 'off',
      },
    });
    render(<NotificationPreferencesPage />);
    await waitFor(() => expect(screen.getByText('Save Preferences')).toBeDefined());
    // push toggle should be unchecked
    const pushToggle = screen.getAllByRole('checkbox')[0];
    expect((pushToggle as HTMLInputElement).checked).toBe(false);
  });

  it('saves preferences when Save is clicked', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    render(<NotificationPreferencesPage />);
    await waitFor(() => expect(screen.getByText('Save Preferences')).toBeDefined());
    fireEvent.click(screen.getByText('Save Preferences'));
    await waitFor(() => {
      expect(mocks.upsertUserSettingsMock).toHaveBeenCalledWith(
        expect.anything(),
        'u1',
        expect.objectContaining({ push_notifications: true })
      );
    });
  });

  it('shows error message when save fails', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    mocks.upsertUserSettingsMock.mockResolvedValue({ error: new Error('fail') });
    render(<NotificationPreferencesPage />);
    await waitFor(() => expect(screen.getByText('Save Preferences')).toBeDefined());
    fireEvent.click(screen.getByText('Save Preferences'));
    await waitFor(() => expect(screen.getByText('Failed to save preferences. Please try again.')).toBeDefined());
  });

  it('emergency alerts checkbox is always checked and disabled', async () => {
    mocks.useAuthMock.mockReturnValue({ user: mockUser, loading: false });
    render(<NotificationPreferencesPage />);
    await waitFor(() => expect(screen.getByText('Save Preferences')).toBeDefined());
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const emergencyCheckbox = checkboxes[checkboxes.length - 1];
    expect(emergencyCheckbox.checked).toBe(true);
    expect(emergencyCheckbox.disabled).toBe(true);
  });
});
