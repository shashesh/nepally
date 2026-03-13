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

  it('expands truncated description when tapping See more', () => {
    const longDescription = `${'Useful community update '.repeat(12)}with final note`;
    const screen = render(
      <PostCard
        title="Community update"
        description={longDescription}
        timestamp="2026-03-01T10:00:00Z"
        authorName="Jane Doe"
        authorTrustLevel={1}
        authorId="other-user-1"
        currentUserId="current-user-1"
        onPress={jest.fn()}
      />
    );

    expect(screen.getByText(/See more/)).toBeTruthy();
    fireEvent.press(screen.getByText(/See more/), { stopPropagation: jest.fn() });
    expect(screen.queryByText(/See more/)).toBeNull();
    expect(screen.getByText(longDescription)).toBeTruthy();
  });

  it('calls onAvatarViewProfile when pressing author name for other user', () => {
    const onAvatarViewProfile = jest.fn();
    const screen = render(
      <PostCard
        title="Need a roommate"
        timestamp="2026-03-01T10:00:00Z"
        authorName="Jane Doe"
        authorTrustLevel={1}
        authorId="other-user-1"
        currentUserId="current-user-1"
        onPress={jest.fn()}
        onAvatarViewProfile={onAvatarViewProfile}
      />
    );

    fireEvent.press(screen.getByText('Jane Doe'), { stopPropagation: jest.fn() });
    expect(onAvatarViewProfile).toHaveBeenCalledTimes(1);
  });

  it('shows reaction picker on like long press and reacts', () => {
    const onLikePress = jest.fn();
    const screen = render(
      <PostCard
        title="Need a roommate"
        timestamp="2026-03-01T10:00:00Z"
        authorName="Jane Doe"
        authorTrustLevel={1}
        authorId="other-user-1"
        currentUserId="current-user-1"
        onPress={jest.fn()}
        onLikePress={onLikePress}
      />
    );

    fireEvent(screen.getByText('Like'), 'longPress', { stopPropagation: jest.fn() });
    expect(screen.getByText('❤️')).toBeTruthy();

    fireEvent.press(screen.getByText('🙏'));
    expect(onLikePress).toHaveBeenCalledTimes(1);
  });

  it('renders counts row with formatted labels', () => {
    const screen = render(
      <PostCard
        title="Need a roommate"
        timestamp="2026-03-01T10:00:00Z"
        authorName="Jane Doe"
        authorTrustLevel={1}
        authorId="other-user-1"
        currentUserId="current-user-1"
        likesCount={1200}
        commentsCount={1}
        onPress={jest.fn()}
      />
    );

    expect(screen.getByText('1.2K likes')).toBeTruthy();
    expect(screen.getByText('1 comment')).toBeTruthy();
  });
});
