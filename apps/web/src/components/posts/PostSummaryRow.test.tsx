import React from 'react';
import type { Post } from '@nepally/shared';
import { render, screen } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostSummaryRow } from './PostSummaryRow';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

type SummaryPost = Pick<
  Post,
  'id' | 'title' | 'description' | 'is_global' | 'created_at' | 'likes_count' | 'comments_count'
>;

const post: SummaryPost = {
  id: 'post-1',
  title: 'Roommate needed in Dallas',
  description: 'Looking for a roommate near downtown.',
  is_global: false,
  created_at: '2026-09-18T07:00:00.000Z',
  likes_count: 3,
  comments_count: 1,
};

describe('PostSummaryRow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('links the title, and only the title, to the post', () => {
    render(<PostSummaryRow post={post} />);

    const link = screen.getByRole('link', { name: 'Roommate needed in Dallas' });
    expect(link.getAttribute('href')).toBe('/posts/post-1');
  });

  it('shows a Local badge for a metro post', () => {
    render(<PostSummaryRow post={post} />);

    expect(screen.getByText('Local')).toBeDefined();
  });

  it('shows a Global badge for a global post', () => {
    render(<PostSummaryRow post={{ ...post, is_global: true }} />);

    expect(screen.getByText('Global')).toBeDefined();
  });

  it('renders the description when present', () => {
    render(<PostSummaryRow post={post} />);

    expect(screen.getByText('Looking for a roommate near downtown.')).toBeDefined();
  });

  it('omits the description paragraph when there is none', () => {
    const { container } = render(<PostSummaryRow post={{ ...post, description: '' }} />);

    expect(container.querySelector('p')).toBeNull();
  });

  it('shows relative age, likes and comments, each on its own', () => {
    render(<PostSummaryRow post={post} />);

    expect(screen.getByText('2h ago')).toBeDefined();
    expect(screen.getByText('3 likes')).toBeDefined();
    expect(screen.getByText('1 comment')).toBeDefined();
  });

  it('singularises a lone like or comment', () => {
    render(<PostSummaryRow post={{ ...post, likes_count: 1, comments_count: 1 }} />);

    expect(screen.getByText('1 like')).toBeDefined();
    expect(screen.getByText('1 comment')).toBeDefined();
  });

  it('shows 0 likes and 0 comments rather than dropping the counts', () => {
    render(<PostSummaryRow post={{ ...post, likes_count: 0, comments_count: 0 }} />);

    expect(screen.getByText('0 likes')).toBeDefined();
    expect(screen.getByText('0 comments')).toBeDefined();
  });

  it('treats null or undefined counts as 0', () => {
    const withoutCounts = {
      ...post,
      likes_count: null,
      comments_count: undefined,
    } as unknown as SummaryPost;
    render(<PostSummaryRow post={withoutCounts} />);

    expect(screen.getByText('0 likes')).toBeDefined();
    expect(screen.getByText('0 comments')).toBeDefined();
  });

  it('renders a menu beside the link, not nested inside it', () => {
    render(<PostSummaryRow post={post} menu={<button type="button">Post options</button>} />);

    const link = screen.getByRole('link', { name: 'Roommate needed in Dallas' });
    const menuButton = screen.getByRole('button', { name: 'Post options' });

    expect(link.contains(menuButton)).toBe(false);
  });

  it('renders no menu region when none is given', () => {
    render(<PostSummaryRow post={post} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
