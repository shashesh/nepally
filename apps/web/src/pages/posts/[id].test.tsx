import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode };
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
  // Forwards the ref and every other prop, so Mantine can render a Menu.Item
  // as a link and still set role, handlers and classes on it.
  default: React.forwardRef<HTMLAnchorElement, MockLinkProps>(function MockLink({ href, children, ...rest }, ref) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
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
    expect(screen.getByText('Loading post…')).toBeDefined();
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
      expect(screen.getByText('Loading post…')).toBeDefined();

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

      fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
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
      expect(screen.getByText('Local')).toBeDefined();
    });
  });

  it('renders Global badge for global post', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: { ...mockPost, is_global: true } });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Global')).toBeDefined();
    });
  });

  it('shows tags', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Housing')).toBeDefined();
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
      expect(screen.getByText('No comments yet')).toBeDefined();
      expect(screen.getByText('Be the first to comment!')).toBeDefined();
    });
  });

  describe('deleting your own post', () => {
    async function openDeleteDialog() {
      postDetailMocks.useAuthMock.mockReturnValue({ user: { id: 'user-2', full_name: 'Bikal' } });
      postDetailMocks.getPostByIdMock.mockResolvedValue({ data: { ...mockPost, author_id: 'user-2' } });
      render(<PostDetailPage />);
      await waitFor(() => expect(screen.getByLabelText('Post options')).toBeDefined());

      fireEvent.click(screen.getByLabelText('Post options'));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete Post' }));
      await screen.findByText('Delete post');
    }

    it('asks first, and does nothing when dismissed', async () => {
      await openDeleteDialog();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(postDetailMocks.deletePostMock).not.toHaveBeenCalled());
      expect(mockPush).not.toHaveBeenCalledWith('/feed');
    });

    it('deletes and returns to the feed once confirmed', async () => {
      postDetailMocks.deletePostMock.mockResolvedValue({});
      await openDeleteDialog();

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(postDetailMocks.deletePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1'));
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/feed'));
    });

    it('stays on the post and says so when the delete fails', async () => {
      postDetailMocks.deletePostMock.mockResolvedValue({ error: new Error('nope') });
      await openDeleteDialog();

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() =>
        expect(postDetailMocks.notificationsShowMock).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Failed to delete post. Please try again.' })
        )
      );
      expect(mockPush).not.toHaveBeenCalledWith('/feed');
    });
  });

  it('keeps reply mode when the comment author is missing', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.buildSingleLevelCommentThreadsMock.mockReturnValue([
      {
        parent: {
          id: 'comment-1',
          content: 'Interested!',
          author_id: 'deleted-user',
          created_at: '2026-02-24T11:00:00Z',
          author: null,
        },
        replies: [],
      },
    ]);

    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText('Interested!')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    // Without a fallback name the banner disappears while the reply id is still set.
    expect(await screen.findByText('Replying to Anonymous')).toBeDefined();
    expect(screen.getByLabelText('Write a reply')).toBeDefined();
  });

  it('keeps the typed comment and reports when the create fails', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.createCommentMock.mockResolvedValue({ error: new Error('rejected') });

    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByLabelText('Write a comment')).toBeDefined());

    const field = screen.getByLabelText('Write a comment') as HTMLInputElement;
    fireEvent.change(field, { target: { value: 'Great post!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() =>
      expect(postDetailMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Could not post your comment. Please try again.' })
      )
    );
    expect(field.value).toBe('Great post!');
  });

  it('does not offer a member menu when the post author row is missing', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: { ...mockPost, author: null } });

    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText('Looking for a roommate')).toBeDefined());

    // There is no member to open: the profile link would point at nothing.
    expect(screen.queryByRole('button', { name: /^Options for/ })).toBeNull();
    expect(screen.getAllByText('Anonymous').length).toBeGreaterThan(0);
  });

  it('keeps a comment posted while the comments were still loading', async () => {
    let settleComments: (result: unknown) => void = () => {};
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.getPostCommentsMock.mockReturnValue(
      new Promise((resolve) => {
        settleComments = resolve;
      })
    );
    postDetailMocks.createCommentMock.mockResolvedValue({
      data: {
        id: 'comment-live',
        content: 'Posted mid-flight',
        author_id: 'user-1',
        post_id: 'post-1',
        parent_comment_id: null,
        created_at: '2026-02-24T12:00:00Z',
      },
    });
    postDetailMocks.buildSingleLevelCommentThreadsMock.mockImplementation((comments: unknown[]) =>
      comments.map((comment) => ({ parent: comment, replies: [] }))
    );

    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByLabelText('Write a comment')).toBeDefined());

    fireEvent.change(screen.getByLabelText('Write a comment'), { target: { value: 'Posted mid-flight' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => expect(screen.getByText('Posted mid-flight')).toBeDefined());

    // The load that was already running now fails; it must not hide the comment.
    await act(async () => {
      settleComments({ error: new Error('late failure') });
    });

    expect(screen.getByText('Posted mid-flight')).toBeDefined();
    expect(screen.queryByText("Couldn't load comments")).toBeNull();
  });

  it('puts the like back when the request fails', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.likePostMock.mockResolvedValue({ error: new Error('rejected') });

    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: '5 likes' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: '5 likes' }));

    await waitFor(() =>
      expect(postDetailMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Could not like this post.' })
      )
    );
    expect(screen.getByRole('button', { name: '5 likes' })).toBeDefined();
  });

  it('puts the save back when the request fails', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.savePostMock.mockResolvedValue({ error: new Error('rejected') });

    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save post' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Save post' }));

    await waitFor(() =>
      expect(postDetailMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save post.' })
      )
    );
    // Still offering Save, not Unsave, because the write did not land.
    expect(screen.getByRole('button', { name: 'Save post' })).toBeDefined();
  });

  it('ignores a second like while the first is still in flight', async () => {
    let settleLike: (result: unknown) => void = () => {};
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.likePostMock.mockReturnValue(
      new Promise((resolve) => {
        settleLike = resolve;
      })
    );

    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: '5 likes' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: '5 likes' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '6 likes' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: '6 likes' }));

    expect(postDetailMocks.likePostMock).toHaveBeenCalledTimes(1);
    expect(postDetailMocks.unlikePostMock).not.toHaveBeenCalled();

    // The one rollback that can happen lands on the count it started from.
    await act(async () => {
      settleLike({ error: new Error('rejected') });
    });
    expect(screen.getByRole('button', { name: '5 likes' })).toBeDefined();
  });

  it('ignores a second save while the first is still in flight', async () => {
    let settleSave: (result: unknown) => void = () => {};
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.savePostMock.mockReturnValue(
      new Promise((resolve) => {
        settleSave = resolve;
      })
    );

    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save post' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Save post' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unsave post' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Unsave post' }));

    expect(postDetailMocks.savePostMock).toHaveBeenCalledTimes(1);
    expect(postDetailMocks.unsavePostMock).not.toHaveBeenCalled();

    await act(async () => {
      settleSave({ error: new Error('rejected') });
    });
    expect(screen.getByRole('button', { name: 'Save post' })).toBeDefined();
  });

  describe('when comments cannot be loaded', () => {
    it('shows an error instead of the empty state, and can retry', async () => {
      postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
      postDetailMocks.getPostCommentsMock.mockResolvedValueOnce({ error: new Error('offline') });

      render(<PostDetailPage />);

      await waitFor(() => expect(screen.getByText("Couldn't load comments")).toBeDefined());
      expect(screen.queryByText('No comments yet')).toBeNull();

      postDetailMocks.getPostCommentsMock.mockResolvedValue({ data: [] });
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      await waitFor(() => expect(screen.getByText('No comments yet')).toBeDefined());
    });

    it('shows a comment posted after the failure, without needing Retry', async () => {
      postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
      postDetailMocks.getPostCommentsMock.mockResolvedValue({ error: new Error('offline') });
      const created = {
        id: 'comment-9',
        content: 'Posted anyway',
        author_id: 'user-1',
        post_id: 'post-1',
        parent_comment_id: null,
        created_at: '2026-02-24T12:00:00Z',
      };
      postDetailMocks.createCommentMock.mockResolvedValue({ data: created });
      postDetailMocks.buildSingleLevelCommentThreadsMock.mockImplementation((comments: unknown[]) =>
        comments.map((comment) => ({ parent: comment, replies: [] }))
      );

      render(<PostDetailPage />);
      await waitFor(() => expect(screen.getByText("Couldn't load comments")).toBeDefined());

      fireEvent.change(screen.getByLabelText('Write a comment'), { target: { value: 'Posted anyway' } });
      fireEvent.click(screen.getByRole('button', { name: 'Post' }));

      await waitFor(() => expect(screen.getByText('Posted anyway')).toBeDefined());
      expect(screen.queryByText("Couldn't load comments")).toBeNull();
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
      expect(screen.getByRole('button', { name: 'Save post' })).toBeDefined();
    });
  });

  it('does not render Save action button for own post', async () => {
    postDetailMocks.useAuthMock.mockReturnValue({ user: { id: 'user-2', full_name: 'Author' } });
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: { ...mockPost, author_id: 'user-2' } });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText('Looking for a roommate')).toBeDefined());
    expect(screen.queryByRole('button', { name: /save post/i })).toBeNull();
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save post' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Save post' }));

    await waitFor(() => {
      expect(postDetailMocks.savePostMock).toHaveBeenCalledWith(expect.anything(), 'post-1');
    });
  });

  it('shows "Post saved." toast after clicking Save', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save post' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Save post' }));

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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Unsave post' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Unsave post' }));

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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save post' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Save post' }));

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
    await waitFor(() => expect(screen.getByLabelText('Write a comment')).toBeDefined());
    fireEvent.change(screen.getByLabelText('Write a comment'), { target: { value: 'Great post!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Options for Comment User' }));

    expect(await screen.findByRole('menuitem', { name: 'View profile' })).toBeDefined();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Chat' }));

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

  it('opens the author menu from the avatar', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });

    render(<PostDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Looking for a roommate')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikal Shrestha' }));

    expect(await screen.findByRole('menuitem', { name: 'View profile' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Chat' })).toBeDefined();
  });

  it('optimistically toggles like', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    postDetailMocks.likePostMock.mockResolvedValue({});
    render(<PostDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '5 likes' })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: '5 likes' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '6 likes' })).toBeDefined();
    });
  });

  // ─── Avatar dropdown: View Profile navigation ──────────────────────────────

  it('View profile links to the public profile', async () => {
    postDetailMocks.getPostByIdMock.mockResolvedValue({ data: mockPost });
    render(<PostDetailPage />);
    await waitFor(() => expect(screen.getByText('Looking for a roommate')).toBeDefined());

    // The post author is user-2; the signed-in member is user-1.
    fireEvent.click(screen.getByRole('button', { name: 'Options for Bikal Shrestha' }));

    const link = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(link.getAttribute('href')).toBe('/users/user-2');
  });
});
