import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createComment,
  deleteComment,
  getPostComments,
  getUserLikedPostIds,
  getUserSavedPostIds,
  likePost,
  savePost,
  unlikePost,
  unsavePost,
} from './interactions';

describe('interactions api', () => {
  it('returns auth error when liking without user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await likePost(supabase, 'post-1');

    expect(result.error?.message).toContain('Not authenticated');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('maps liked rows to post ID list', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockResolvedValue({
      data: [{ post_id: 'p1' }, { post_id: 'p2' }],
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getUserLikedPostIds(supabase, 'user-1');

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(['p1', 'p2']);
  });

  it('creates trimmed comment payload and supports unlike', async () => {
    const postCommentsBuilder = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };

    postCommentsBuilder.insert.mockReturnValue(postCommentsBuilder);
    postCommentsBuilder.select.mockReturnValue(postCommentsBuilder);
    postCommentsBuilder.single.mockResolvedValue({
      data: { id: 'c1', content: 'hello' },
      error: null,
    });

    const postLikesDeleteBuilder = {
      eq: vi.fn(),
    };

    postLikesDeleteBuilder.eq
      .mockReturnValueOnce(postLikesDeleteBuilder)
      .mockResolvedValueOnce({ error: null });

    const postLikesBuilder = {
      delete: vi.fn().mockReturnValue(postLikesDeleteBuilder),
    };

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-2' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'post_comments') return postCommentsBuilder;
        if (table === 'post_likes') return postLikesBuilder;
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const commentResult = await createComment(supabase, 'post-9', '  hello  ');
    const unlikeResult = await unlikePost(supabase, 'post-9');

    expect(commentResult.error).toBeUndefined();
    expect(postCommentsBuilder.insert).toHaveBeenCalledWith({
      post_id: 'post-9',
      author_id: 'user-2',
      content: 'hello',
      parent_comment_id: null,
    });
    expect(unlikeResult.error).toBeUndefined();
  });

  it('deletes comment for authenticated author', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-3' } } }),
      },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown as SupabaseClient;

    const result = await deleteComment(supabase, 'comment-1');

    expect(result.error).toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith('soft_delete_own_comment', {
      p_comment_id: 'comment-1',
    });
  });

  it('returns auth error when saving without user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await savePost(supabase, 'post-1');

    expect(result.error?.message).toContain('Not authenticated');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('calls DELETE with correct post_id and user_id on unsave', async () => {
    const deleteBuilder = {
      eq: vi.fn(),
    };

    deleteBuilder.eq
      .mockReturnValueOnce(deleteBuilder)
      .mockResolvedValueOnce({ error: null });

    const savedPostsBuilder = {
      delete: vi.fn().mockReturnValue(deleteBuilder),
    };

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-5' } } }),
      },
      from: vi.fn().mockReturnValue(savedPostsBuilder),
    } as unknown as SupabaseClient;

    const result = await unsavePost(supabase, 'post-5');

    expect(result.error).toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('saved_posts');
    expect(deleteBuilder.eq).toHaveBeenCalledWith('post_id', 'post-5');
    expect(deleteBuilder.eq).toHaveBeenCalledWith('user_id', 'user-5');
  });

  it('maps saved_posts rows to post ID string array', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockResolvedValue({
      data: [{ post_id: 'p3' }, { post_id: 'p4' }],
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getUserSavedPostIds(supabase, 'user-6');

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(['p3', 'p4']);
    expect(supabase.from).toHaveBeenCalledWith('saved_posts');
  });

  it('returns permission error when delete updates no rows', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-4' } } }),
      },
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown as SupabaseClient;

    const result = await deleteComment(supabase, 'comment-2');

    expect(result.error?.message).toContain('do not have permission');
  });

  // ─── likePost success path ───────────────────────────────

  it('inserts into post_likes on successful like', async () => {
    const insertBuilder = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-7' } } }),
      },
      from: vi.fn().mockReturnValue(insertBuilder),
    } as unknown as SupabaseClient;

    const result = await likePost(supabase, 'post-7');

    expect(result.error).toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('post_likes');
    expect(insertBuilder.insert).toHaveBeenCalledWith({ post_id: 'post-7', user_id: 'user-7' });
  });

  // ─── unlikePost auth error ───────────────────────────────

  it('returns auth error when unliking without user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await unlikePost(supabase, 'post-8');

    expect(result.error?.message).toContain('Not authenticated');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  // ─── getUserLikedPostIds error path ─────────────────────

  it('returns error when getUserLikedPostIds db call fails', async () => {
    const query = { select: vi.fn(), eq: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockResolvedValue({ data: null, error: new Error('DB down') });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getUserLikedPostIds(supabase, 'user-8');

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe('DB down');
  });

  // ─── savePost success path ───────────────────────────────

  it('inserts into saved_posts on successful save', async () => {
    const insertBuilder = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-9' } } }),
      },
      from: vi.fn().mockReturnValue(insertBuilder),
    } as unknown as SupabaseClient;

    const result = await savePost(supabase, 'post-9');

    expect(result.error).toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith('saved_posts');
    expect(insertBuilder.insert).toHaveBeenCalledWith({ post_id: 'post-9', user_id: 'user-9' });
  });

  it('returns wrapped error when savePost db insert fails', async () => {
    const insertBuilder = {
      insert: vi.fn().mockResolvedValue({ error: new Error('unique violation') }),
    };
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-10' } } }),
      },
      from: vi.fn().mockReturnValue(insertBuilder),
    } as unknown as SupabaseClient;

    const result = await savePost(supabase, 'post-10');

    expect(result.error?.message).toBe('unique violation');
  });

  // ─── unsavePost auth error ───────────────────────────────

  it('returns auth error when unsaving without user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await unsavePost(supabase, 'post-11');

    expect(result.error?.message).toContain('Not authenticated');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns wrapped error when unsavePost db call fails', async () => {
    const deleteBuilder = { eq: vi.fn() };
    deleteBuilder.eq
      .mockReturnValueOnce(deleteBuilder)
      .mockResolvedValueOnce({ error: new Error('RLS denied') });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-12' } } }),
      },
      from: vi.fn().mockReturnValue({ delete: vi.fn().mockReturnValue(deleteBuilder) }),
    } as unknown as SupabaseClient;

    const result = await unsavePost(supabase, 'post-12');

    expect(result.error?.message).toBe('RLS denied');
  });

  // ─── getUserSavedPostIds error path ──────────────────────

  it('returns error when getUserSavedPostIds db call fails', async () => {
    const query = { select: vi.fn(), eq: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockResolvedValue({ data: null, error: new Error('timeout') });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getUserSavedPostIds(supabase, 'user-13');

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe('timeout');
  });

  // ─── getPostComments success path ────────────────────────

  it('returns flat comment list ordered by created_at', async () => {
    const mockComments = [
      { id: 'c1', content: 'first', is_deleted: false, author: { id: 'u1', full_name: 'Alice' } },
      { id: 'c2', content: 'second', is_deleted: false, author: { id: 'u2', full_name: 'Bob' } },
    ];

    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({ data: mockComments, error: null });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getPostComments(supabase, 'post-99');

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].id).toBe('c1');
    expect(supabase.from).toHaveBeenCalledWith('post_comments');
  });

  it('returns error when getPostComments db call fails', async () => {
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({ data: null, error: new Error('network error') });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getPostComments(supabase, 'post-error');

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe('network error');
  });

  // ─── createComment auth error ────────────────────────────

  it('returns auth error when creating comment without user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await createComment(supabase, 'post-14', 'hello');

    expect(result.error?.message).toContain('Not authenticated');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
