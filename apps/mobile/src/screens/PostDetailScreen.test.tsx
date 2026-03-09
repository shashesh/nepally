import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PostDetailScreen from './PostDetailScreen';

const mockUseRoute = jest.fn();
const mockUseNavigation = jest.fn();
const mockGetOrCreateConversation = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
  const mockReact = jest.requireActual('react');
  const { View: mockView, ScrollView: mockScrollView } = jest.requireActual('react-native');
  return {
    PinchGestureHandler: ({ children }: { children?: React.ReactNode }) => mockReact.createElement(mockView, null, children),
    PanGestureHandler: ({ children }: { children?: React.ReactNode }) => mockReact.createElement(mockView, null, children),
    GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => mockReact.createElement(mockView, null, children),
    ScrollView: mockScrollView,
    State: { ACTIVE: 4, BEGAN: 2 },
  };
});

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockUseRoute(),
  useNavigation: () => mockUseNavigation(),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'current-user', full_name: 'Current User', trust_level: 1 } }),
}));

jest.mock('../config/supabase', () => ({
  supabase: {},
}));

jest.mock('@nusa/shared', () => ({
  getPostById: jest.fn(async () => ({
    data: {
      id: 'post-1',
      author_id: 'other-user',
      title: 'Post title',
      description: 'Post body',
      created_at: '2026-03-01T10:00:00Z',
      likes_count: 2,
      is_global: false,
      photos: [],
      tags: [],
      location_city: 'Dallas',
      location_state: 'TX',
      author: {
        id: 'other-user',
        full_name: 'Author User',
        trust_level: 1,
        profile_photo: null,
      },
    },
  })),
  getOrCreateConversation: (...args: unknown[]) => mockGetOrCreateConversation(...args),
  likePost: jest.fn(async () => ({})),
  unlikePost: jest.fn(async () => ({})),
  getUserLikedPostIds: jest.fn(async () => ({ data: [] })),
  savePost: jest.fn(async () => ({})),
  unsavePost: jest.fn(async () => ({})),
  getUserSavedPostIds: jest.fn(async () => ({ data: [] })),
  getPostComments: jest.fn(async () => ({ data: [] })),
  createComment: jest.fn(async () => ({ data: null })),
  deleteComment: jest.fn(async () => ({ error: null })),
  buildSingleLevelCommentThreads: jest.fn(() => []),
  logClientEvent: jest.fn(),
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
  TAG_EMOJI: {},
  TAG_COLORS: {},
  DEFAULT_TAG_COLOR: '#4A90E2',
}));

describe('PostDetailScreen avatar menu', () => {
  beforeEach(() => {
    mockUseRoute.mockReturnValue({ params: { postId: 'post-1' } });
    mockUseNavigation.mockReturnValue({
      getParent: () => ({ navigate: jest.fn() }),
    });
    mockGetOrCreateConversation.mockResolvedValue({ data: { conversationId: 'conv-1' } });
  });

  it('shows View Profile and Chat when tapping author avatar', async () => {
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post title')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('AU'), {
      nativeEvent: { pageX: 90, pageY: 110 },
    });

    await waitFor(() => {
      expect(screen.getByText('View Profile')).toBeTruthy();
      expect(screen.getByText('Chat')).toBeTruthy();
    });
  });

  it('pressing View Profile for other user navigates to PublicProfileView', async () => {
    const mockNavigate = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      getParent: () => ({ navigate: jest.fn() }),
    });
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post title')).toBeTruthy();
    });

    // Tap author avatar to open dropdown (author is 'other-user', current user is 'current-user')
    fireEvent.press(screen.getByText('AU'), {
      nativeEvent: { pageX: 90, pageY: 110 },
    });

    await waitFor(() => expect(screen.getByText('View Profile')).toBeTruthy());

    fireEvent.press(screen.getByText('View Profile'));

    expect(mockNavigate).toHaveBeenCalledWith('PublicProfileView', { userId: 'other-user' });
  });
});
