import React from 'react';
import type { PostCommentThread } from '@nepally/shared';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { CommentThread } from './CommentThread';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

function comment(id: string, authorId: string, name: string, content: string) {
  return {
    id,
    post_id: 'post-1',
    author_id: authorId,
    content,
    parent_comment_id: null,
    is_deleted: false,
    is_flagged: false,
    created_at: '2026-02-24T10:00:00Z',
    updated_at: '2026-02-24T10:00:00Z',
    author: { id: authorId, full_name: name, profile_photo: null, trust_level: 1 },
  };
}

const thread = {
  parent: comment('c1', 'user-2', 'Bikal Shrestha', 'Is this still available?'),
  replies: [comment('c2', 'user-1', 'Test User', 'Yes, message me'), comment('c3', 'user-3', 'Sita Rai', 'Interested too')],
  latest_activity_at: '2026-02-24T10:00:00Z',
} as unknown as PostCommentThread;

function renderThread(overrides: Partial<React.ComponentProps<typeof CommentThread>> = {}) {
  const props = {
    thread,
    currentUserId: 'user-1',
    onReply: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<CommentThread {...props} />);
  return props;
}

describe('CommentThread', () => {
  it('shows the parent comment with its author and body', () => {
    renderThread();

    expect(screen.getByText('Bikal Shrestha')).toBeDefined();
    expect(screen.getByText('Is this still available?')).toBeDefined();
  });

  it('keeps replies collapsed until asked, and says how many there are', () => {
    renderThread();

    expect(screen.queryByText('Yes, message me')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show replies (2)' }));

    expect(screen.getByText('Yes, message me')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Hide replies' })).toBeDefined();
  });

  it('replies to the parent, naming its author', () => {
    const props = renderThread();

    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(props.onReply).toHaveBeenCalledWith('c1', 'Bikal Shrestha');
  });

  it('offers Delete only on your own comment, and asks first', async () => {
    const props = renderThread();

    // The parent belongs to someone else.
    expect(screen.queryByRole('button', { name: 'Delete comment' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show replies (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete comment' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith('c2'));
  });

  it('keeps the comment when the dialog is dismissed', async () => {
    const props = renderThread();

    fireEvent.click(screen.getByRole('button', { name: 'Show replies (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete comment' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(props.onDelete).not.toHaveBeenCalled());
  });

  it('opens a menu on other members, but not on yourself', () => {
    renderThread({ onChat: vi.fn() });

    expect(screen.getByRole('button', { name: 'Options for Bikal Shrestha' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Show replies (2)' }));
    expect(screen.queryByRole('button', { name: 'Options for Test User' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Options for Sita Rai' })).toBeDefined();
  });
});
