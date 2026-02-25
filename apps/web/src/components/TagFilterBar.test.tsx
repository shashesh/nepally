import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const FOUR_TAGS = [
  { id: '1', slug: 'housing', name: 'Housing' },
  { id: '2', slug: 'jobs', name: 'Jobs' },
  { id: '3', slug: 'help', name: 'Help' },
  { id: '4', slug: 'question', name: 'Question' },
];

const SIX_TAGS = [
  ...FOUR_TAGS,
  { id: '5', slug: 'politics', name: 'Politics' },
  { id: '6', slug: 'discussion', name: 'Discussion' },
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
    expect(screen.getByText(/^More/)).toBeDefined();
  });

  it('hides overflow tags until More dropdown is opened', () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    expect(screen.queryByText('🗳️ Politics')).toBeNull();
    expect(screen.queryByText('💬 Discussion')).toBeNull();
  });

  it('opens the More dropdown and shows overflow tags', () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    fireEvent.click(screen.getByText(/^More/));
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

  it('calls onTagToggle for newly selected tag when Apply is clicked', () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    fireEvent.click(screen.getByText(/^More/));
    fireEvent.click(screen.getByText('🗳️ Politics'));
    fireEvent.click(screen.getByText(/^Apply/));
    expect(onTagToggle).toHaveBeenCalledWith('politics');
  });

  it('does not call onTagToggle when Apply is clicked with no changes', () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    fireEvent.click(screen.getByText(/^More/));
    fireEvent.click(screen.getByText(/^Apply/));
    expect(onTagToggle).not.toHaveBeenCalled();
  });

  it('clears local selections when Clear is clicked', () => {
    render(
      <TagFilterBar
        tags={SIX_TAGS}
        selectedSlugs={['politics']}
        onTagToggle={onTagToggle}
        onAllPress={onAllPress}
      />
    );
    fireEvent.click(screen.getByText(/^More/));
    // Should have 1 item selected in the dropdown
    expect(screen.getByText('Apply (1)')).toBeDefined();
    fireEvent.click(screen.getByText('Clear'));
    // After clear, no count shown
    expect(screen.getByText('Apply')).toBeDefined();
  });

  it('closes the More dropdown when Close button is clicked', () => {
    render(
      <TagFilterBar tags={SIX_TAGS} selectedSlugs={[]} onTagToggle={onTagToggle} onAllPress={onAllPress} />
    );
    fireEvent.click(screen.getByText(/^More/));
    expect(screen.getByText('Filter by Tags')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByText('Filter by Tags')).toBeNull();
  });
});
