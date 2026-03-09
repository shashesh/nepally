import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import MessageThreadScreen from './MessageThreadScreen';

const mockUseRoute = jest.fn();
const mockGoBack = jest.fn();
const mockGetMessages = jest.fn();
const mockSubscribeToMessages = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockUseRoute(),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'current-user' } }),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {},
}));

jest.mock('@nusa/shared', () => ({
  getMessages: (...args: unknown[]) => mockGetMessages(...args),
  sendMessage: jest.fn(async () => ({ data: null })),
  markAsRead: jest.fn(async () => ({})),
  subscribeToMessages: (...args: unknown[]) => mockSubscribeToMessages(...args),
  blockUser: jest.fn(async () => ({})),
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
}));

describe('MessageThreadScreen avatar menu', () => {
  beforeEach(() => {
    mockUseRoute.mockReturnValue({
      params: {
        conversationId: 'conv-1',
        otherUserId: 'other-user',
        otherUserName: 'Other User',
        otherUserTrustLevel: 1,
        otherUserPhotoUrl: null,
      },
    });

    mockGetMessages.mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'other-user',
          text: 'Hello there',
          type: 'text',
          read: false,
          read_at: null,
          timestamp: '2026-03-01T10:00:00Z',
        },
      ],
    });

    mockSubscribeToMessages.mockReturnValue({ unsubscribe: jest.fn() });
  });

  it('shows View Profile only when avatar is tapped', async () => {
    const screen = render(<MessageThreadScreen />);

    await waitFor(() => {
      expect(screen.getByText('Hello there')).toBeTruthy();
    });

    fireEvent.press(screen.getAllByText('OU')[0], {
      nativeEvent: { pageX: 120, pageY: 160 },
    });

    await waitFor(() => {
      expect(screen.getByText('View Profile')).toBeTruthy();
    });
    expect(screen.queryByText('Chat')).toBeNull();
  });
});
