import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
  useUserSettings: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../hooks/useUserSettings', () => ({ useUserSettings: mocks.useUserSettings }));
vi.mock('../../components/ui/notify', () => ({ notify: { error: mocks.notifyError, success: mocks.notifySuccess } }));
vi.mock('next/router', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

import NotificationPreferencesPage from './notifications.page';

const VIEWER = { id: 'user-1', full_name: 'Test User' };

function settingsState(overrides: Record<string, unknown> = {}) {
  return {
    values: { ...DEFAULT_USER_SETTINGS },
    loading: false,
    error: null,
    reload: vi.fn(),
    setValue: vi.fn(),
    saving: false,
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('NotificationPreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: VIEWER, loading: false });
    mocks.useUserSettings.mockReturnValue(settingsState());
  });

  it('sends a signed-out visitor to log in', async () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    render(<NotificationPreferencesPage />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });

  it('has a plain heading and a way back to notifications', () => {
    render(<NotificationPreferencesPage />);

    expect(mocks.useUserSettings).toHaveBeenCalledWith('user-1');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Notification preferences');
    expect(screen.getByRole('link', { name: 'Notifications' }).getAttribute('href')).toBe('/notifications');
  });

  it('names every control', () => {
    render(<NotificationPreferencesPage />);

    expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeDefined();
    expect(screen.getByRole('radiogroup', { name: 'Chat messages' })).toBeDefined();
    expect(screen.getByRole('switch', { name: 'Comments' })).toBeDefined();
    expect(screen.getByRole('radiogroup', { name: 'Likes' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Batched, every 30 minutes' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'When 5 or more likes arrive' })).toBeDefined();
  });

  it('describes a switch without folding the description into its name', () => {
    render(<NotificationPreferencesPage />);

    const comments = screen.getByRole('switch', { name: 'Comments' });
    const describedBy = comments.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('When someone comments on your post');
  });

  it('shows the loaded values', () => {
    render(<NotificationPreferencesPage />);

    expect((screen.getByRole('radio', { name: 'Every message' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: 'When 5 or more likes arrive' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('switch', { name: 'Comments' }) as HTMLInputElement).checked).toBe(true);
  });

  it('keeps emergency alerts on', () => {
    render(<NotificationPreferencesPage />);

    const emergency = screen.getByRole('switch', { name: 'Emergency alerts' }) as HTMLInputElement;
    expect(emergency.checked).toBe(true);
    expect(emergency.disabled).toBe(true);
  });

  it('edits one field at a time', () => {
    const state = settingsState();
    mocks.useUserSettings.mockReturnValue(state);
    render(<NotificationPreferencesPage />);

    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Likes' })).getByRole('radio', { name: 'Off' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Comments' }));

    expect(state.setValue).toHaveBeenCalledWith('notify_likes', 'off');
    expect(state.setValue).toHaveBeenCalledWith('notify_comments', false);
  });

  it('offers a retry and no form when the preferences failed to load', () => {
    const state = settingsState({ values: null, error: "Couldn't load your notification preferences." });
    mocks.useUserSettings.mockReturnValue(state);
    render(<NotificationPreferencesPage />);

    expect(screen.getByText("Couldn't load your notification preferences.")).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Save preferences' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.reload).toHaveBeenCalledTimes(1);
  });

  it('shows no form while loading', () => {
    mocks.useUserSettings.mockReturnValue(settingsState({ values: null, loading: true }));
    render(<NotificationPreferencesPage />);

    expect(screen.queryByRole('button', { name: 'Save preferences' })).toBeNull();
  });

  it('saves and says so', async () => {
    const state = settingsState();
    mocks.useUserSettings.mockReturnValue(state);
    render(<NotificationPreferencesPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
    });

    expect(state.save).toHaveBeenCalledTimes(1);
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Preferences saved.');
  });

  it('says so when saving fails', async () => {
    mocks.useUserSettings.mockReturnValue(settingsState({ save: vi.fn().mockResolvedValue(false) }));
    render(<NotificationPreferencesPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));
    });

    expect(mocks.notifyError).toHaveBeenCalledWith("Couldn't save your preferences. Please try again.");
  });

  it('keeps Save focusable and ignores presses while saving', () => {
    const state = settingsState({ saving: true });
    mocks.useUserSettings.mockReturnValue(state);
    render(<NotificationPreferencesPage />);

    const save = screen.getByRole('button', { name: 'Save preferences' }) as HTMLButtonElement;
    expect(save.getAttribute('aria-disabled')).toBe('true');
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(state.save).not.toHaveBeenCalled();
  });
});

