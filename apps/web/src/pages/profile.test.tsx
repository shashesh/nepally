import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
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
  uploadProfilePhotoMock: vi.fn(),
  deleteProfilePhotoMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  signOutMock: vi.fn(),
  notificationsShowMock: vi.fn(),
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
    uploadProfilePhoto: profileMocks.uploadProfilePhotoMock,
    deleteProfilePhoto: profileMocks.deleteProfilePhotoMock,
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
  metro_area_id: '19100',
};

import ProfilePage from './profile.page';

describe('ProfilePage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockSignOut = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    profileMocks.useRouterMock.mockReturnValue({ push: mockPush, replace: mockReplace });
    profileMocks.useAuthMock.mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      refreshUser: mockRefreshUser,
    });
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
      expect(screen.getByText(/Level 1/)).toBeDefined();
    });
  });

  it('shows Posts tab as active by default', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Posts' })).toBeDefined());
    expect(screen.getByRole('button', { name: 'Posts' })).toBeDefined();
  });

  it('shows empty posts message when user has no posts', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText('You have not created any posts yet.')).toBeDefined();
    });
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved Posts' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Saved Posts' }));
    await waitFor(() => {
      expect(screen.getByText('No saved posts yet.')).toBeDefined();
    });
  });

  it('switches to About tab', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'About' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    // About tab should render some content; just check no posts content
    expect(screen.queryByText('You have not created any posts yet.')).toBeNull();
  });

  it('opens and closes the profile menu', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByLabelText('Open profile menu')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Open profile menu'));
    expect(screen.getByText('Logout')).toBeDefined();
    expect(screen.getByText('Change Password')).toBeDefined();
    // Close by clicking hamburger again
    fireEvent.click(screen.getByLabelText('Open profile menu'));
    await waitFor(() => expect(screen.queryByText('Logout')).toBeNull());
  });

  it('calls signOut and redirects to / on Logout', async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByLabelText('Open profile menu')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Open profile menu'));
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

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

  it('shows posts loading state', () => {
    profileMocks.getPostsByAuthorIdMock.mockReturnValue(new Promise(() => {}));
    profileMocks.getSavedPostsByUserIdMock.mockReturnValue(new Promise(() => {}));
    render(<ProfilePage />);
    expect(screen.getByText('Loading...')).toBeDefined();
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved Posts' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Saved Posts' }));

    await waitFor(() => {
      expect(screen.getByText('Saved Housing Post')).toBeDefined();
    });
  });

  it('shows unsave menu option for saved posts', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({
      data: [
        {
          id: 'saved-post-1',
          title: 'Saved Housing Post',
          description: '',
          is_global: false,
          likes_count: 0,
          comments_count: 0,
          created_at: '2026-02-24T10:00:00Z',
          author_id: 'other-user',
        },
      ],
    });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved Posts' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Saved Posts' }));

    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));

    await waitFor(() => {
      expect(screen.getByText('Unsave Post')).toBeDefined();
    });
  });

  it('calls unsavePost and removes post from list when Unsave Post is clicked', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({
      data: [
        {
          id: 'saved-post-1',
          title: 'Saved Housing Post',
          description: '',
          is_global: false,
          likes_count: 0,
          comments_count: 0,
          created_at: '2026-02-24T10:00:00Z',
          author_id: 'other-user',
        },
      ],
    });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved Posts' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Saved Posts' }));

    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));

    await waitFor(() => expect(screen.getByText('Unsave Post')).toBeDefined());
    fireEvent.click(screen.getByText('Unsave Post'));

    await waitFor(() => {
      expect(profileMocks.unsavePostMock).toHaveBeenCalledWith(expect.anything(), 'saved-post-1');
    });
  });

  it('shows "Post unsaved." toast after unsaving', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({
      data: [
        {
          id: 'saved-post-1',
          title: 'Saved Housing Post',
          description: '',
          is_global: false,
          likes_count: 0,
          comments_count: 0,
          created_at: '2026-02-24T10:00:00Z',
          author_id: 'other-user',
        },
      ],
    });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved Posts' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Saved Posts' }));

    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Unsave Post')).toBeDefined());
    fireEvent.click(screen.getByText('Unsave Post'));

    await waitFor(() => {
      expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Post unsaved.' })
      );
    });
  });

  it('shows error toast when unsave fails', async () => {
    profileMocks.unsavePostMock.mockResolvedValue({ error: new Error('network') });
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({
      data: [
        {
          id: 'saved-post-1',
          title: 'Saved Housing Post',
          description: '',
          is_global: false,
          likes_count: 0,
          comments_count: 0,
          created_at: '2026-02-24T10:00:00Z',
          author_id: 'other-user',
        },
      ],
    });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved Posts' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Saved Posts' }));

    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Unsave Post')).toBeDefined());
    fireEvent.click(screen.getByText('Unsave Post'));

    await waitFor(() => {
      expect(profileMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to unsave post.' })
      );
    });
  });

  it('shows error when saved posts fail to load', async () => {
    profileMocks.getSavedPostsByUserIdMock.mockResolvedValue({
      error: new Error('Saved posts DB error'),
      data: null,
    });
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved Posts' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Saved Posts' }));

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
    await waitFor(() => expect(screen.getByRole('button', { name: 'About' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'About' }));

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
    await waitFor(() => expect(screen.getByRole('button', { name: 'About' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    // wait for About You section to appear
    await waitFor(() => expect(screen.getByLabelText('Hometown district')).toBeDefined());

    // simulate selecting Pokhara — fireEvent.change fires React's onChange with the new value
    const districtSelect = screen.getByLabelText('Hometown district');
    Object.defineProperty(districtSelect, 'value', { writable: true, value: 'Pokhara' });
    fireEvent.change(districtSelect);

    // click save
    fireEvent.click(screen.getByRole('button', { name: /save about you/i }));

    await waitFor(() => {
      expect(profileMocks.updateUserProfileMock).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        expect.objectContaining({ hometown_district: 'Pokhara' })
      );
    });
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
});
