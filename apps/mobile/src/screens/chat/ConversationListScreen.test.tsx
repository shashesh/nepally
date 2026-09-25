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
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactActual = jest.requireActual('react') as typeof import('react');
    const cbRef = ReactActual.useRef(cb);
    cbRef.current = cb;
    ReactActual.useEffect(() => {
      const cleanup = cbRef.current();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'current-user' } }),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {},
}));

jest.mock('@nepally/shared', () => ({
  getConversations: (...args: unknown[]) => mockGetConversations(...args),
  formatRelativeTime: () => '2h ago',
  formatPublicName: jest.requireActual('@nepally/shared').formatPublicName,
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

  it('shows the public name and navigates to MessageThread with the full name', async () => {
    const screen = render(<ConversationListScreen />);
    await act(async () => {});

    expect(screen.getByText('Other U.')).toBeTruthy();
    expect(screen.queryByText('Other User')).toBeNull();
    fireEvent.press(screen.getByText('Other U.'));

    expect(mockNavigate).toHaveBeenCalledWith('MessageThread', {
      conversationId: 'conv-1',
      otherUserId: 'other-user',
      otherUserName: 'Other User',
      otherUserTrustLevel: 1,
      otherUserPhotoUrl: null,
    });
  });
});
