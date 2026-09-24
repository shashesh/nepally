import React from 'react';
import { fireEvent, render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { Post } from '@nepally/shared';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

import { PendingPostCard, type PendingPostCardProps } from './PendingPostCard';

const NOW = new Date('2026-09-24T12:00:00.000Z');

const POST = {
  id: 'post-1',
  author_id: 'user-2',
  author: { id: 'user-2', full_name: 'Ram Sharma' },
  title: 'Flood help needed',
  description: 'Need volunteers with trucks',
  location_city: 'Austin',
  location_state: 'TX',
  created_at: '2026-09-24T10:00:00.000Z',
  tags: [{ id: 't1', slug: 'emergency', name: 'Emergency' }],
} as unknown as Post;

function renderCard(props: Partial<PendingPostCardProps> = {}) {
  const all: PendingPostCardProps = {
    post: POST,
    now: NOW,
    busyAction: null,
    locked: false,
    onApprove: vi.fn(),
    onRemove: vi.fn(),
    ...props,
  };
  render(<PendingPostCard {...all} />);
  return all;
}

describe('PendingPostCard', () => {
  it('is an article named by its title, which links to the post', () => {
    renderCard();

    const card = screen.getByRole('article', { name: 'Flood help needed' });
    expect(card.getAttribute('tabindex')).toBe('-1');
    expect(screen.getByRole('link', { name: 'Flood help needed' }).getAttribute('href')).toBe('/posts/post-1');
  });

  it('shows the author by public name, the place and the age', () => {
    renderCard();

    expect(screen.getByText('by Ram S. · Austin, TX · 2h ago')).toBeDefined();
    expect(screen.getByText('Emergency')).toBeDefined();
  });

  it('cuts a long description to 280 characters', () => {
    renderCard({ post: { ...POST, description: 'x'.repeat(300) } as Post });

    expect(screen.getByText(`${'x'.repeat(280)}…`)).toBeDefined();
  });

  it('approves and removes', () => {
    const props = renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(props.onApprove).toHaveBeenCalledTimes(1);
    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });

  it('keeps every button focusable but inert while an action runs', () => {
    const props = renderCard({ locked: true });

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect((button as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(button);
    }
    expect(props.onApprove).not.toHaveBeenCalled();
    expect(props.onRemove).not.toHaveBeenCalled();
  });

  it('marks only the running button busy, keeping its name', () => {
    renderCard({ locked: true, busyAction: 'approve' });

    expect(screen.getByRole('button', { name: 'Approve' }).getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('button', { name: 'Remove' }).getAttribute('aria-busy')).toBeNull();
  });
});
