import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post, ReportWithUsers } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
  useModerationQueue: vi.fn(),
  confirm: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../hooks/useModerationQueue', () => ({ useModerationQueue: mocks.useModerationQueue }));
vi.mock('../components/ui/dialogs', () => ({ useConfirm: () => mocks.confirm, usePrompt: () => vi.fn() }));
vi.mock('../components/ui/notify', () => ({ notify: { error: mocks.notifyError, success: mocks.notifySuccess } }));
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

import ModerationPage from './moderation.page';

const MODERATOR = { id: 'mod-1', full_name: 'Mod One', is_moderator: true };

function post(id: string, title: string): Post {
  return {
    id,
    author_id: `author-${id}`,
    author: { id: `author-${id}`, full_name: 'Ram Sharma' },
    title,
    description: 'Details',
    location_city: 'Austin',
    location_state: 'TX',
    created_at: '2026-09-24T10:00:00.000Z',
    tags: [],
  } as unknown as Post;
}

const REPORTED = post('p-9', 'Cheap phones');

const POST_REPORT = {
  id: 'r-1',
  target_type: 'post',
  target_id: 'p-9',
  reason: 'Spam',
  description: null,
  reported_by_user: { id: 'u-3', full_name: 'Sita Rai' },
  created_at: '2026-09-24T11:00:00.000Z',
} as unknown as ReportWithUsers;

const USER_REPORT = {
  ...POST_REPORT,
  id: 'r-2',
  target_type: 'user',
  target_id: 'u-5',
  reason: 'Harassment',
} as unknown as ReportWithUsers;

function queue(overrides: Record<string, unknown> = {}) {
  return {
    pendingPosts: [post('p-1', 'Flood help needed'), post('p-2', 'Shelter open')],
    reports: [POST_REPORT, USER_REPORT],
    reportedPosts: { 'p-9': REPORTED },
    loading: false,
    error: null,
    reload: vi.fn(),
    busy: null,
    approvePost: vi.fn().mockResolvedValue({ ok: true }),
    removePost: vi.fn().mockResolvedValue({ ok: true }),
    dismissReport: vi.fn().mockResolvedValue({ ok: true }),
    removeReportedPost: vi.fn().mockResolvedValue({ ok: true }),
    banUser: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

describe('ModerationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: MODERATOR, loading: false });
    mocks.useModerationQueue.mockReturnValue(queue());
    mocks.confirm.mockResolvedValue(true);
  });

  it('sends a signed-out visitor to log in', async () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    render(<ModerationPage />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });

  it('tells a non-moderator they need access, and loads nothing', () => {
    mocks.useAuth.mockReturnValue({ user: { ...MODERATOR, is_moderator: false }, loading: false });
    render(<ModerationPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Moderation' })).toBeDefined();
    expect(screen.getByText('Moderator access required')).toBeDefined();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(mocks.useModerationQueue).toHaveBeenCalledWith(null);
  });

  it('shows both queues with their counts', () => {
    render(<ModerationPage />);

    expect(mocks.useModerationQueue).toHaveBeenCalledWith('mod-1');
    expect(screen.getByRole('heading', { level: 2, name: 'Pending posts' })).toBeDefined();
    expect(screen.getByText('2 waiting')).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Open reports' })).toBeDefined();
    expect(screen.getByText('2 open')).toBeDefined();
    expect(screen.getByRole('article', { name: 'Flood help needed' })).toBeDefined();
    expect(screen.getByRole('article', { name: 'Spam' })).toBeDefined();
  });

  it('says when a queue is empty', () => {
    mocks.useModerationQueue.mockReturnValue(queue({ pendingPosts: [], reports: [] }));
    render(<ModerationPage />);

    expect(screen.getByText('No posts waiting for review.')).toBeDefined();
    expect(screen.getByText('No open reports.')).toBeDefined();
  });

  it('shows loading, then a failed load with a retry and no queues', () => {
    mocks.useModerationQueue.mockReturnValue(queue({ loading: true }));
    const { rerender } = render(<ModerationPage />);
    expect(screen.getByText('Loading the moderation queue…')).toBeDefined();

    const failed = queue({ error: "Couldn't load the moderation queue.", pendingPosts: [], reports: [] });
    mocks.useModerationQueue.mockReturnValue(failed);
    rerender(<ModerationPage />);
    expect(screen.getByText("Couldn't load the moderation queue.")).toBeDefined();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(failed.reload).toHaveBeenCalledTimes(1);
  });

  it('approves without asking', async () => {
    const state = queue();
    mocks.useModerationQueue.mockReturnValue(state);
    render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0]);
    });

    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(state.approvePost).toHaveBeenCalledWith(state.pendingPosts[0]);
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Post approved and published.');
  });

  it('asks before removing a pending post, and does nothing on cancel', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    const state = queue();
    mocks.useModerationQueue.mockReturnValue(state);
    render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    });

    expect(mocks.confirm).toHaveBeenCalledWith({
      title: 'Remove this post?',
      message: "“Flood help needed” will be taken down and won't appear in any feed.",
      confirmLabel: 'Remove post',
      danger: true,
    });
    expect(state.removePost).not.toHaveBeenCalled();
  });

  it('removes a pending post once confirmed', async () => {
    const state = queue();
    mocks.useModerationQueue.mockReturnValue(state);
    render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    });

    expect(state.removePost).toHaveBeenCalledWith(state.pendingPosts[0]);
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Post removed.');
  });

  it('asks before removing a reported post', async () => {
    const state = queue();
    mocks.useModerationQueue.mockReturnValue(state);
    render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove post' }));
    });

    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Remove this post?', danger: true }));
    expect(state.removeReportedPost).toHaveBeenCalledWith(POST_REPORT);
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Post removed and report closed.');
  });

  it('asks before banning, then bans', async () => {
    const state = queue();
    mocks.useModerationQueue.mockReturnValue(state);
    render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ban author' }));
    });

    expect(mocks.confirm).toHaveBeenCalledWith({
      title: 'Ban Ram S.?',
      message: 'Their posts will be removed and they will no longer be able to post.',
      confirmLabel: 'Ban',
      danger: true,
    });
    expect(state.banUser).toHaveBeenCalledWith(POST_REPORT, 'author-p-9');
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Ram S. has been banned.');
  });

  it('dismisses a report without asking', async () => {
    const state = queue();
    mocks.useModerationQueue.mockReturnValue(state);
    render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    });

    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(state.dismissReport).toHaveBeenCalledWith(POST_REPORT);
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Report dismissed.');
  });

  it('says what failed', async () => {
    const message = "Couldn't approve the post. Please try again.";
    mocks.useModerationQueue.mockReturnValue(queue({ approvePost: vi.fn().mockResolvedValue({ ok: false, message }) }));
    render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0]);
    });

    expect(mocks.notifyError).toHaveBeenCalledWith(message);
    expect(mocks.notifySuccess).not.toHaveBeenCalled();
  });

  it('locks every action while one runs and marks the running one', () => {
    mocks.useModerationQueue.mockReturnValue(queue({ busy: { id: 'p-1', action: 'approve' } }));
    render(<ModerationPage />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
    }
    const [running, other] = screen.getAllByRole('button', { name: 'Approve' });
    expect(running.getAttribute('aria-busy')).toBe('true');
    expect(other.getAttribute('aria-busy')).toBeNull();
  });

  it('moves focus to the next card when an approved card leaves', async () => {
    const state = queue();
    mocks.useModerationQueue.mockReturnValue(state);
    const { rerender } = render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0]);
    });
    mocks.useModerationQueue.mockReturnValue(queue({ pendingPosts: [state.pendingPosts[1]] }));
    rerender(<ModerationPage />);

    expect(document.activeElement).toBe(screen.getByRole('article', { name: 'Shelter open' }));
  });

  it('moves focus to the section heading when its last card leaves', async () => {
    const only = queue({ pendingPosts: [post('p-1', 'Flood help needed')] });
    mocks.useModerationQueue.mockReturnValue(only);
    const { rerender } = render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    });
    mocks.useModerationQueue.mockReturnValue(queue({ pendingPosts: [] }));
    rerender(<ModerationPage />);

    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Pending posts' }));
  });

  it('never uses the browser’s confirm dialog', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm');
    render(<ModerationPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ban user' }));
    });

    expect(nativeConfirm).not.toHaveBeenCalled();
    nativeConfirm.mockRestore();
  });
});
