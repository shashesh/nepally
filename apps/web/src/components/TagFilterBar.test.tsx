import React from 'react';
import { render, screen, fireEvent, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tag } from '@nusa/shared';

vi.mock('@nusa/shared', () => ({
  TAG_EMOJI: {
    housing: '🏠',
    jobs: '💼',
    help: '🆘',
    question: '❓',
    politics: '🗳️',
    discussion: '💬',
    emergency: '🚨',
  },
}));

import TagFilterBar from './TagFilterBar';

function makeTag(id: string, slug: string, name: string): Tag {
  return {
    id,
    slug,
    name,
    icon: null,
    color: null,
    description: null,
    is_system: true,
    requires_moderation: false,
    sort_order: Number(id),
    created_at: '2026-01-01T00:00:00Z',
  };
}

const FOUR_TAGS: Tag[] = [
  makeTag('1', 'housing', 'Housing'),
  makeTag('2', 'jobs', 'Jobs'),
  makeTag('3', 'help', 'Help'),
  makeTag('4', 'question', 'Question'),
];

const SIX_TAGS: Tag[] = [
  ...FOUR_TAGS,
  makeTag('5', 'politics', 'Politics'),
  makeTag('6', 'discussion', 'Discussion'),
];

describe('TagFilterBar', () => {
  let onTagToggle: ReturnType<typeof vi.fn>;
  let onAllPress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onTagToggle = vi.fn();
    onAllPress = vi.fn();
  });

  it('renders the All chip', () => {
    render(
      <TagFilterBar tags={FOUR_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    expect(screen.getByText('All')).toBeDefined();
  });

  it('calls onAllPress when All chip is clicked', () => {
    render(
      <TagFilterBar tags={FOUR_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    fireEvent.click(screen.getByText('All'));
    expect(onAllPress).toHaveBeenCalledTimes(1);
  });

  it('renders visible tag chips with emoji and name', () => {
    render(
      <TagFilterBar tags={FOUR_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    expect(screen.getByText('🏠 Housing')).toBeDefined();
    expect(screen.getByText('💼 Jobs')).toBeDefined();
    expect(screen.getByText('🆘 Help')).toBeDefined();
    expect(screen.getByText('❓ Question')).toBeDefined();
  });

  it('calls onTagToggle with the correct slug when a visible tag is clicked', () => {
    render(
      <TagFilterBar tags={FOUR_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    fireEvent.click(screen.getByText('💼 Jobs'));
    expect(onTagToggle).toHaveBeenCalledWith('jobs');
  });

  it('does not render the More button when there are 4 or fewer tags', () => {
    render(
      <TagFilterBar tags={FOUR_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    expect(screen.queryByText(/More/)).toBeNull();
  });

  it('renders the More button when there are more than 4 tags', () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    expect(screen.getByRole('button', { name: /^More/ })).toBeDefined();
  });

  it('opens the More dropdown and shows overflow tags', async () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    });
    expect(screen.getByText('Filter by Tags')).toBeDefined();
    expect(screen.getByText('🗳️ Politics')).toBeDefined();
    expect(screen.getByText('💬 Discussion')).toBeDefined();
  });

  it('shows selection count on More button when overflow tags are selected', () => {
    render(
      <TagFilterBar
        tags={SIX_TAGS}
        selectedSlugs={['politics', 'discussion']}
        onTagToggle={onTagToggle}
        onAllPress={onAllPress}
      />
    );
    expect(screen.getByRole('button', { name: /More \+2/ })).toBeDefined();
  });

  it('calls onTagToggle for newly selected tag when Apply is clicked', async () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    });
    fireEvent.click(screen.getByText('🗳️ Politics'));
    fireEvent.click(screen.getByText(/^Apply/));
    expect(onTagToggle).toHaveBeenCalledWith('politics');
  });

  it('does not call onTagToggle when Apply is clicked with no changes', async () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    });
    fireEvent.click(screen.getByText(/^Apply/));
    expect(onTagToggle).not.toHaveBeenCalled();
  });

  it('clears local selections when Clear is clicked', async () => {
    render(
      <TagFilterBar
        tags={SIX_TAGS}
        selectedSlugs={['politics']}
        onTagToggle={onTagToggle}
        onAllPress={onAllPress}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    });
    expect(screen.getByText('Apply (1)')).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByText('Clear'));
    });
    expect(screen.getByText('Apply')).toBeDefined();
  });

  it('closes the More dropdown when Close button is clicked', async () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^More/ }));
    });
    expect(screen.getByText('Filter by Tags')).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Close'));
    });
    expect(screen.queryByText('Filter by Tags')).toBeNull();
  });
});
