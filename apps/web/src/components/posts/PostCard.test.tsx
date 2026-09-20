import React from 'react';
import type { Post } from '@nepally/shared';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PostCard } from './PostCard';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

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
  tags: [{ id: 'tag-1', slug: 'housing', name: 'Housing' }],
  photos: [],
} as unknown as Post;

function renderCard(overrides: Partial<React.ComponentProps<typeof PostCard>> = {}) {
  const props = {
    post,
    liked: false,
    onTagClick: vi.fn(),
    onOpenLightbox: vi.fn(),
    onSharePost: vi.fn().mockResolvedValue(undefined),
    onDeletePost: vi.fn().mockResolvedValue(undefined),
    onEditPost: vi.fn(),
    onReportPost: vi.fn(),
    ...overrides,
  };
  render(<PostCard {...props} />);
  return props;
}

describe('PostCard', () => {
  it('links the title to the post', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Roommate needed in Dallas' }).getAttribute('href')).toBe('/posts/post-1');
  });

  it('offers edit, share and delete on your own post', async () => {
    const props = renderCard({ currentUserId: 'user-2' });

    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));

    await screen.findByRole('menuitem', { name: 'Edit Post' });
    expect(screen.queryByRole('menuitem', { name: 'Save Post' })).toBeNull();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete Post' }));
    expect(props.onDeletePost).toHaveBeenCalledWith(post);
  });

  it('offers save, share and report on someone else’s post', async () => {
    const onSaveToggle = vi.fn();
    renderCard({ currentUserId: 'user-9', onSaveToggle });

    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));

    await screen.findByRole('menuitem', { name: 'Save Post' });
    expect(screen.queryByRole('menuitem', { name: 'Edit Post' })).toBeNull();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Save Post' }));
    expect(onSaveToggle).toHaveBeenCalledTimes(1);
  });

  it('says Unsave once the post is saved', async () => {
    renderCard({ currentUserId: 'user-9', saved: true, onSaveToggle: vi.fn() });

    fireEvent.click(screen.getByRole('button', { name: 'Post options' }));

    expect(await screen.findByRole('menuitem', { name: 'Unsave Post' })).toBeDefined();
  });

  it('opens the author menu only on other people’s posts', async () => {
    const { unmount } = render(
      <PostCard
        post={post}
        liked={false}
        currentUserId="user-2"
        onTagClick={vi.fn()}
        onOpenLightbox={vi.fn()}
        onSharePost={vi.fn()}
        onDeletePost={vi.fn()}
        onEditPost={vi.fn()}
        onReportPost={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'Options for Bikal Shrestha' })).toBeNull();
    unmount();

    renderCard({ currentUserId: 'user-9', onAvatarChat: vi.fn() });
    expect(screen.getByRole('button', { name: 'Options for Bikal Shrestha' })).toBeDefined();
  });

  it('filters by tag', () => {
    const props = renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Housing' }));

    expect(props.onTagClick).toHaveBeenCalledWith('housing');
  });

  it('opens the lightbox on the photo showing', () => {
    const props = renderCard({ post: { ...post, photos: ['/a.jpg', '/b.jpg'] } as unknown as Post });

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Post image 2' }));

    expect(props.onOpenLightbox).toHaveBeenCalledWith(['/a.jpg', '/b.jpg'], 1);
  });

  it('nests no control inside the card link', () => {
    const { container } = render(
      <PostCard
        post={{ ...post, photos: ['/a.jpg'] } as unknown as Post}
        liked={false}
        currentUserId="user-9"
        saved={false}
        onTagClick={vi.fn()}
        onOpenLightbox={vi.fn()}
        onSharePost={vi.fn()}
        onDeletePost={vi.fn()}
        onEditPost={vi.fn()}
        onReportPost={vi.fn()}
        onSaveToggle={vi.fn()}
      />
    );

    expect(container.querySelectorAll('a button')).toHaveLength(0);
    expect(container.querySelectorAll('button a')).toHaveLength(0);
  });
});
