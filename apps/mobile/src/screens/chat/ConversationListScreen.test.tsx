import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import ConversationListScreen from './ConversationListScreen';

const mockNavigate = jest.fn();
const mockGetConversations = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getParent: jest.fn(() => ({ navigate: jest.fn() })) }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'current-user' } }),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {},
}));

jest.mock('@nusa/shared', () => ({
  getConversations: (...args: unknown[]) => mockGetConversations(...args),
}));

describe('ConversationListScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetConversations.mockResolvedValue({
      data: [
        {
          id: 'conv-1',
          other_user_id: 'other-user',
          other_user_name: 'Other User',
          other_user_photo: null,
          other_user_trust_level: 1,
          last_message: 'Hello',
          last_message_time: '2026-03-01T10:00:00Z',
          unread_count: 2,
          created_at: '2026-03-01T10:00:00Z',
        },
      ],
    });
  });

  it('navigates to MessageThread when a conversation is pressed', async () => {
    const screen = render(<ConversationListScreen />);
    await act(async () => {});

    expect(screen.getByText('Other User')).toBeTruthy();
    fireEvent.press(screen.getByText('Other User'));

    expect(mockNavigate).toHaveBeenCalledWith('MessageThread', {
      conversationId: 'conv-1',
      otherUserId: 'other-user',
      otherUserName: 'Other User',
      otherUserTrustLevel: 1,
      otherUserPhotoUrl: null,
    });
  });
});
