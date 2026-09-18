import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { Tag } from '@nepally/shared';
import { TagSelectorSheet } from './TagSelectorSheet';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@nepally/shared', () => ({
  TAG_EMOJI: { housing: '🏠', jobs: '💼' },
}));

function makeTag(slug: string, name: string, sortOrder: number): Tag {
  return {
    id: `tag-${slug}`,
    name,
    slug,
    icon: null,
    color: null,
    description: null,
    is_system: true,
    requires_moderation: false,
    sort_order: sortOrder,
    created_at: '2025-01-01T00:00:00Z',
  };
}

const TAGS: Tag[] = [makeTag('housing', 'Housing', 1), makeTag('jobs', 'Jobs', 2)];

describe('TagSelectorSheet', () => {
  it('starts from the selected slugs and applies local changes', () => {
    const onApply = jest.fn();
    const screen = render(
      <TagSelectorSheet
        visible
        tags={TAGS}
        selectedSlugs={['housing']}
        onClose={jest.fn()}
        onApply={onApply}
      />
    );

    fireEvent.press(screen.getByText('💼 Jobs'));
    fireEvent.press(screen.getByText('Apply (2)'));

    expect(onApply).toHaveBeenCalledWith(['housing', 'jobs']);
  });

  it('discards unapplied changes when reopened', () => {
    const onApply = jest.fn();
    const selectedSlugs = ['housing'];
    const props = { tags: TAGS, selectedSlugs, onClose: jest.fn(), onApply };
    const screen = render(<TagSelectorSheet visible {...props} />);

    fireEvent.press(screen.getByText('Clear'));
    expect(screen.getByText('Apply')).toBeTruthy();

    screen.rerender(<TagSelectorSheet visible={false} {...props} />);
    screen.rerender(<TagSelectorSheet visible {...props} />);

    fireEvent.press(screen.getByText('Apply (1)'));
    expect(onApply).toHaveBeenCalledWith(['housing']);
  });

  it('follows the parent selection when it changes while open', () => {
    const onApply = jest.fn();
    const props = { tags: TAGS, onClose: jest.fn(), onApply };
    const screen = render(<TagSelectorSheet visible selectedSlugs={['housing']} {...props} />);

    screen.rerender(<TagSelectorSheet visible selectedSlugs={['jobs']} {...props} />);

    fireEvent.press(screen.getByText('Apply (1)'));
    expect(onApply).toHaveBeenCalledWith(['jobs']);
  });
});
