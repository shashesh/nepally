import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostCard } from './PostCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('PostCard avatar menu', () => {
  it('opens avatar menu and calls chat action', () => {
    const onAvatarChat = jest.fn();

    const screen = render(
      <PostCard
        title="Need a roommate"
        timestamp="2026-03-01T10:00:00Z"
        authorName="Jane Doe"
        authorTrustLevel={1}
        authorId="other-user-1"
        currentUserId="current-user-1"
        onPress={jest.fn()}
        onAvatarChat={onAvatarChat}
      />
    );

    fireEvent.press(screen.getByText('JD'), {
      nativeEvent: { pageX: 100, pageY: 120 },
    });

    expect(screen.getByText('View Profile')).toBeTruthy();
    expect(screen.getByText('Chat')).toBeTruthy();

    fireEvent.press(screen.getByText('Chat'));
    expect(onAvatarChat).toHaveBeenCalledTimes(1);
  });
});
