import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const postDetailMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  getPostByIdMock: vi.fn(),
  getPostCommentsMock: vi.fn(),
  createCommentMock: vi.fn(),
  deleteCommentMock: vi.fn(),
  likePostMock: vi.fn(),
  unlikePostMock: vi.fn(),
  getUserLikedPostIdsMock: vi.fn(),
  deletePostMock: vi.fn(),
  getOrCreateConversationMock: vi.fn(),
  buildSingleLevelCommentThreadsMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: postDetailMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: postDetailMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    getPostById: postDetailMocks.getPostByIdMock,
    getPostComments: postDetailMocks.getPostCommentsMock,
    createComment: postDetailMocks.createCommentMock,
    deleteComment: postDetailMocks.deleteCommentMock,
    likePost: postDetailMocks.likePostMock,
    unlikePost: postDetailMocks.unlikePostMock,
    getUserLikedPostIds: postDetailMocks.getUserLikedPostIdsMock,
    deletePost: postDetailMocks.deletePostMock,
    getOrCreateConversation: postDetailMocks.getOrCreateConversationMock,
    buildSingleLevelCommentThreads: postDetailMocks.buildSingleLevelCommentThreadsMock,
    formatRelativeTime: postDetailMocks.formatRelativeTimeMock,
    TAG_EMOJI: { housing: '🏠', jobs: '💼' },
  };
});
vi.mock('../../components/Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': 'avatar' }, name),
}));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) =>
    React.createElement('a', { href, className }, children),
}));

const mockPost = {
  id: 'post-1',
  title: 'Looking for a roommate',
  description: 'Need a roommate in Dallas area.',
  author_id: 'user-2',
  author: { full_name: 'Bikal Shrestha', profile_photo: null, trust_level: 1 },
  is_global: false,
  likes_count: 5,
  created_at: '2026-02-24T10:00:00Z',
  tags: [{ id: 'tag-1', slug: 'housing', name: 'Housing' }],
  photos: [],
  location_city: 'Dallas',
  location_state: 'TX',
};

import PostDetailPage from './[id]';

describe('PostDetailPage', () => {
  const mockPush = vi.fn();
  const mockUser = { id: 'user-1', full_name: 'Test User' };

  beforeEach(() => {
    vi.clearAllMocks();
    postDetailMocks.useRouterMock.mockReturnValue({
      query: { id: 'post-1' },
      push: mockPush,
    });
    postDetailMocks.useAuthMock.mockReturnValue({ user: mockUser });
    postDetailMocks.getPostCommentsMock.mockResolvedValue({ data: [] });
    postDetailMocks.getUserLikedPostIdsMock.mockResolvedValue({ data: [] });
    postDetailMocks.buildSingleLevelCommentThreadsMock.mockReturnValue([]);
    postDetailMocks.formatRelativeTimeMock.mockReturnValue('2h ago');
  });

  it('shows loading state while fetching post', () => {
    postDetailMocks.getPostByIdMock.mockReturnValue(new Promise(() => {}));
    render(<PostDetailPage />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('shows "Post not found" when post does not exist', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: null });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Post not found')).toBeDefined();
    });
  });

  it('renders post title and body', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Looking for a roommate')).toBeDefined();
      expect(screen.getByText('Need a roommate in Dallas area.')).toBeDefined();
    });
  });

  it('renders the post author name', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Bikal Shrestha').length).toBeGreaterThan(0);
    });
  });

  it('renders Local badge for non-global post', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('📍 Local')).toBeDefined();
    });
  });

  it('renders Global badge for global post', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: { ...mockPost, is_global: true } });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('🌐 Global')).toBeDefined();
    });
  });

  it('shows tags', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('🏠 Housing')).toBeDefined();
    });
  });

  it('shows comment count', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.buildSingleLevelCommentThreadsMock.mockReturnValue([]);
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Comments (0)')).toBeDefined();
    });
  });

  it('shows no comments message when empty', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('No comments yet. Be the first to comment!')).toBeDefined();
    });
  });

  it('shows Edit and Delete options in post menu for post owner', async () => {
    postDetailMocks.useAuthMock.mockReturnValue({ user: { id: 'user-2', full_name: 'Bikal' } });
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: { ...mockPost, author_id: 'user-2' } });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      expect(screen.getByText('Edit Post')).toBeDefined();
      expect(screen.getByText('Delete Post')).toBeDefined();
    });
  });

  it('shows Share and Report options in post menu for non-owner', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      expect(screen.getByText('Share Post')).toBeDefined();
      expect(screen.getByText('Report Post')).toBeDefined();
    });
  });

  it('submits a comment', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.createCommentMock.mockResolvedValue({
      data: {
        id: 'comment-1',
        content: 'Great post!',
        author_id: 'user-1',
        post_id: 'post-1',
        parent_comment_id: null,
        created_at: '2026-02-24T11:00:00Z',
      },
    });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByPlaceholderText('Write a comment...')).toBeDefined());
    fireEvent.change(screen.getByPlaceholderText('Write a comment...'), {
      target: { value: 'Great post!' },
    });
    fireEvent.submit(screen.getByPlaceholderText('Write a comment...').closest('form')!);
    await waitFor(() => {
      expect(postDetailMocks.createCommentMock).toHaveBeenCalledWith(
        expect.anything(),
        'post-1',
        'Great post!',
        undefined
      );
    });
  });

  it('optimistically toggles like', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.likePostMock.mockResolvedValue({});
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(/🤍 5/)).toBeDefined();
    });
    fireEvent.click(screen.getByText(/🤍 5/));
    await waitFor(() => {
      expect(screen.getByText(/❤️ 6/)).toBeDefined();
    });
  });
});
