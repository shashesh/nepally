import React from 'react';
import { fireEvent, render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { Post, ReportWithUsers } from '@nepally/shared';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

import { ReportCard, type ReportCardProps } from './ReportCard';

const NOW = new Date('2026-09-24T12:00:00.000Z');

const POST_REPORT = {
  id: 'report-1',
  reported_by: 'user-3',
  reported_by_user: { id: 'user-3', full_name: 'Sita Rai' },
  target_type: 'post',
  target_id: 'post-9',
  reason: 'Spam',
  description: 'Fake listing',
  created_at: '2026-09-24T11:00:00.000Z',
} as unknown as ReportWithUsers;

const REPORTED_POST = {
  id: 'post-9',
  author_id: 'user-4',
  author: { id: 'user-4', full_name: 'Ram Sharma' },
  title: 'Cheap phones',
} as unknown as Post;

function renderCard(props: Partial<ReportCardProps> = {}) {
  const all: ReportCardProps = {
    report: POST_REPORT,
    post: REPORTED_POST,
    now: NOW,
    busyAction: null,
    locked: false,
    onDismiss: vi.fn(),
    onRemovePost: vi.fn(),
    onBan: vi.fn(),
    ...props,
  };
  render(<ReportCard {...all} />);
  return all;
}

describe('ReportCard', () => {
  it('is an article headed by the reason', () => {
    renderCard();

    expect(screen.getByRole('article', { name: 'Spam' }).getAttribute('tabindex')).toBe('-1');
    expect(screen.getByRole('heading', { level: 3, name: 'Spam' })).toBeDefined();
    expect(screen.getByText('Fake listing')).toBeDefined();
    expect(screen.getByText('Reported by Sita R. · 1h ago')).toBeDefined();
  });

  it('shows the reported post and offers every post action', () => {
    const props = renderCard();

    expect(screen.getByText('Cheap phones')).toBeDefined();
    expect(screen.getByRole('link', { name: 'View post' }).getAttribute('href')).toBe('/posts/post-9');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove post' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ban author' }));

    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(props.onRemovePost).toHaveBeenCalledTimes(1);
    expect(props.onBan).toHaveBeenCalledWith('user-4', 'Ram S.');
  });

  it('says a missing post is gone and offers no ban', () => {
    renderCard({ post: undefined });

    expect(screen.getByText('Post no longer available')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remove post' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Ban author' })).toBeNull();
  });

  it('links a member report to the member and offers a ban', () => {
    const props = renderCard({
      report: { ...POST_REPORT, target_type: 'user', target_id: 'user-5' },
      post: undefined,
    });

    expect(screen.getByRole('link', { name: 'View member' }).getAttribute('href')).toBe('/users/user-5');
    expect(screen.queryByRole('button', { name: 'Remove post' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ban user' }));
    expect(props.onBan).toHaveBeenCalledWith('user-5', 'this member');
  });

  it('keeps a message report private and offers only Dismiss', () => {
    renderCard({ report: { ...POST_REPORT, target_type: 'message', target_id: 'm-1' }, post: undefined });

    expect(screen.getByText(/Message content is private/)).toBeDefined();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Dismiss']);
  });

  it('keeps every button focusable but inert while an action runs', () => {
    const props = renderCard({ locked: true, busyAction: 'ban' });

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect((button as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(button);
    }
    expect(props.onDismiss).not.toHaveBeenCalled();
    expect(props.onBan).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Ban author' }).getAttribute('aria-busy')).toBe('true');
  });
});
