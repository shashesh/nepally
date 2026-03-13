import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostMoreSheet } from './PostMoreSheet';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('PostMoreSheet', () => {
  it('renders own-post actions and handles edit', () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    const screen = render(
      <PostMoreSheet
        visible
        isOwnPost
        onClose={onClose}
        onEdit={onEdit}
        onDelete={jest.fn()}
        onShare={jest.fn()}
      />
    );

    expect(screen.getByText('Edit Post')).toBeTruthy();
    expect(screen.queryByText('Report Post')).toBeNull();

    fireEvent.press(screen.getByText('Edit Post'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('renders viewer actions including save and report', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();
    const onSave = jest.fn();
    const screen = render(
      <PostMoreSheet
        visible
        isOwnPost={false}
        onClose={onClose}
        onReport={onReport}
        onSave={onSave}
        onShare={jest.fn()}
      />
    );

    expect(screen.getByText('Save Post')).toBeTruthy();
    expect(screen.getByText('Report Post')).toBeTruthy();
    expect(screen.queryByText('Delete Post')).toBeNull();

    fireEvent.press(screen.getByText('Report Post'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('shows unsave label when post is already saved', () => {
    const screen = render(
      <PostMoreSheet
        visible
        isOwnPost={false}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaved
      />
    );

    expect(screen.getByText('Unsave Post')).toBeTruthy();
  });
});

