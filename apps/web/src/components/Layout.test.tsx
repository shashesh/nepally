import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const layoutMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getTotalUnreadCountMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: layoutMocks.useAuthMock,
}));

vi.mock('next/router', () => ({
  useRouter: layoutMocks.useRouterMock,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {},
}));

vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getTotalUnreadCount: layoutMocks.getTotalUnreadCountMock,
  };
});

vi.mock('next/link', () => ({
  default: ({ href, children, className, 'aria-label': ariaLabel }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    'aria-label'?: string;
  }) => React.createElement('a', { href, className, 'aria-label': ariaLabel }, children),
}));

vi.mock('./LocationSwitcher', () => ({
  default: () => React.createElement('div', { 'data-testid': 'location-switcher' }),
}));

vi.mock('./Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': 'avatar' }, name),
}));

import Layout from './Layout';

describe('Layout', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    layoutMocks.useRouterMock.mockReturnValue({
      pathname: '/',
      push: mockPush,
      replace: mockReplace,
    });
    layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 0 });
  });

  describe('when loading', () => {
    it('renders a loading spinner and no navigation', () => {
      layoutMocks.useAuthMock.mockReturnValue({
        user: null,
        loading: true,
        signOut: layoutMocks.signOutMock,
      });
      render(<Layout>Content</Layout>);
      expect(screen.queryByText('Log In')).toBeNull();
      expect(screen.queryByText('Content')).toBeNull();
    });
  });

  describe('when user is not logged in', () => {
    beforeEach(() => {
      layoutMocks.useAuthMock.mockReturnValue({
        user: null,
        loading: false,
        signOut: layoutMocks.signOutMock,
      });
    });

    it('renders Log In and Sign Up links', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByText('Log In')).toBeDefined();
      expect(screen.getByText('Sign Up')).toBeDefined();
    });

    it('renders NUSA logo', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByText('NUSA')).toBeDefined();
    });

    it('renders children', () => {
      render(<Layout><div>Page content</div></Layout>);
      expect(screen.getByText('Page content')).toBeDefined();
    });

    it('does not render sidebar nav or LocationSwitcher', () => {
      render(<Layout>Content</Layout>);
      expect(screen.queryByText('Home')).toBeNull();
      expect(screen.queryByTestId('location-switcher')).toBeNull();
    });
  });

  describe('when user is logged in', () => {
    const mockUser = {
      id: 'user-1',
      full_name: 'Test User',
      email: 'test@example.com',
      trust_level: 1,
      profile_photo: null,
    };

    beforeEach(() => {
      layoutMocks.useAuthMock.mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: layoutMocks.signOutMock,
      });
    });

    it('renders sidebar nav links (Home, Events, Marketplace)', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByText('Home')).toBeDefined();
      expect(screen.getByText('Events')).toBeDefined();
      expect(screen.getByText('Marketplace')).toBeDefined();
    });

    it('shows Post button when trust_level >= 1', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByText('Post')).toBeDefined();
    });

    it('shows Verify to Post when trust_level is 0', () => {
      layoutMocks.useAuthMock.mockReturnValue({
        user: { ...mockUser, trust_level: 0 },
        loading: false,
        signOut: layoutMocks.signOutMock,
      });
      render(<Layout>Content</Layout>);
      expect(screen.getByText('Verify to Post')).toBeDefined();
    });

    it('renders LocationSwitcher in the header', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByTestId('location-switcher')).toBeDefined();
    });

    it('renders children in the main area', () => {
      render(<Layout><span>Main content</span></Layout>);
      expect(screen.getByText('Main content')).toBeDefined();
    });

    it('shows unread badge when unread count > 0', async () => {
      layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 5 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(screen.getByText('5')).toBeDefined();
      });
    });

    it('shows 99+ when unread count exceeds 99', async () => {
      layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 100 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(screen.getByText('99+')).toBeDefined();
      });
    });

    it('does not show unread badge when count is 0', async () => {
      layoutMocks.getTotalUnreadCountMock.mockResolvedValue({ count: 0 });
      render(<Layout>Content</Layout>);
      await waitFor(() => {
        expect(layoutMocks.getTotalUnreadCountMock).toHaveBeenCalled();
      });
      expect(screen.queryByText('0')).toBeNull();
    });

    it('opens account dropdown when avatar button is clicked', () => {
      render(<Layout>Content</Layout>);
      fireEvent.click(screen.getByLabelText('Open account menu'));
      expect(screen.getByText('View Profile')).toBeDefined();
      expect(screen.getByText('Manage Locations')).toBeDefined();
      expect(screen.getByText('Sign Out')).toBeDefined();
    });

    it('closes dropdown when avatar button is clicked again', () => {
      render(<Layout>Content</Layout>);
      fireEvent.click(screen.getByLabelText('Open account menu'));
      expect(screen.getByText('View Profile')).toBeDefined();
      fireEvent.click(screen.getByLabelText('Open account menu'));
      expect(screen.queryByText('View Profile')).toBeNull();
    });

    it('calls signOut and navigates to / when Sign Out is clicked', async () => {
      layoutMocks.signOutMock.mockResolvedValue(undefined);
      render(<Layout>Content</Layout>);
      fireEvent.click(screen.getByLabelText('Open account menu'));
      fireEvent.click(screen.getByText('Sign Out'));
      await waitFor(() => {
        expect(layoutMocks.signOutMock).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });
});
