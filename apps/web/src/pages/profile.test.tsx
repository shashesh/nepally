import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const profileMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getPostsByAuthorIdMock: vi.fn(),
  getSavedPostsByUserIdMock: vi.fn(),
  getListingsByOwnerMock: vi.fn(),
  unsavePostMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
  updateUserProfileMock: vi.fn(),
  removeProfilePhotoMock: vi.fn(),
  replaceProfilePhotoMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  signOutMock: vi.fn(),
  notificationsShowMock: vi.fn(),
  logClientEventMock: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: profileMocks.notificationsShowMock },
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: profileMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: profileMocks.useRouterMock }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { resetPasswordForEmail: profileMocks.resetPasswordForEmailMock },
  },
}));
vi.mock('../lib/profilePhoto', () => ({
  replaceProfilePhoto: profileMocks.replaceProfilePhotoMock,
}));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getPostsByAuthorId: profileMocks.getPostsByAuthorIdMock,
    getSavedPostsByUserId: profileMocks.getSavedPostsByUserIdMock,
    getListingsByOwner: profileMocks.getListingsByOwnerMock,
    unsavePost: profileMocks.unsavePostMock,
    formatRelativeTime: profileMocks.formatRelativeTimeMock,
    updateUserProfile: profileMocks.updateUserProfileMock,
    removeProfilePhoto: profileMocks.removeProfilePhotoMock,
    logClientEvent: profileMocks.logClientEventMock,
  };
});
vi.mock('../components/Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': 'avatar' }, name),
}));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

const mockUser = {
  id: 'user-1',
  full_name: 'Bikal Shrestha',
  email: 'bikal@example.com',
  trust_level: 1,
  profile_photo: null,
  bio: null,
  metro_area_id: '19100',
  created_at: '2024-03-15T12:00:00Z',
};

const savedPost = {
  id: 'saved-post-1',
  title: 'Saved Housing Post',
  description: '',
  is_global: false,
  likes_count: 0,
  comments_count: 0,
  created_at: '2026-02-24T10:00:00Z',
  author_id: 'other-user',
};

import ProfilePage from './profile.page';

describe('ProfilePage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockSignOut = vi.fn();
  const mockRefreshUser = vi.fn();

  function mockSignedIn(overrides: Record<string, unknown> = {}) {
    profileMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, ...overrides },
      signOut: mockSignOut,
      refreshUser: mockRefreshUser,
    });
  }

  async function renderPage() {
    render(<ProfilePage />);
    await act(async () => {});
  }

  async function openTab(name: string) {
    fireEvent.click(screen.getByRole('tab', { name }));
    await act(async () => {});
  }

  async function chooseProfileMenuItem(name: string) {
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    const item = await screen.findByRole('menuitem', { name });
    await act(async () => {
      fireEvent.click(item);
    });
  }

  async function pickPhoto(file: File) {
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Upload profile photo'), { target: { files: [file] } });
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    profileMocks.useRouterMock.mockReturnValue({ push: mockPush, replace: mockReplace });
    mockSignedIn();
    // clearAllMocks keeps implementations, so reset the ones tests override.
    mockPush.mockResolvedValue(true);
    mockSignOut.mockResolvedValue(undefined);
    mockRefreshUser.mockResolvedValue(undefined);
    profileMocks.getPostsByAuthorIdMock.mockResolvedValue({ data: [] });
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({ data: [] });
    profileMocks.getListingsByOwnerMock.mockResolvedValue({ data: [] });
    profileMocks.unsavePostMock.mockResolvedValue({});
    profileMocks.formatRelativeTimeMock.mockReturnValue('2h ago');
  });

  it('redirects to /login when user is not logged in', async () => {
    profileMocks.useAuthMock.mockReturnValue({ user: null, signOut: mockSignOut, refreshUser: mockRefreshUser });
    render(<ProfilePage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('loads own posts including pending (e.g. an Emergency post awaiting review)', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(profileMocks.getPostsByAuthorIdMock).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        30,
        undefined,
        true
      );
    });
  });

  it('renders user name, email, and trust level', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getAllByText('Bikal Shrestha').length).toBeGreaterThan(0);
      expect(screen.getByText('bikal@example.com')).toBeDefined();
      expect(screen.getByText('Verified')).toBeDefined();
    });
  });

  it('has one h1, the "Profile" page title, and heads the card with the member name', async () => {
    await renderPage();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('Profile');
    expect(screen.getByRole('heading', { level: 2, name: 'Bikal Shrestha' })).toBeDefined();
  });

  it('shows Posts tab as active by default', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Posts' })).toBeDefined());
    expect(screen.getByRole('tab', { name: 'Posts' }).getAttribute('aria-selected')).toBe('true');
  });

  it('names the tab list "Profile sections" and scrolls a focused tab fully into view', async () => {
    const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    try {
      await renderPage();

      const tabs = within(screen.getByRole('tablist', { name: 'Profile sections' })).getAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual(['Posts', 'Listings', 'Saved Posts', 'About']);

      tabs[3].focus();
      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    } finally {
      scrollIntoViewSpy.mockRestore();
    }
  });

  it('shows empty posts message when user has no posts', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('You have not created any posts yet.')).toBeDefined();
    });
  });

  it('offers "Start a post" on the empty Posts tab to a verified member', async () => {
    await renderPage();

    expect(screen.getByRole('link', { name: 'Start a post' }).getAttribute('href')).toBe('/posts/create');
  });

  it('does not offer "Start a post" to a new member, whom /posts/create turns away', async () => {
    mockSignedIn({ trust_level: 0 });
    await renderPage();

    expect(screen.getByText('You have not created any posts yet.')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Start a post' })).toBeNull();
  });

  it('shows user posts when loaded', async () => {
    profileMocks.getPostsByAuthorIdMock.mockResolvedValue({
      data: [
        {
          id: 'post-1',
          title: 'My Post',
          description: 'Post description',
          is_global: false,
          likes_count: 3,
          comments_count: 1,
          created_at: '2026-02-24T10:00:00Z',
        },
      ],
    });
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('My Post')).toBeDefined();
    });
  });

  it('switches to Saved Posts tab', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Saved Posts' })).toBeDefined());
    fireEvent.click(screen.getByRole('tab', { name: 'Saved Posts' }));
    await waitFor(() => {
      expect(screen.getByText('No saved posts yet.')).toBeDefined();
    });
  });

  it('switches to About tab', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'About' })).toBeDefined());
    fireEvent.click(screen.getByRole('tab', { name: 'About' }));
    expect(screen.getByRole('region', { name: 'Account Info' })).toBeDefined();
    expect(screen.queryByText('You have not created any posts yet.')).toBeNull();
  });

  it('opens and closes the profile menu', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByLabelText('Open profile menu')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Open profile menu'));
    expect(await screen.findByRole('menuitem', { name: 'Logout' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Change Password' })).toBeDefined();
    // Close by clicking the trigger again
    fireEvent.click(screen.getByLabelText('Open profile menu'));
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Logout' })).toBeNull());
  });

  it('calls signOut and redirects to / on Logout', async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByLabelText('Open profile menu')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Open profile menu'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Logout' }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('leaves for / before signing out, so a remount under the signed-out shell has nothing to redirect', async () => {
    // Layout swaps to PublicShell once the user clears, which remounts the
    // page; only leaving first keeps its /login redirect out of the race.
    await renderPage();

    await chooseProfileMenuItem('Logout');

    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.invocationCallOrder[0]).toBeLessThan(mockSignOut.mock.invocationCallOrder[0]);
  });

  it('toasts the error when logging out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('Network down'));
    await renderPage();

    await chooseProfileMenuItem('Logout');

    expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network down', color: 'red' })
    );
  });

  it('opens the "Edit name" dialog from the profile menu', async () => {
    await renderPage();

    await chooseProfileMenuItem('Edit Name');

    expect(await screen.findByRole('dialog', { name: 'Edit name' })).toBeDefined();
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Bikal Shrestha');
  });

  it('disables the three edit items while a change is being saved', async () => {
    profileMocks.resetPasswordForEmailMock.mockReturnValue(new Promise(() => {}));
    await renderPage();

    await chooseProfileMenuItem('Change Password');
    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));

    for (const name of ['Edit Name', 'Edit Bio', 'Change Password']) {
      expect(((await screen.findByRole('menuitem', { name })) as HTMLButtonElement).disabled).toBe(true);
    }
    expect((screen.getByRole('menuitem', { name: 'Logout' }) as HTMLButtonElement).disabled).toBe(false);
  });

  // ─── Profile photo ───────────────────────────────────────

  it('shows Add Photo button when user has no profile photo', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('Add Photo')).toBeDefined();
    });
  });

  it('shows Change Photo and Remove buttons when user has a profile photo', async () => {
    profileMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, profile_photo: 'https://example.com/photo.jpg' },
      signOut: mockSignOut,
      refreshUser: mockRefreshUser,
    });
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('Change Photo')).toBeDefined();
      expect(screen.getByText('Remove')).toBeDefined();
    });
  });

  it('uploads a picked photo, refreshes the member and toasts "Photo updated"', async () => {
    profileMocks.replaceProfilePhotoMock.mockResolvedValue({ error: null });
    await renderPage();
    const file = new File(['x'], 'me.png', { type: 'image/png' });

    await pickPhoto(file);

    expect(profileMocks.replaceProfilePhotoMock).toHaveBeenCalledWith(expect.anything(), 'user-1', file);
    expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Photo updated', color: 'green' })
    );
  });

  it('toasts the error when an upload fails, without refreshing', async () => {
    const message = "We couldn't process that image. Try a different JPEG or PNG.";
    profileMocks.replaceProfilePhotoMock.mockResolvedValue({ error: message });
    await renderPage();

    await pickPhoto(new File(['x'], 'me.png', { type: 'image/png' }));

    expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message, color: 'red' })
    );
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('logs and toasts "Failed to update photo" when a photo change throws, then clears busy', async () => {
    profileMocks.replaceProfilePhotoMock.mockRejectedValue(new Error('boom'));
    await renderPage();

    await pickPhoto(new File(['x'], 'me.png', { type: 'image/png' }));

    expect(profileMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_photo_change_failed', context: { platform: 'web', userId: 'user-1' } })
    );
    expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to update photo', color: 'red' })
    );
    expect(screen.getByRole('button', { name: 'Add Photo' }).getAttribute('aria-disabled')).toBeNull();
  });

  it('marks the photo control busy while an upload runs', async () => {
    profileMocks.replaceProfilePhotoMock.mockReturnValue(new Promise(() => {}));
    await renderPage();

    await pickPhoto(new File(['x'], 'me.png', { type: 'image/png' }));

    expect(screen.getByRole('button', { name: 'Add Photo' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Updating photo…')).toBeDefined();
  });

  it('removes the photo through removeProfilePhoto and toasts "Photo removed"', async () => {
    profileMocks.removeProfilePhotoMock.mockResolvedValue({});
    mockSignedIn({ profile_photo: 'https://example.com/photo.jpg' });
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    });

    expect(profileMocks.removeProfilePhotoMock).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Photo removed', color: 'green' })
    );
  });

  it('toasts the error when removing the photo fails, without refreshing', async () => {
    profileMocks.removeProfilePhotoMock.mockResolvedValue({ error: new Error('Storage offline') });
    mockSignedIn({ profile_photo: 'https://example.com/photo.jpg' });
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    });

    expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Storage offline', color: 'red' })
    );
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  // ─── Lists ───────────────────────────────────────────────

  it('shows posts loading state', () => {
    profileMocks.getPostsByAuthorIdMock.mockReturnValue(new Promise(() => {}));
    profileMocks.getSavedPostsByUserIdMock.mockReturnValue(new Promise(() => {}));
    render(<ProfilePage />);
    const label = screen.getByText('Loading posts…');
    expect(label.closest('[role="status"]')?.getAttribute('aria-busy')).toBe('true');
  });

  it('shows error when posts fail to load', async () => {
    profileMocks.getPostsByAuthorIdMock.mockResolvedValue({
      error: new Error('DB error'),
      data: null,
    });
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('DB error')).toBeDefined();
    });
  });

  it('refetches a list that failed to load when "Try again" is pressed', async () => {
    profileMocks.getPostsByAuthorIdMock
      .mockResolvedValueOnce({ error: new Error('DB error'), data: null })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'post-1',
            title: 'My Post',
            description: '',
            is_global: false,
            likes_count: 0,
            comments_count: 0,
            created_at: '2026-02-24T10:00:00Z',
          },
        ],
      });
    await renderPage();
    expect(screen.getByText('DB error')).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });

    expect(profileMocks.getPostsByAuthorIdMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('DB error')).toBeNull();
    expect(screen.getByText('My Post')).toBeDefined();
  });

  // ─── Saved Posts tab tests ────────────────────────────────

  it('shows saved posts when loaded in Saved Posts tab', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({
      data: [
        {
          id: 'saved-post-1',
          title: 'Saved Housing Post',
          description: 'Great deal on housing',
          is_global: false,
          likes_count: 7,
          comments_count: 2,
          created_at: '2026-02-24T10:00:00Z',
          author_id: 'other-user',
        },
      ],
    });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Saved Posts' })).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: 'Saved Posts' }));

    await waitFor(() => {
      expect(screen.getByText('Saved Housing Post')).toBeDefined();
    });
  });

  it('shows unsave menu option for saved posts', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({ data: [savedPost] });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Saved Posts' })).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: 'Saved Posts' }));

    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));

    expect(await screen.findByRole('menuitem', { name: 'Unsave Post' })).toBeDefined();
  });

  it('calls unsavePost and removes post from list when Unsave Post is clicked', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({ data: [savedPost] });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Saved Posts' })).toBeDefined());
    fireEvent.click(screen.getByRole('tab', { name: 'Saved Posts' }));

    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Unsave Post' }));

    await waitFor(() => {
      expect(profileMocks.unsavePostMock).toHaveBeenCalledWith(expect.anything(), 'saved-post-1');
    });
    expect(screen.queryByText('Saved Housing Post')).toBeNull();
  });

  it('shows "Post unsaved." toast after unsaving', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({ data: [savedPost] });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Saved Posts' })).toBeDefined());
    fireEvent.click(screen.getByRole('tab', { name: 'Saved Posts' }));

    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Unsave Post' }));

    await waitFor(() => {
      expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Post unsaved.', color: 'green' })
      );
    });
  });

  it('shows error toast and puts the post back when unsave fails', async () => {
    profileMocks.unsavePostMock.mockResolvedValue({ error: new Error('network') });
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({ data: [savedPost] });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Saved Posts' })).toBeDefined());
    fireEvent.click(screen.getByRole('tab', { name: 'Saved Posts' }));

    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Unsave Post' }));

    await waitFor(() => {
      expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to unsave post.', color: 'red' })
      );
    });
    expect(screen.getByText('Saved Housing Post')).toBeDefined();
  });

  it('moves focus to the Saved panel, without scrolling, when unsaving takes the focused menu away with its row', async () => {
    profileMocks.unsavePostMock.mockReturnValue(new Promise(() => {}));
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({ data: [savedPost] });
    await renderPage();
    await openTab('Saved Posts');
    const panel = screen.getByRole('tabpanel', { name: 'Saved Posts' });
    const panelFocus = vi.spyOn(panel, 'focus');

    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    const item = await screen.findByRole('menuitem', { name: 'Unsave Post' });
    item.focus();
    await act(async () => {
      fireEvent.click(item);
    });

    // Hidden at once, before the delete settles, and focus follows.
    expect(screen.queryByText('Saved Housing Post')).toBeNull();
    expect(document.activeElement).toBe(panel);
    // The panel is often taller than the viewport; a plain focus() jumps the page.
    expect(panelFocus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('leaves focus where it is after an unsave when it was not lost', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({ data: [savedPost] });
    await renderPage();
    await openTab('Saved Posts');

    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));
    const item = await screen.findByRole('menuitem', { name: 'Unsave Post' });
    const savedTab = screen.getByRole('tab', { name: 'Saved Posts' });
    savedTab.focus();
    await act(async () => {
      fireEvent.click(item);
    });

    expect(screen.queryByText('Saved Housing Post')).toBeNull();
    expect(document.activeElement).toBe(savedTab);
  });

  it('shows error when saved posts fail to load', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({
      error: new Error('Saved posts DB error'),
      data: null,
    });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Saved Posts' })).toBeDefined());

    fireEvent.click(screen.getByRole('tab', { name: 'Saved Posts' }));

    await waitFor(() => {
      expect(screen.getByText('Saved posts DB error')).toBeDefined();
    });
  });

  // ─── About You section tests ─────────────────────────────────────────────

  it('renders the About You section with initial values', async () => {
    profileMocks.useAuthMock.mockReturnValue({
      user: {
        ...mockUser,
        hometown_district: 'Kathmandu',
        college: 'Pulchowk',
        years_in_us: 5,
        languages: ['nepali'],
      },
      signOut: mockSignOut,
      refreshUser: mockRefreshUser,
    });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('tab', { name: 'About' })).toBeDefined());
    fireEvent.click(screen.getByRole('tab', { name: 'About' }));

    await waitFor(() => {
      expect(screen.getByText('About You')).toBeDefined();
      expect((screen.getByLabelText('Hometown district') as HTMLSelectElement).value).toBe('Kathmandu');
      expect((screen.getByLabelText('College / university') as HTMLInputElement).value).toBe('Pulchowk');
    });
  });

  it('sends About You values to updateUserProfile on save', async () => {
    profileMocks.updateUserProfileMock.mockResolvedValue({ data: { id: 'user-1' } });
    render(<ProfilePage />);

    // navigate to About tab
    await waitFor(() => expect(screen.getByRole('tab', { name: 'About' })).toBeDefined());
    fireEvent.click(screen.getByRole('tab', { name: 'About' }));

    // wait for About You section to appear
    await waitFor(() => expect(screen.getByLabelText('Hometown district')).toBeDefined());

    // simulate selecting Lalitpur — fireEvent.change fires React's onChange with the new value
    const districtSelect = screen.getByLabelText('Hometown district');
    Object.defineProperty(districtSelect, 'value', { writable: true, value: 'Lalitpur' });
    fireEvent.change(districtSelect);

    // click save
    fireEvent.click(screen.getByRole('button', { name: /save about you/i }));

    await waitFor(() => {
      expect(profileMocks.updateUserProfileMock).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        expect.objectContaining({ hometown_district: 'Lalitpur' })
      );
    });
  });

  it('logs and toasts "Failed to save" when saving About You throws, and re-enables Save', async () => {
    profileMocks.updateUserProfileMock.mockRejectedValue(new Error('offline'));
    await renderPage();
    await openTab('About');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));
    });

    expect(profileMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_about_you_save_failed', context: { platform: 'web', userId: 'user-1' } })
    );
    expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to save', color: 'red' })
    );
    expect((screen.getByRole('button', { name: 'Save About You' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('saves a whitespace-only college as null', async () => {
    profileMocks.updateUserProfileMock.mockResolvedValue({ data: { id: 'user-1' } });
    await renderPage();
    await openTab('About');

    fireEvent.change(screen.getByLabelText('College / university'), { target: { value: '   ' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));
    });

    expect(profileMocks.updateUserProfileMock).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ college: null })
    );
  });

  it('trims a padded college on save and shows the trimmed text afterward', async () => {
    profileMocks.updateUserProfileMock.mockResolvedValue({ data: { id: 'user-1' } });
    await renderPage();
    await openTab('About');

    fireEvent.change(screen.getByLabelText('College / university'), {
      target: { value: '  Pulchowk Campus  ' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));
    });

    expect(profileMocks.updateUserProfileMock).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ college: 'Pulchowk Campus' })
    );
    expect((screen.getByLabelText('College / university') as HTMLInputElement).value).toBe(
      'Pulchowk Campus'
    );
  });

  it('shows "— Select —" for a saved district outside NEPAL_DISTRICTS and saves it as null', async () => {
    profileMocks.updateUserProfileMock.mockResolvedValue({ data: { id: 'user-1' } });
    mockSignedIn({ hometown_district: 'Nawalparasi' });
    await renderPage();
    await openTab('About');

    expect((screen.getByLabelText('Hometown district') as HTMLSelectElement).value).toBe('');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));
    });

    expect(profileMocks.updateUserProfileMock).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ hometown_district: null })
    );
  });

  it('drops a saved language outside SUPPORTED_LANGUAGES and saves without it', async () => {
    profileMocks.updateUserProfileMock.mockResolvedValue({ data: { id: 'user-1' } });
    mockSignedIn({ languages: ['nepali', 'sherpa'] });
    await renderPage();
    await openTab('About');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));
    });

    expect(profileMocks.updateUserProfileMock).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ languages: ['nepali'] })
    );
  });

  it('keeps focus on Save while a save is pending and ignores a second click', async () => {
    let resolveUpdate: (value: { data: { id: string } }) => void = () => {};
    profileMocks.updateUserProfileMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
    );
    await renderPage();
    await openTab('About');

    // Looked up by name at every step: the label stays "Save About You"
    // whether idle or saving (a spinner carries the progress cue instead of
    // the accessible name). In Mantine 8.3.18 the label stays in the DOM and
    // in the accessibility tree even under `loading`, so this lookup alone
    // wouldn't catch a regression back to that prop — the disabled/
    // aria-disabled assertions below are what actually guard the fix.
    screen.getByRole('button', { name: 'Save About You' }).focus();

    fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));
    await act(async () => {});

    const pendingSaveButton = screen.getByRole('button', { name: 'Save About You' });
    expect(document.activeElement).toBe(pendingSaveButton);
    // `loading` (not just `disabled`) would set the native attribute, which
    // both drops focus to <body> on Enter in a real browser and makes React
    // ignore a click outright — either would make the assertions above and
    // below pass even with the bug back, so this must hold too.
    expect(pendingSaveButton.hasAttribute('disabled')).toBe(false);
    expect(pendingSaveButton.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Save About You' }));
    await act(async () => {});

    expect(profileMocks.updateUserProfileMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate({ data: { id: 'user-1' } });
    });
  });

  it('shows the account details on the About tab and edits the bio from there', async () => {
    await renderPage();
    await openTab('About');

    expect(screen.getByRole('heading', { name: 'Account Info' })).toBeDefined();
    expect(screen.getByText('March 15, 2024')).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add a bio' }));
    });

    expect(await screen.findByRole('dialog', { name: 'Edit bio' })).toBeDefined();
  });

  it('lists settings and secondary pages under "Settings & more"', async () => {
    render(<ProfilePage />);
    const settings = await screen.findByRole('navigation', { name: 'Settings & more' });
    const hrefs = Array.from(settings.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/profile/locations', '/profile/notifications', '/guidelines', '/help', '/privacy', '/terms']);
  });

  it('includes Moderation for moderators', async () => {
    profileMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, is_moderator: true },
      signOut: mockSignOut,
      refreshUser: mockRefreshUser,
    });
    render(<ProfilePage />);
    const settings = await screen.findByRole('navigation', { name: 'Settings & more' });
    expect(Array.from(settings.querySelectorAll('a')).map((link) => link.getAttribute('href'))).toContain('/moderation');
  });

  it('fills About You from the user once the profile loads after the first render', async () => {
    profileMocks.useAuthMock.mockReturnValue({ user: null, signOut: mockSignOut, refreshUser: mockRefreshUser });
    const { rerender } = render(<ProfilePage />);

    profileMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, hometown_district: 'Kathmandu', college: 'Pulchowk', languages: [] },
      signOut: mockSignOut,
      refreshUser: mockRefreshUser,
    });
    rerender(<ProfilePage />);
    fireEvent.click(await screen.findByRole('tab', { name: 'About' }));

    await waitFor(() => {
      expect((screen.getByLabelText('Hometown district') as HTMLSelectElement).value).toBe('Kathmandu');
      expect((screen.getByLabelText('College / university') as HTMLInputElement).value).toBe('Pulchowk');
    });
  });

  it('keeps in-progress About You edits when the same user re-renders', async () => {
    const { rerender } = render(<ProfilePage />);
    fireEvent.click(await screen.findByRole('tab', { name: 'About' }));
    const collegeInput = (await screen.findByLabelText('College / university')) as HTMLInputElement;
    fireEvent.change(collegeInput, { target: { value: 'Tribhuvan University' } });

    // e.g. refreshUser() hands back a new object for the same signed-in user
    profileMocks.useAuthMock.mockReturnValue({
      user: { ...mockUser, bio: 'updated bio' },
      signOut: mockSignOut,
      refreshUser: mockRefreshUser,
    });
    rerender(<ProfilePage />);

    expect((screen.getByLabelText('College / university') as HTMLInputElement).value).toBe(
      'Tribhuvan University'
    );
  });

  // ─── Listings tab ────────────────────────────────────────

  it('offers "Post a listing" on the empty Listings tab', async () => {
    await renderPage();
    await openTab('Listings');

    expect(screen.getByText('No marketplace listings yet.')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Post a listing' }).getAttribute('href')).toBe('/marketplace/create');
  });

  it('warns with the days left for a listing close to soft expiry', async () => {
    profileMocks.getListingsByOwnerMock.mockResolvedValue({
      data: [
        {
          id: 'listing-1',
          title: 'Momo Catering',
          status: 'active',
          photos: [],
          price: null,
          category: { name: 'Food & Restaurants', emoji: '🍜' },
          views_count: 1,
          saves_count: 0,
          contacts_count: 0,
          refreshed_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    });
    render(<ProfilePage />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Listings' }));

    await waitFor(() => {
      expect(screen.getByText('Expires in 10 days')).toBeDefined();
    });
  });
});
