import React from 'react';
import type { Post } from '@nepally/shared';
import { render, screen, fireEvent, within } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PostMeta } from './PostMeta';

const post = {
  id: 'post-1',
  title: 'Roommate needed in Dallas',
  description: 'Looking for a roommate.',
  author_id: 'user-2',
  author: { full_name: 'Bikal Shrestha', profile_photo: null, trust_level: 1 },
  is_global: false,
  likes_count: 3,
  comments_count: 2,
  created_at: '2026-02-24T10:00:00Z',
  tags: [
    { id: 'tag-1', slug: 'housing', name: 'Housing' },
    { id: 'tag-2', slug: 'jobs', name: 'Jobs' },
  ],
  photos: [],
} as unknown as Post;

describe('PostMeta', () => {
  it('shows the author, the time the post was written, and its tags', () => {
    render(<PostMeta post={post} metroLabel="Dallas" />);

    expect(screen.getByText('Bikal Shrestha')).toBeDefined();
    expect(screen.getByRole('time').getAttribute('dateTime')).toBe('2026-02-24T10:00:00Z');
    expect(screen.getByText('Housing')).toBeDefined();
    expect(screen.getByText('Jobs')).toBeDefined();
  });

  it('falls back to Anonymous without an author', () => {
    render(<PostMeta post={{ ...post, author: null } as unknown as Post} />);
    expect(screen.getByText('Anonymous')).toBeDefined();
  });

  it('filters by a tag when its chip is clicked', () => {
    const onTagClick = vi.fn();
    render(<PostMeta post={post} onTagClick={onTagClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Housing' }));

    expect(onTagClick).toHaveBeenCalledWith('housing');
  });

  it('renders tags as plain chips when they cannot be clicked', () => {
    render(<PostMeta post={post} />);

    expect(screen.getByText('Housing')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says which metro a local post belongs to, and marks global posts', () => {
    const { unmount } = render(<PostMeta post={post} metroLabel="Dallas" />);
    expect(screen.getByText('Local · Dallas')).toBeDefined();
    unmount();

    render(<PostMeta post={{ ...post, is_global: true } as unknown as Post} metroLabel="Dallas" />);
    expect(screen.getByText('Global')).toBeDefined();
  });

  it('lists the tags and the scope together, so they wrap as one group', () => {
    render(<PostMeta post={post} metroLabel="Dallas" />);

    const list = screen.getByRole('list');
    expect(within(list).getByText('Housing')).toBeDefined();
    expect(within(list).getByText('Jobs')).toBeDefined();
    expect(within(list).getByText('Local · Dallas')).toBeDefined();
  });

  it('still lists the scope when the post has no tags', () => {
    render(<PostMeta post={{ ...post, tags: [] } as unknown as Post} metroLabel="Dallas" />);

    expect(within(screen.getByRole('list')).getByText('Local · Dallas')).toBeDefined();
  });
});
