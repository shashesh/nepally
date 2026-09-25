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
  formatDayLabel: jest.requireActual('@nepally/shared').formatDayLabel,
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

  describe('day separators', () => {
    // Monday 9 March 2026, the day after US clocks sprang forward: 8 March had 23 hours.
    const NOW = new Date(2026, 2, 9, 12, 0);

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    function message(id: string, text: string, at: Date) {
      return {
        id,
        conversation_id: 'conv-1',
        sender_id: 'other-user',
        text,
        type: 'text',
        read: true,
        read_at: null,
        timestamp: at.toISOString(),
      };
    }

    it('labels today Today and the previous calendar day Yesterday across a DST change', async () => {
      mockGetMessages.mockResolvedValue({
        data: [
          message('m1', 'Late on Sunday', new Date(2026, 2, 8, 23, 30)),
          message('m2', 'Monday morning', new Date(2026, 2, 9, 8)),
        ],
      });
      const screen = render(<MessageThreadScreen />);
      await act(async () => {});

      expect(screen.getByText('Yesterday')).toBeTruthy();
      expect(screen.getByText('Today')).toBeTruthy();
    });

    it('gives last year\'s date its year and its own separator', async () => {
      mockGetMessages.mockResolvedValue({
        data: [
          message('m1', 'A year ago', new Date(2025, 2, 5, 12)),
          message('m2', 'This year', new Date(2026, 2, 5, 12)),
        ],
      });
      const screen = render(<MessageThreadScreen />);
      await act(async () => {});

      expect(screen.getByText('Mar 5, 2025')).toBeTruthy();
      expect(screen.getByText('Mar 5')).toBeTruthy();
    });
  });
});
