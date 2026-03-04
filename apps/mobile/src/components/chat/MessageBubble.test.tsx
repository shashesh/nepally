import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MessageBubble } from './MessageBubble';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('MessageBubble avatar press', () => {
  it('passes tap coordinates to onAvatarPress', () => {
    const onAvatarPress = jest.fn();

    const screen = render(
      <MessageBubble
        text="Hi"
        timestamp="2026-03-01T10:00:00Z"
        isSent={false}
        isRead={false}
        senderName="John Doe"
        senderTrustLevel={1}
        showAvatar
        onAvatarPress={onAvatarPress}
      />
    );

    fireEvent.press(screen.getByText('JD'), {
      nativeEvent: { pageX: 88, pageY: 144 },
    });

    expect(onAvatarPress).toHaveBeenCalledWith(88, 144);
  });
});
