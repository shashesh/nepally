import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ConversationItem } from './ConversationItem';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('ConversationItem avatar menu', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows View Profile only from avatar menu', () => {
    const screen = render(
      <ConversationItem
        otherUserName="John Doe"
        otherUserTrustLevel={1}
        otherUserPhoto={null}
        lastMessage="Hello"
        lastMessageTime="2026-03-01T10:00:00Z"
        unreadCount={0}
        onPress={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('JD'), {
      nativeEvent: { pageX: 120, pageY: 180 },
    });

    expect(screen.getByText('View Profile')).toBeTruthy();
    expect(screen.queryByText('Chat')).toBeNull();

    fireEvent.press(screen.getByText('View Profile'));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('shows the other member by public name, never their full name', () => {
    const screen = render(
      <ConversationItem
        otherUserName="Bikal Shrestha"
        otherUserTrustLevel={1}
        otherUserPhoto={null}
        lastMessage="Hello"
        lastMessageTime="2026-03-01T10:00:00Z"
        unreadCount={0}
        onPress={jest.fn()}
      />
    );

    expect(screen.getByText('Bikal S.')).toBeTruthy();
    expect(screen.queryByText('Bikal Shrestha')).toBeNull();
  });
});
