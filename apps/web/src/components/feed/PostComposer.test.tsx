import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PostComposer } from './PostComposer';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

describe('PostComposer', () => {
  it('greets the member by first name and links to the composer', () => {
    render(<PostComposer fullName="Bikal Shrestha" trustLevel={1} />);

    expect(screen.getByRole('link', { name: 'Start a new post' }).getAttribute('href')).toBe('/posts/create');
    expect(screen.getByText("What's on your mind, Bikal?")).toBeDefined();
    expect(screen.getByRole('link', { name: 'Create Post' })).toBeDefined();
  });

  it('sends unverified members to their profile instead', () => {
    render(<PostComposer fullName="Bikal Shrestha" trustLevel={0} />);

    expect(screen.getByRole('link', { name: 'Verify to Post' }).getAttribute('href')).toBe('/profile');
    expect(screen.getByRole('link', { name: 'Start a new post' }).getAttribute('href')).toBe('/profile');
    expect(screen.queryByRole('link', { name: 'Create Post' })).toBeNull();
  });

  it('falls back to a neutral greeting without a name', () => {
    render(<PostComposer fullName={null} trustLevel={1} />);

    expect(screen.getByText("What's on your mind, there?")).toBeDefined();
  });
});
