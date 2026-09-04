import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const mocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getPendingPostsMock: vi.fn(),
  listReportsMock: vi.fn(),
  resolveReportMock: vi.fn(),
  setPostModerationStatusMock: vi.fn(),
  setUserBanStatusMock: vi.fn(),
  getPostsByIdsMock: vi.fn(),
  notificationsShowMock: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({ notifications: { show: mocks.notificationsShowMock } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouterMock }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getPendingPosts: mocks.getPendingPostsMock,
    listReports: mocks.listReportsMock,
    resolveReport: mocks.resolveReportMock,
    setPostModerationStatus: mocks.setPostModerationStatusMock,
    setUserBanStatus: mocks.setUserBanStatusMock,
    getPostsByIds: mocks.getPostsByIdsMock,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

import ModerationPage from './moderation.page';

const moderator = {
  id: 'mod-1',
  full_name: 'Mod One',
  email: 'mod@example.com',
  trust_level: 2,
  is_moderator: true,
};

const author = { id: 'user-2', full_name: 'Ram Sharma', trust_level: 1, profile_photo: null };
const spammer = { id: 'user-4', full_name: 'Spam Guy', trust_level: 1, profile_photo: null };
const reporter = { id: 'user-3', full_name: 'Sita Rai', trust_level: 1, profile_photo: null };

const pendingPost = {
  id: 'post-1',
  author_id: author.id,
  author,
  title: 'Flood in Irving',
  description: 'Need volunteers with trucks',
  status: 'pending',
  location_city: 'Irving',
  location_state: 'TX',
  created_at: new Date().toISOString(),
  tags: [{ id: 't1', slug: 'emergency', name: 'Emergency' }],
};

const reportedPost = {
  id: 'post-9',
  author_id: spammer.id,
  author: spammer,
  title: 'Cheap iPhones',
  description: 'Send money first',
  status: 'active',
  location_city: 'Dallas',
  location_state: 'TX',
  created_at: new Date().toISOString(),
  tags: [],
};

const postReport = {
  id: 'report-1',
  reported_by: reporter.id,
  reported_by_user: reporter,
  target_type: 'post',
  target_id: reportedPost.id,
  reason: 'Spam',
  description: 'Fake listing',
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  action: null,
  created_at: new Date().toISOString(),
};

const userReport = {
  id: 'report-2',
  reported_by: reporter.id,
  reported_by_user: reporter,
  target_type: 'user',
  target_id: 'user-5',
  reason: 'Harassment',
  description: null,
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  action: null,
  created_at: new Date().toISOString(),
};

describe('ModerationPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouterMock.mockReturnValue({ replace: mockReplace, push: mockPush, query: {} });
    mocks.useAuthMock.mockReturnValue({ user: moderator, loading: false });
    mocks.getPendingPostsMock.mockResolvedValue({ data: [pendingPost] });
    mocks.listReportsMock.mockResolvedValue({ data: [postReport, userReport] });
    mocks.getPostsByIdsMock.mockResolvedValue({ data: [reportedPost] });
    mocks.resolveReportMock.mockResolvedValue({ data: { ...postReport, status: 'dismissed' } });
    mocks.setPostModerationStatusMock.mockResolvedValue({ data: { ...pendingPost, status: 'active' } });
    mocks.setUserBanStatusMock.mockResolvedValue({ data: { ...spammer, is_banned: true } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to /login when logged out', async () => {
    mocks.useAuthMock.mockReturnValue({ user: null, loading: false });
    render(<ModerationPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('shows an access notice for non-moderators and loads nothing', async () => {
    mocks.useAuthMock.mockReturnValue({ user: { ...moderator, is_moderator: false }, loading: false });
    render(<ModerationPage />);
    expect(await screen.findByText(/Moderator access is required/)).toBeDefined();
    expect(mocks.getPendingPostsMock).not.toHaveBeenCalled();
    expect(mocks.listReportsMock).not.toHaveBeenCalled();
  });

  it('renders pending posts and open reports for a moderator', async () => {
    render(<ModerationPage />);

    expect(await screen.findByText('Flood in Irving')).toBeDefined();
    expect(screen.getByText(/Ram S\./)).toBeDefined();
    expect(screen.getByText('Spam')).toBeDefined();
    expect(await screen.findByText('Cheap iPhones')).toBeDefined();
    expect(screen.getByText('Harassment')).toBeDefined();

    const postLink = screen.getByRole('link', { name: /View post/ });
    expect(postLink.getAttribute('href')).toBe('/posts/post-9');
    const userLink = screen.getByRole('link', { name: /View user/ });
    expect(userLink.getAttribute('href')).toBe('/users/user-5');

    expect(mocks.listReportsMock).toHaveBeenCalledWith({}, { status: 'pending' });
    expect(mocks.getPostsByIdsMock).toHaveBeenCalledWith({}, ['post-9']);
  });

  it('approves a pending post and removes it from the queue', async () => {
    render(<ModerationPage />);
    await screen.findByText('Flood in Irving');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(mocks.setPostModerationStatusMock).toHaveBeenCalledWith({}, 'post-1', 'active')
    );
    await waitFor(() => expect(screen.queryByText('Flood in Irving')).toBeNull());
    expect(mocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/approved/i) })
    );
  });

  it('removes a pending post', async () => {
    mocks.setPostModerationStatusMock.mockResolvedValue({ data: { ...pendingPost, status: 'removed' } });
    render(<ModerationPage />);
    await screen.findByText('Flood in Irving');

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(mocks.setPostModerationStatusMock).toHaveBeenCalledWith({}, 'post-1', 'removed')
    );
    await waitFor(() => expect(screen.queryByText('Flood in Irving')).toBeNull());
  });

  it('keeps the post and shows an error when approval fails', async () => {
    mocks.setPostModerationStatusMock.mockResolvedValue({ error: new Error('permission denied') });
    render(<ModerationPage />);
    await screen.findByText('Flood in Irving');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(mocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red' })
      )
    );
    expect(screen.getByText('Flood in Irving')).toBeDefined();
  });

  it('disables every action while one is in flight', async () => {
    let resolveApprove: (value: { data: typeof pendingPost }) => void = () => {};
    mocks.setPostModerationStatusMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveApprove = resolve;
      })
    );
    render(<ModerationPage />);
    await screen.findByText('Cheap iPhones');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove' }).hasAttribute('disabled')).toBe(true);
    });
    for (const button of screen.getAllByRole('button', { name: 'Dismiss' })) {
      expect(button.hasAttribute('disabled')).toBe(true);
    }
    expect(screen.getByRole('button', { name: 'Ban user' }).hasAttribute('disabled')).toBe(true);

    resolveApprove({ data: { ...pendingPost, status: 'active' } });

    await waitFor(() => expect(screen.queryByText('Flood in Irving')).toBeNull());
    expect(screen.getByRole('button', { name: 'Ban user' }).hasAttribute('disabled')).toBe(false);
  });
  it('dismisses a report', async () => {
    render(<ModerationPage />);
    await screen.findByText('Cheap iPhones');

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);

    await waitFor(() =>
      expect(mocks.resolveReportMock).toHaveBeenCalledWith({}, 'report-1', {
        status: 'dismissed',
        reviewed_by: 'mod-1',
        action: 'none',
      })
    );
    await waitFor(() => expect(screen.queryByText('Cheap iPhones')).toBeNull());
  });

  it('removes a reported post and resolves the report as actioned', async () => {
    mocks.setPostModerationStatusMock.mockResolvedValue({ data: { ...reportedPost, status: 'removed' } });
    render(<ModerationPage />);
    await screen.findByText('Cheap iPhones');

    fireEvent.click(screen.getByRole('button', { name: 'Remove post' }));

    await waitFor(() =>
      expect(mocks.setPostModerationStatusMock).toHaveBeenCalledWith({}, 'post-9', 'removed')
    );
    await waitFor(() =>
      expect(mocks.resolveReportMock).toHaveBeenCalledWith({}, 'report-1', {
        status: 'actioned',
        reviewed_by: 'mod-1',
        action: 'removed',
      })
    );
  });

  it('bans the author of a reported post after confirmation', async () => {
    render(<ModerationPage />);
    await screen.findByText('Cheap iPhones');

    fireEvent.click(screen.getByRole('button', { name: 'Ban author' }));

    await waitFor(() =>
      expect(mocks.setUserBanStatusMock).toHaveBeenCalledWith({}, 'user-4', true, 'Spam')
    );
    await waitFor(() =>
      expect(mocks.resolveReportMock).toHaveBeenCalledWith({}, 'report-1', {
        status: 'actioned',
        reviewed_by: 'mod-1',
        action: 'banned',
      })
    );
  });

  it('does nothing when the ban confirmation is declined', async () => {
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    render(<ModerationPage />);
    await screen.findByText('Cheap iPhones');

    fireEvent.click(screen.getByRole('button', { name: 'Ban author' }));

    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(mocks.setUserBanStatusMock).not.toHaveBeenCalled();
    expect(mocks.resolveReportMock).not.toHaveBeenCalled();
  });

  it('removing a reported post also drops its card from the pending queue', async () => {
    const pendingAndReportedPost = { ...pendingPost, id: 'post-1' };
    const pendingPostReport = {
      ...postReport,
      id: 'report-3',
      target_id: pendingAndReportedPost.id,
      reason: 'Misuse',
    };
    mocks.listReportsMock.mockResolvedValue({ data: [postReport, pendingPostReport] });
    mocks.getPostsByIdsMock.mockResolvedValue({ data: [reportedPost, pendingAndReportedPost] });
    mocks.setPostModerationStatusMock.mockResolvedValue({
      data: { ...pendingAndReportedPost, status: 'removed' },
    });
    render(<ModerationPage />);
    await screen.findByText('Misuse');
    expect(screen.getAllByText('Flood in Irving').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove post' })[1]);

    await waitFor(() =>
      expect(mocks.setPostModerationStatusMock).toHaveBeenCalledWith({}, 'post-1', 'removed')
    );
    await waitFor(() => expect(screen.queryByText('Misuse')).toBeNull());
    expect(screen.queryByText('Flood in Irving')).toBeNull();
  });

  it('bans a reported user directly', async () => {
    render(<ModerationPage />);
    await screen.findByText('Harassment');

    fireEvent.click(screen.getByRole('button', { name: 'Ban user' }));

    await waitFor(() =>
      expect(mocks.setUserBanStatusMock).toHaveBeenCalledWith({}, 'user-5', true, 'Harassment')
    );
    await waitFor(() =>
      expect(mocks.resolveReportMock).toHaveBeenCalledWith({}, 'report-2', {
        status: 'actioned',
        reviewed_by: 'mod-1',
        action: 'banned',
      })
    );
  });

  it('shows empty states when nothing needs attention', async () => {
    mocks.getPendingPostsMock.mockResolvedValue({ data: [] });
    mocks.listReportsMock.mockResolvedValue({ data: [] });
    render(<ModerationPage />);

    expect(await screen.findByText('No posts waiting for review.')).toBeDefined();
    expect(await screen.findByText('No open reports.')).toBeDefined();
  });
});
