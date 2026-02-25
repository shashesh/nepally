import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const profileMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getPostsByAuthorIdMock: vi.fn(),
  getSavedPostsByUserIdMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
  updateUserProfileMock: vi.fn(),
  uploadProfilePhotoMock: vi.fn(),
  deleteProfilePhotoMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: profileMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: profileMocks.useRouterMock }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { resetPasswordForEmail: profileMocks.resetPasswordForEmailMock },
  },
}));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getPostsByAuthorId: profileMocks.getPostsByAuthorIdMock,
    getSavedPostsByUserId: profileMocks.getSavedPostsByUserIdMock,
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
  default: ({ href, children, className }: any) =>
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

import ProfilePage from './profile';

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
    profileMocks.formatRelativeTimeMock.mockReturnValue('2h ago');
  });

  it('redirects to /login when user is not logged in', async () => {
    profileMocks.useAuthMock.mockReturnValue({ user: null, signOut: mockSignOut, refreshUser: mockRefreshUser });
    render(<ProfilePage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
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
});
