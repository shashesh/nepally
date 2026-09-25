import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import MessageThreadScreen from './MessageThreadScreen';

const mockUseRoute = jest.fn();
const mockGoBack = jest.fn();
const mockGetMessages = jest.fn();
const mockSubscribeToMessages = jest.fn();
const mockRemoveChannel = jest.fn();

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
  supabase: { removeChannel: (...args: unknown[]) => mockRemoveChannel(...args) },
}));

jest.mock('@nepally/shared', () => ({
  getMessages: (...args: unknown[]) => mockGetMessages(...args),
  sendMessage: jest.fn(async () => ({ data: null })),
  markAsRead: jest.fn(async () => ({})),
  subscribeToMessages: (...args: unknown[]) => mockSubscribeToMessages(...args),
  blockUser: jest.fn(async () => ({})),
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
}));

describe('MessageThreadScreen avatar menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    await act(async () => {});

    expect(screen.getByText('Hello there')).toBeTruthy();

    fireEvent.press(screen.getAllByText('OU')[0], {
      nativeEvent: { pageX: 120, pageY: 160 },
    });
    await act(async () => {});

    expect(screen.getByText('View Profile')).toBeTruthy();
    expect(screen.queryByText('Chat')).toBeNull();
  });

  it('reloads messages on Retry without re-subscribing to realtime', async () => {
    mockGetMessages.mockResolvedValueOnce({ data: null, error: new Error('Network error') });
    const screen = render(<MessageThreadScreen />);

    await waitFor(() => {
      expect(screen.getByText('Could not load messages. Please try again.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Hello there')).toBeTruthy();
    });
    expect(screen.queryByText('Could not load messages. Please try again.')).toBeNull();
    expect(mockGetMessages).toHaveBeenCalledTimes(2);
    expect(mockSubscribeToMessages).toHaveBeenCalledTimes(1);
  });

  it('removes its realtime channel from the client on unmount', async () => {
    const channel = { unsubscribe: jest.fn() };
    mockSubscribeToMessages.mockReturnValue(channel);
    const screen = render(<MessageThreadScreen />);
    await act(async () => {});

    screen.unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(channel);
  });
});
