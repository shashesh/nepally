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

  it('leaves the counts as text, because they do nothing yet', () => {
    render(<PostActions likeCount={3} commentCount={2} onShare={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
