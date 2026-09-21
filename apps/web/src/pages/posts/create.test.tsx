import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useLocationMock: vi.fn(),
  useRouterMock: vi.fn(),
  createPostMock: vi.fn(),
  updatePostMock: vi.fn(),
  getPostByIdMock: vi.fn(),
  getTagsMock: vi.fn(),
  deletePostPhotosMock: vi.fn(),
  uploadPostPhotosMock: vi.fn(),
  validatePostPhotoFileMock: vi.fn(),
  getPostPhotoPathFromUrlMock: vi.fn(),
  notificationsShowMock: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({ notifications: { show: createMocks.notificationsShowMock } }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: createMocks.useAuthMock }));
vi.mock('../../hooks/useLocation', () => ({ useLocation: createMocks.useLocationMock }));
vi.mock('next/router', () => ({ useRouter: createMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    createPost: createMocks.createPostMock,
    updatePost: createMocks.updatePostMock,
    getPostById: createMocks.getPostByIdMock,
    getTags: createMocks.getTagsMock,
    deletePostPhotos: createMocks.deletePostPhotosMock,
    uploadPostPhotos: createMocks.uploadPostPhotosMock,
    validatePostPhotoFile: createMocks.validatePostPhotoFileMock,
    getPostPhotoPathFromUrl: createMocks.getPostPhotoPathFromUrlMock,
    TAG_EMOJI: { housing: '🏠', jobs: '💼', help: '🆘', emergency: '🚨' },
    MAX_TAGS_PER_POST: 3,
    MAX_PHOTOS_PER_POST: 4,
    MAX_POST_PHOTO_BYTES: 5242880,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

const mockTags = [
  { id: 'tag-1', slug: 'housing', name: 'Housing', requires_moderation: false },
  { id: 'tag-2', slug: 'jobs', name: 'Jobs', requires_moderation: false },
  { id: 'tag-3', slug: 'emergency', name: 'Emergency', requires_moderation: true },
];

const mockUser = {
  id: 'user-1',
  trust_level: 1,
  metro_area_id: '19100',
  zip_code: '75001',
  is_premium: false,
};

import CreatePostPage from './create.page';

describe('CreatePostPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: {},
    });
    createMocks.useAuthMock.mockReturnValue({ user: mockUser });
    createMocks.useLocationMock.mockReturnValue({
      activeLocation: {
        metro_area_id: '19100',
        metro_name: 'Dallas-Fort Worth',
        metro_state: 'TX',
      },
    });
    createMocks.getTagsMock.mockResolvedValue({ data: mockTags });
  });

  it('redirects to /login when user is not logged in', async () => {
    createMocks.useAuthMock.mockReturnValue({ user: null });
    render(<CreatePostPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('redirects to /feed when user trust_level < 1', async () => {
    createMocks.useAuthMock.mockReturnValue({ user: { ...mockUser, trust_level: 0 } });
    render(<CreatePostPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/feed'));
  });

  it('renders the create post form', async () => {
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByLabelText('Post title, required')).toBeDefined());
    expect(screen.getByLabelText('Post body, required')).toBeDefined();
    expect(screen.getByText('Create Post')).toBeDefined();
  });

  it('shows the loading-tags hint until tags arrive', async () => {
    let resolveTags: (value: unknown) => void = () => {};
    createMocks.getTagsMock.mockReturnValue(new Promise((resolve) => { resolveTags = resolve; }));
    render(<CreatePostPage />);

    expect(screen.getByText('Loading tags...')).toBeDefined();
    expect(screen.queryByText('Please select at least 1 tag')).toBeNull();

    resolveTags({ data: mockTags });
    await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());
    expect(screen.queryByText('Loading tags...')).toBeNull();
  });

  it('shows available tags after loading', async () => {
    render(<CreatePostPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /Jobs/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /Emergency/ })).toBeDefined();
    });
  });

  it('Post button is disabled when form is incomplete', async () => {
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByText('Post')).toBeDefined());
    const postBtn = screen.getByRole('button', { name: 'Post' });
    expect(postBtn.hasAttribute('disabled')).toBe(true);
  });

  it('shows hint when title is too short', async () => {
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByLabelText('Post title, required')).toBeDefined());
    fireEvent.change(screen.getByLabelText('Post title, required'), { target: { value: 'hi' } });
    await waitFor(() => {
      expect(screen.getAllByText('Title must be at least 5 characters').length).toBeGreaterThan(0);
    });
  });

  it('shows hint when body is too short', async () => {
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByLabelText('Post body, required')).toBeDefined());
    fireEvent.change(screen.getByLabelText('Post body, required'), { target: { value: 'short' } });
    await waitFor(() => {
      expect(screen.getByText('Body must be at least 10 characters')).toBeDefined();
    });
  });

  it('shows emergency warning when emergency tag is selected', async () => {
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Emergency/ })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: /Emergency/ }));
    await waitFor(() => {
      expect(screen.getByText(/Emergency posts require moderator approval/)).toBeDefined();
    });
  });

  it('submits the post and redirects to /feed on success', async () => {
    createMocks.createPostMock.mockResolvedValue({ data: { id: 'post-new' }, error: null });
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());

    fireEvent.change(screen.getByLabelText('Post title, required'), {
      target: { value: 'Valid post title here' },
    });
    fireEvent.change(screen.getByLabelText('Post body, required'), {
      target: { value: 'This is a valid body with enough characters.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Housing/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Post' }).hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => {
      expect(createMocks.createPostMock).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/feed');
    });
  });

  it('shows a submitted-for-review notice when the post needs moderation', async () => {
    createMocks.createPostMock.mockResolvedValue({ data: { id: 'post-new', status: 'pending' }, error: null });
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Emergency/ })).toBeDefined());

    fireEvent.change(screen.getByLabelText('Post title, required'), {
      target: { value: 'Flooding near the temple' },
    });
    fireEvent.change(screen.getByLabelText('Post body, required'), {
      target: { value: 'Water is rising fast, need volunteers with trucks.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Emergency/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Post' }).hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => {
      expect(createMocks.createPostMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ requiresModeration: true })
      );
      expect(createMocks.notificationsShowMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/review/i) })
      );
      expect(mockPush).toHaveBeenCalledWith('/feed');
    });
  });

  it('does not show the review notice for a regular post', async () => {
    createMocks.createPostMock.mockResolvedValue({ data: { id: 'post-new' }, error: null });
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());

    fireEvent.change(screen.getByLabelText('Post title, required'), {
      target: { value: 'Valid post title here' },
    });
    fireEvent.change(screen.getByLabelText('Post body, required'), {
      target: { value: 'This is a valid body with enough characters.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Housing/ }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Post' }).hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/feed'));
    expect(createMocks.notificationsShowMock).not.toHaveBeenCalled();
  });

  it('shows error when post creation fails', async () => {
    createMocks.createPostMock.mockResolvedValue({ error: new Error('Server error'), data: null });
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());

    fireEvent.change(screen.getByLabelText('Post title, required'), {
      target: { value: 'Valid post title here' },
    });
    fireEvent.change(screen.getByLabelText('Post body, required'), {
      target: { value: 'This is a valid body with enough characters.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Housing/ }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Post' }).hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeDefined();
    });
  });

  it('shows location the post will be published to', async () => {
    render(<CreatePostPage />);
    await waitFor(() => {
      expect(screen.getByText(/Posting to:/)).toBeDefined();
      expect(screen.getByText(/Dallas-Fort Worth/)).toBeDefined();
    });
  });

  it('shows Global Post toggle for premium users', async () => {
    createMocks.useAuthMock.mockReturnValue({ user: { ...mockUser, is_premium: true } });
    render(<CreatePostPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Post globally toggle')).toBeDefined();
    });
  });

  it('does not show Global Post toggle for non-premium users', async () => {
    render(<CreatePostPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());
    expect(screen.queryByLabelText('Post globally toggle')).toBeNull();
  });

  it('shows edit mode header when editing an existing post', async () => {
    createMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: { edit: 'post-existing' },
    });
    createMocks.getPostByIdMock.mockResolvedValue({
      data: {
        id: 'post-existing',
        author_id: 'user-1',
        title: 'Existing post',
        description: 'Existing body',
        tags: [],
        is_global: false,
        photos: [],
      },
    });
    render(<CreatePostPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Post')).toBeDefined();
      expect(screen.getByText('Save')).toBeDefined();
    });
  });

  it('shows a loading hint and then fills the form with the post being edited', async () => {
    createMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: { edit: 'post-existing' },
    });
    let resolvePost: (value: unknown) => void = () => {};
    createMocks.getPostByIdMock.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));
    render(<CreatePostPage />);

    await waitFor(() => expect(screen.getByText('Loading post...')).toBeDefined());
    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);

    resolvePost({
      data: {
        id: 'post-existing',
        author_id: 'user-1',
        title: 'Existing post',
        description: 'Existing body text',
        tags: [mockTags[0]],
        is_global: false,
        photos: [],
      },
    });

    await waitFor(() => {
      expect((screen.getByLabelText('Post title, required') as HTMLInputElement).value).toBe('Existing post');
    });
    expect(screen.queryByText('Loading post...')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false);
    expect(createMocks.getPostByIdMock).toHaveBeenCalledTimes(1);
    expect(createMocks.getPostByIdMock).toHaveBeenCalledWith(expect.anything(), 'post-existing');
  });

  it('refuses to edit a post owned by someone else', async () => {
    createMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: { edit: 'post-existing' },
    });
    createMocks.getPostByIdMock.mockResolvedValue({
      data: {
        id: 'post-existing',
        author_id: 'someone-else',
        title: 'Their post',
        description: 'Their body text',
        tags: [],
        is_global: false,
        photos: [],
      },
    });
    render(<CreatePostPage />);

    await waitFor(() => expect(screen.getByText('You can only edit your own posts.')).toBeDefined());
    expect(screen.queryByText('Loading post...')).toBeNull();
    expect((screen.getByLabelText('Post title, required') as HTMLInputElement).value).toBe('');
  });

  describe('leaving the page', () => {
    it('leaves straight away when nothing has been typed', async () => {
      render(<CreatePostPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/feed'));
      expect(screen.queryByText('Discard this post?')).toBeNull();
    });

    it('asks before discarding a started post, and stays put when dismissed', async () => {
      render(<CreatePostPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());
      fireEvent.change(screen.getByLabelText('Post title, required'), {
        target: { value: 'Half-written title' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.getByText('Discard this post?')).toBeDefined());
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('leaves once discarding is confirmed', async () => {
      render(<CreatePostPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());
      fireEvent.change(screen.getByLabelText('Post title, required'), {
        target: { value: 'Half-written title' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.getByText('Discard this post?')).toBeDefined());

      fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/feed'));
    });
  });

  describe('tags', () => {
    it('reports which tags are chosen', async () => {
      render(<CreatePostPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());

      expect(screen.getByRole('button', { name: /Housing/ }).getAttribute('aria-pressed')).toBe('false');

      fireEvent.click(screen.getByRole('button', { name: /Housing/ }));

      expect(screen.getByRole('button', { name: /Housing/ }).getAttribute('aria-pressed')).toBe('true');
    });

    it('stops offering more tags once the cap is reached', async () => {
      render(<CreatePostPage />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Housing/ })).toBeDefined());

      // MAX_TAGS_PER_POST is mocked to 3 and the fixture has exactly 3 tags,
      // so choosing two must leave the third available and choosing all three
      // must leave none to add.
      fireEvent.click(screen.getByRole('button', { name: /Housing/ }));
      fireEvent.click(screen.getByRole('button', { name: /Jobs/ }));
      expect(screen.getByRole('button', { name: /Emergency/ }).hasAttribute('disabled')).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: /Emergency/ }));
      expect(screen.getByRole('button', { name: /Housing/ }).hasAttribute('disabled')).toBe(false);
    });
  });

  describe('photos', () => {
    it('offers the photo uploader with the per-post limit', async () => {
      render(<CreatePostPage />);

      await waitFor(() => expect(screen.getByRole('group', { name: 'Photos' })).toBeDefined());
      expect(screen.getByText('0/4 photos')).toBeDefined();
    });

    it('shows the photos of the post being edited, in order', async () => {
      createMocks.useRouterMock.mockReturnValue({
        push: mockPush,
        replace: mockReplace,
        query: { edit: 'post-existing' },
      });
      createMocks.getPostByIdMock.mockResolvedValue({
        data: {
          id: 'post-existing',
          author_id: 'user-1',
          title: 'Existing post',
          description: 'Existing body text',
          tags: [mockTags[0]],
          is_global: false,
          photos: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
        },
      });
      render(<CreatePostPage />);

      await waitFor(() => expect(screen.getByText('2/4 photos')).toBeDefined());
      expect(screen.getByRole('button', { name: 'Remove photo 1' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Remove photo 2' })).toBeDefined();
    });

    it('saves the photos of an edited post in the order they are shown', async () => {
      createMocks.useRouterMock.mockReturnValue({
        push: mockPush,
        replace: mockReplace,
        query: { edit: 'post-existing' },
      });
      createMocks.getPostByIdMock.mockResolvedValue({
        data: {
          id: 'post-existing',
          author_id: 'user-1',
          title: 'Existing post',
          description: 'Existing body text',
          tags: [mockTags[0]],
          is_global: false,
          photos: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
        },
      });
      createMocks.updatePostMock.mockResolvedValue({ data: { id: 'post-existing' } });
      createMocks.deletePostPhotosMock.mockResolvedValue({});
      render(<CreatePostPage />);

      await waitFor(() => expect(screen.getByText('2/4 photos')).toBeDefined());
      fireEvent.click(screen.getByRole('button', { name: 'Move photo 2 left' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(createMocks.updatePostMock).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            photos: ['https://cdn.example.com/b.jpg', 'https://cdn.example.com/a.jpg'],
          })
        )
      );
    });

    it('deletes a photo the member removed, once the post has saved', async () => {
      createMocks.useRouterMock.mockReturnValue({
        push: mockPush,
        replace: mockReplace,
        query: { edit: 'post-existing' },
      });
      createMocks.getPostByIdMock.mockResolvedValue({
        data: {
          id: 'post-existing',
          author_id: 'user-1',
          title: 'Existing post',
          description: 'Existing body text',
          tags: [mockTags[0]],
          is_global: false,
          photos: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
        },
      });
      createMocks.updatePostMock.mockResolvedValue({ data: { id: 'post-existing' } });
      createMocks.deletePostPhotosMock.mockResolvedValue({});
      createMocks.getPostPhotoPathFromUrlMock.mockImplementation((url: string) => `user-1/${url.slice(-5)}`);
      render(<CreatePostPage />);

      await waitFor(() => expect(screen.getByText('2/4 photos')).toBeDefined());
      fireEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(createMocks.deletePostPhotosMock).toHaveBeenCalledWith(expect.anything(), ['user-1/b.jpg'])
      );
    });
  });
});
