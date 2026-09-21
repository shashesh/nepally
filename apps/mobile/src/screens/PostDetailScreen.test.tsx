import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import PostDetailScreen from './PostDetailScreen';
import { Image } from 'expo-image';
import {
  formatRelativeTime,
  getPostById,
  getPostComments,
  getUserLikedPostIds,
  getUserSavedPostIds,
  likePost,
} from '@nepally/shared';
import { colors } from '../styles/colors';

const mockUseRoute = jest.fn();
const mockUseNavigation = jest.fn();
const mockGetOrCreateConversation = jest.fn();
const mockPost = {
  id: 'post-1',
  author_id: 'other-user',
  title: 'Post title',
  description: 'Post body',
  created_at: '2026-03-01T10:00:00Z',
  likes_count: 2,
  is_global: false,
  photos: [] as string[],
  tags: [],
  location_city: 'Dallas',
  location_state: 'TX',
  author: {
    id: 'other-user',
    full_name: 'Author User',
    trust_level: 1,
    profile_photo: null,
  },
};

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) => ReactLocal.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

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

jest.mock('@nepally/shared', () => ({
  getPostById: jest.fn(async () => ({ data: mockPost })),
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
  formatRelativeTime: jest.fn(() => '2h ago'),
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

  it('opens avatar menu when pressing author name', async () => {
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Author User')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Author User'), {
      nativeEvent: { pageX: 90, pageY: 110 },
    });
    await waitFor(() => expect(screen.getByText('View Profile')).toBeTruthy());
  });

  it('shows reaction picker on long press Like and triggers like action', async () => {
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Like')).toBeTruthy();
    });

    fireEvent(screen.getByText('Like'), 'longPress');
    await waitFor(() => {
      expect(screen.getByText('❤️')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('🙏'));
    await waitFor(() => {
      expect(likePost).toHaveBeenCalled();
    });
  });

  it('positions the reaction dismiss overlay as a full-screen absolute layer', async () => {
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Like')).toBeTruthy();
    });

    fireEvent(screen.getByText('Like'), 'longPress');
    await waitFor(() => {
      expect(screen.getByText('❤️')).toBeTruthy();
    });

    const overlay = screen.getByTestId('reaction-dismiss-overlay');
    expect(StyleSheet.flatten(overlay.props.style)).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
      })
    );
  });
});

describe('PostDetailScreen data loading', () => {
  beforeEach(() => {
    mockUseRoute.mockReturnValue({ params: { postId: 'post-1' } });
    mockUseNavigation.mockReturnValue({
      getParent: () => ({ navigate: jest.fn() }),
    });
  });

  it('renders the post timestamp with the shared relative-time formatter', async () => {
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('2h ago')).toBeTruthy();
    });
    expect(formatRelativeTime).toHaveBeenCalledWith(new Date('2026-03-01T10:00:00Z'));
  });

  it('shows the empty-comments state only after comments finish loading', async () => {
    let resolveComments: (value: { data: never[] }) => void = () => undefined;
    (getPostComments as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => { resolveComments = resolve; })
    );
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post title')).toBeTruthy();
    });
    expect(screen.queryByText('No comments yet. Be the first to comment!')).toBeNull();
    expect(getPostComments).toHaveBeenCalledWith(expect.anything(), 'post-1');

    resolveComments({ data: [] });

    await waitFor(() => {
      expect(screen.getByText('No comments yet. Be the first to comment!')).toBeTruthy();
    });
  });

  it('shows "Post not found" instead of the previous post when the new postId is missing', async () => {
    const screen = render(<PostDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Post title')).toBeTruthy();
    });

    (getPostById as jest.Mock).mockResolvedValueOnce({ data: null });
    mockUseRoute.mockReturnValue({ params: { postId: 'missing-post' } });
    screen.rerender(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post not found')).toBeTruthy();
    });
    expect(screen.queryByText('Post title')).toBeNull();
    expect(getPostById).toHaveBeenLastCalledWith(expect.anything(), 'missing-post');
  });

  it('offers a retry instead of claiming the post is gone when the lookup fails', async () => {
    const screen = render(<PostDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Post title')).toBeTruthy();
    });

    (getPostById as jest.Mock).mockResolvedValueOnce({ error: new Error('offline') });
    mockUseRoute.mockReturnValue({ params: { postId: 'post-2' } });
    screen.rerender(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Couldn't load this post")).toBeTruthy();
    });
    // A request that failed is not a post that was deleted.
    expect(screen.queryByText('Post not found')).toBeNull();

    (getPostById as jest.Mock).mockResolvedValueOnce({ data: { ...mockPost, id: 'post-2' } });
    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Post title')).toBeTruthy();
    });
  });

  it('clears the failure when the reader moves to a post that loads', async () => {
    (getPostById as jest.Mock).mockResolvedValueOnce({ error: new Error('offline') });
    mockUseRoute.mockReturnValue({ params: { postId: 'post-2' } });
    const screen = render(<PostDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText("Couldn't load this post")).toBeTruthy();
    });

    (getPostById as jest.Mock).mockResolvedValueOnce({ data: { ...mockPost, id: 'post-3' } });
    mockUseRoute.mockReturnValue({ params: { postId: 'post-3' } });
    screen.rerender(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post title')).toBeTruthy();
    });
    expect(screen.queryByText("Couldn't load this post")).toBeNull();
  });

  it("loads the viewer's like and save state for this post", async () => {
    (getUserLikedPostIds as jest.Mock).mockResolvedValueOnce({ data: ['post-1'] });
    (getUserSavedPostIds as jest.Mock).mockResolvedValueOnce({ data: ['post-1'] });
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(StyleSheet.flatten(screen.getByText('Like').props.style)).toEqual(
        expect.objectContaining({ color: colors.accent.red })
      );
      expect(StyleSheet.flatten(screen.getByText('Save').props.style)).toEqual(
        expect.objectContaining({ color: colors.primary.main })
      );
    });
    expect(getUserLikedPostIds).toHaveBeenCalledWith(expect.anything(), 'current-user');
    expect(getUserSavedPostIds).toHaveBeenCalledWith(expect.anything(), 'current-user');
  });

  it('opens the photo lightbox at the tapped photo and closes it', async () => {
    (getPostById as jest.Mock).mockResolvedValueOnce({
      data: { ...mockPost, photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'] },
    });
    const screen = render(<PostDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Post title')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Close image viewer')).toBeNull();

    // Tap the second photo in the detail grid.
    fireEvent.press(screen.UNSAFE_getAllByType(Image)[1]);

    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Close image viewer'));

    await waitFor(() => {
      expect(screen.queryByLabelText('Close image viewer')).toBeNull();
    });
  });
});
