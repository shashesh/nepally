import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type MockImageProps = { src: string; alt: string; className?: string };

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
  getUserSavedPostIdsMock: vi.fn(),
  savePostMock: vi.fn(),
  unsavePostMock: vi.fn(),
  deletePostMock: vi.fn(),
  getOrCreateConversationMock: vi.fn(),
  createReportMock: vi.fn(),
  buildSingleLevelCommentThreadsMock: vi.fn(),
  formatRelativeTimeMock: vi.fn(),
  logClientEventMock: vi.fn(),
  notificationsShowMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: postDetailMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: postDetailMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getPostById: postDetailMocks.getPostByIdMock,
    getPostComments: postDetailMocks.getPostCommentsMock,
    createComment: postDetailMocks.createCommentMock,
    deleteComment: postDetailMocks.deleteCommentMock,
    likePost: postDetailMocks.likePostMock,
    unlikePost: postDetailMocks.unlikePostMock,
    getUserLikedPostIds: postDetailMocks.getUserLikedPostIdsMock,
    getUserSavedPostIds: postDetailMocks.getUserSavedPostIdsMock,
    savePost: postDetailMocks.savePostMock,
    unsavePost: postDetailMocks.unsavePostMock,
    deletePost: postDetailMocks.deletePostMock,
    getOrCreateConversation: postDetailMocks.getOrCreateConversationMock,
    createReport: postDetailMocks.createReportMock,
    buildSingleLevelCommentThreads: postDetailMocks.buildSingleLevelCommentThreadsMock,
    formatRelativeTime: postDetailMocks.formatRelativeTimeMock,
    logClientEvent: postDetailMocks.logClientEventMock,
    TAG_EMOJI: { housing: '🏠', jobs: '💼' },
  };
});
vi.mock('@mantine/notifications', () => ({
  notifications: { show: postDetailMocks.notificationsShowMock },
}));
vi.mock('../../components/Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': 'avatar' }, name),
}));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: MockImageProps) =>
    React.createElement('img', { src, alt, className }),
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

import PostDetailPage from './[id].page';

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
    postDetailMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: [] });
    postDetailMocks.savePostMock.mockResolvedValue({});
    postDetailMocks.unsavePostMock.mockResolvedValue({});
    postDetailMocks.createReportMock.mockResolvedValue({ data: { id: 'report-1' } });
    postDetailMocks.buildSingleLevelCommentThreadsMock.mockReturnValue([]);
    postDetailMocks.formatRelativeTimeMock.mockReturnValue('2h ago');
  });

  it('shows loading state while fetching post', () => {
    postDetailMocks.getPostByIdMock.mockReturnValue(new Promise(() => {}));
    render(<PostDetailPage />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  describe('when the route id changes', () => {
    const secondPost = { ...mockPost, id: 'post-2', title: 'Second post' };

    function navigateToSecondPost(rerender: (ui: React.ReactElement) => void) {
      postDetailMocks.useRouterMock.mockReturnValue({
        query: { id: 'post-2' },
        push: mockPush,
      });
      rerender(<PostDetailPage />);
    }

    it('shows the loading state and then the new post', async () => {
      let resolveSecond: (value: unknown) => void = () => {};
      postDetailMocks.getPostByIdMock
        .mockResolvedValueOnce({ data: mockPost })
        .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
      const { rerender } = render(<PostDetailPage />);
      await waitFor(() => expect(screen.getByText('Looking for a roommate')).toBeDefined());

      navigateToSecondPost(rerender);
      expect(screen.getByText('Loading...')).toBeDefined();

      resolveSecond({ data: secondPost });
      await waitFor(() => expect(screen.getByText('Second post')).toBeDefined());
      expect(postDetailMocks.getPostByIdMock).toHaveBeenLastCalledWith(expect.anything(), 'post-2');
      expect(postDetailMocks.getPostCommentsMock).toHaveBeenLastCalledWith(expect.anything(), 'post-2');
    });

    it('ignores a late response for the previous post', async () => {
      let resolveFirst: (value: unknown) => void = () => {};
      postDetailMocks.getPostByIdMock
        .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
        .mockResolvedValueOnce({ data: secondPost });
      const { rerender } = render(<PostDetailPage />);

      navigateToSecondPost(rerender);
      await waitFor(() => expect(screen.getByText('Second post')).toBeDefined());

      await act(async () => {
        resolveFirst({ data: mockPost });
      });

      expect(screen.getByText('Second post')).toBeDefined();
      expect(screen.queryByText('Looking for a roommate')).toBeNull();
    });

    it('shows "Post not found" instead of the previous post when the new post is missing', async () => {
      postDetailMocks.getPostByIdMock
        .mockResolvedValueOnce({ data: mockPost })
        .mockResolvedValueOnce({ data: null });
      const { rerender } = render(<PostDetailPage />);
      await waitFor(() => expect(screen.getByText('Looking for a roommate')).toBeDefined());

      navigateToSecondPost(rerender);

      await waitFor(() => expect(screen.getByText('Post not found')).toBeDefined());
      expect(screen.queryByText('Looking for a roommate')).toBeNull();
    });

    it("does not show the previous post's comments under the new post", async () => {
      const firstPostComments = [
        { id: 'c-1', post_id: 'post-1', content: 'First', parent_comment_id: null },
        { id: 'c-2', post_id: 'post-1', content: 'Second', parent_comment_id: null },
      ];
      postDetailMocks.getPostByIdMock
        .mockResolvedValueOnce({ data: mockPost })
        .mockResolvedValueOnce({ data: secondPost });
      postDetailMocks.getPostCommentsMock
        .mockResolvedValueOnce({ data: firstPostComments })
        .mockReturnValueOnce(new Promise(() => {}));
      const { rerender } = render(<PostDetailPage />);
      await waitFor(() => expect(screen.getByText('Comments (2)')).toBeDefined());

      navigateToSecondPost(rerender);

      await waitFor(() => expect(screen.getByText('Second post')).toBeDefined());
      expect(screen.getByText('Comments (0)')).toBeDefined();
    });

    it('starts the photo carousel at the first photo of the new post', async () => {
      postDetailMocks.getPostByIdMock
        .mockResolvedValueOnce({
          data: { ...mockPost, photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'] },
        })
        .mockResolvedValueOnce({
          data: { ...secondPost, photos: ['https://example.com/c.jpg', 'https://example.com/d.jpg'] },
        });
      const { rerender } = render(<PostDetailPage />);
      await waitFor(() => expect(screen.getByAltText('Post image 1')).toBeDefined());

      fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
      expect(screen.getByAltText('Post image 2').getAttribute('src')).toBe('https://example.com/b.jpg');

      navigateToSecondPost(rerender);
      await waitFor(() => expect(screen.getByText('Second post')).toBeDefined());
      expect(screen.getByAltText('Post image 1').getAttribute('src')).toBe('https://example.com/c.jpg');
    });
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

  it('opens report modal from post menu', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Report Post')).toBeDefined());

    fireEvent.click(screen.getByText('Report Post'));

    await waitFor(() => {
      expect(screen.getByText('Report post')).toBeDefined();
      expect(screen.getByText('Why are you reporting this post?')).toBeDefined();
    });
  });

  it('submits report reason and details from modal', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => expect(screen.getByText('Report Post')).toBeDefined());
    fireEvent.click(screen.getByText('Report Post'));

    await waitFor(() => expect(screen.getByText('Report post')).toBeDefined());

    fireEvent.click(screen.getByLabelText('Harassment or hate'));
    fireEvent.change(screen.getByLabelText('Additional details (optional)'), {
      target: { value: 'Contains abusive language in description.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(postDetailMocks.createReportMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reported_by: 'user-1',
          target_type: 'post',
          target_id: 'post-1',
          reason: 'Harassment',
          description: 'Contains abusive language in description.',
        })
      );
      expect(postDetailMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Thanks. Your report has been submitted for review.' })
      );
    });
  });

  // ─── Save feature tests ───────────────────────────────────

  it('renders Save action button for non-own post', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => {
      // mockPost.author_id = 'user-2', current user = 'user-1'
      expect(screen.getByText(/🏷️ Save/)).toBeDefined();
    });
  });

  it('does not render Save action button for own post', async () => {
    postDetailMocks.useAuthMock.mockReturnValue({ user: { id: 'user-2', full_name: 'Author' } });
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: { ...mockPost, author_id: 'user-2' } });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText('Looking for a roommate')).toBeDefined());
    expect(screen.queryByText(/🏷️ Save|🔖 Save/)).toBeNull();
  });

  it('shows "Save Post" option in post menu for non-owner', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      expect(screen.getByText('Save Post')).toBeDefined();
    });
  });

  it('shows "Unsave Post" in menu when post is already saved', async () => {
    postDetailMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: ['post-1'] });
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());
    fireEvent.click(screen.getByLabelText('Post options'));
    await waitFor(() => {
      expect(screen.getByText('Unsave Post')).toBeDefined();
    });
  });

  it('calls savePost when Save button is clicked', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText(/🏷️ Save/)).toBeDefined());

    fireEvent.click(screen.getByText(/🏷️ Save/));

    await waitFor(() => {
      expect(postDetailMocks.savePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1');
    });
  });

  it('shows "Post saved." toast after clicking Save', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText(/🏷️ Save/)).toBeDefined());

    fireEvent.click(screen.getByText(/🏷️ Save/));

    await waitFor(() => {
      expect(postDetailMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Post saved.' })
      );
    });
  });

  it('shows "Post unsaved." toast after clicking unsave', async () => {
    postDetailMocks.getUserSavedPostIdsMock.mockResolvedValue({ data: ['post-1'] });
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText(/🔖 Save/)).toBeDefined());

    fireEvent.click(screen.getByText(/🔖 Save/));

    await waitFor(() => {
      expect(postDetailMocks.unsavePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1');
      expect(postDetailMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Post unsaved.' })
      );
    });
  });

  it('shows error toast when save fails', async () => {
    postDetailMocks.savePostMock.mockResolvedValue({ error: new Error('network') });
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText(/🏷️ Save/)).toBeDefined());

    fireEvent.click(screen.getByText(/🏷️ Save/));

    await waitFor(() => {
      expect(postDetailMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save post.' })
      );
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

  it('opens avatar menu from a comment avatar and chats with that comment author', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.getOrCreateConversationMock.mockResolvedValue({
      data: { conversationId: 'conv-1', isNew: true },
    });
    postDetailMocks.buildSingleLevelCommentThreadsMock.mockReturnValue([
      {
        parent: {
          id: 'comment-1',
          content: 'Interested!',
          author_id: 'comment-user-1',
          created_at: '2026-02-24T11:00:00Z',
          author: { full_name: 'Comment User', profile_photo: null, trust_level: 1 },
        },
        replies: [],
      },
    ]);

    render(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Comment User').length).toBeGreaterThan(0);
    });

    const avatarOptionsButtons = screen.getAllByLabelText('User options');
    fireEvent.click(avatarOptionsButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('View Profile')).toBeDefined();
      expect(screen.getByText('Chat')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Chat'));

    await waitFor(() => {
      expect(postDetailMocks.getOrCreateConversationMock).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        'Test User',
        'comment-user-1',
        'Comment User'
      );
    });
  });

  it('renders anchored avatar dropdown near click position in post detail', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });

    render(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Looking for a roommate')).toBeDefined();
    });

    const avatarOptionsButtons = screen.getAllByLabelText('User options');
    fireEvent.click(avatarOptionsButtons[0], { clientX: 120, clientY: 180 });

    await waitFor(() => {
      expect(screen.getByText('View Profile')).toBeDefined();
      expect(screen.getByText('Chat')).toBeDefined();
    });

    const anchoredDropdown = document.querySelector('div[class*="avatarDropdownAnchored"]') as HTMLDivElement | null;
    expect(anchoredDropdown).not.toBeNull();
    expect(anchoredDropdown?.style.top).toBe('188px');
    expect(anchoredDropdown?.style.left).toBe('120px');
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

  // ─── Avatar dropdown: View Profile navigation ──────────────────────────────

  it('clicking View Profile in avatar dropdown navigates to public profile page', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText('Looking for a roommate')).toBeDefined());

    // Open avatar dropdown for post author (author_id = 'user-2', current user = 'user-1')
    const avatarOptionsButtons = screen.getAllByLabelText('User options');
    fireEvent.click(avatarOptionsButtons[0], { clientX: 120, clientY: 180 });

    await waitFor(() => expect(screen.getByText('View Profile')).toBeDefined());

    fireEvent.click(screen.getByText('View Profile'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/users/user-2');
    });
  });
});
