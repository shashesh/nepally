import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PostActions } from './PostActions';

describe('PostActions', () => {
  it('announces the like and comment counts', () => {
    render(<PostActions likeCount={3} commentCount={2} onShare={vi.fn()} />);

    expect(screen.getByText('3 likes')).toBeDefined();
    expect(screen.getByText('2 comments')).toBeDefined();
  });

  it('uses the singular for one', () => {
    render(<PostActions likeCount={1} commentCount={1} onShare={vi.fn()} />);

    expect(screen.getByText('1 like')).toBeDefined();
    expect(screen.getByText('1 comment')).toBeDefined();
  });

  it('shares the post', () => {
    const onShare = vi.fn();
    render(<PostActions likeCount={0} commentCount={0} onShare={onShare} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share post' }));

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('leaves the counts as text when nothing can act on them', () => {
    render(<PostActions likeCount={3} commentCount={2} onShare={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('makes the counts buttons when a handler is given', () => {
    const onLike = vi.fn();
    const onComment = vi.fn();
    render(
      <PostActions likeCount={3} commentCount={2} onLike={onLike} onComment={onComment} onShare={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: '3 likes' }));
    fireEvent.click(screen.getByRole('button', { name: '2 comments' }));

    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onComment).toHaveBeenCalledTimes(1);
  });

  it('reports whether the viewer has liked the post', () => {
    const { unmount } = render(<PostActions likeCount={3} commentCount={0} onLike={vi.fn()} onShare={vi.fn()} />);
    expect(screen.getByRole('button', { name: '3 likes' }).getAttribute('aria-pressed')).toBe('false');
    unmount();

    render(<PostActions likeCount={4} commentCount={0} liked onLike={vi.fn()} onShare={vi.fn()} />);
    expect(screen.getByRole('button', { name: '4 likes' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('offers save only with a handler, and names the action', () => {
    const onSave = vi.fn();
    const { unmount } = render(<PostActions likeCount={0} commentCount={0} onShare={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /save post/i })).toBeNull();
    unmount();

    render(<PostActions likeCount={0} commentCount={0} onSave={onSave} onShare={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save post' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    unmount();

    render(<PostActions likeCount={0} commentCount={0} saved onSave={onSave} onShare={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Unsave post' })).toBeDefined();
  });

  it('shows the details cue only for the feed card', () => {
    const { unmount } = render(<PostActions likeCount={0} commentCount={0} onShare={vi.fn()} />);
    expect(screen.queryByText(/View Details/)).toBeNull();
    unmount();

    render(<PostActions likeCount={0} commentCount={0} onShare={vi.fn()} showViewDetails />);
    expect(screen.getByText(/View Details/)).toBeDefined();
  });
});
